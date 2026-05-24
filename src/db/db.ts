import Dexie, { type Table } from 'dexie';
import { newCard } from '../engine/scheduler';
import type { Card, Problem, Review, Settings } from '../engine/types';
import seedProblems from '../data/problems.json';

class DSADB extends Dexie {
  problems!: Table<Problem, number>;
  cards!: Table<Card, number>;
  reviews!: Table<Review, number>;
  settings!: Table<Settings, number>;

  constructor() {
    super('dsa_coach');
    this.version(1).stores({
      problems: '&id, topic, order_index, difficulty',
      cards: '&problem_id, status, due',
      reviews: '++id, problem_id, date',
      settings: '&id',
    });
  }
}

export const db = new DSADB();

/**
 * Idempotent: upsert problems.json on every boot (titles/topics/difficulties
 * stay current if the catalog file changes), ensure a `card` row exists for
 * every problem, and write the default settings row. Cards/reviews for
 * problems removed from the catalog are dropped to keep the data tidy.
 */
export async function ensureSeeded(): Promise<void> {
  const fresh = seedProblems as Problem[];
  const freshIds = new Set(fresh.map((p) => p.id));

  await db.problems.bulkPut(fresh);

  // Drop catalog rows that no longer exist in problems.json
  const existingProblemIds = (await db.problems.toCollection().primaryKeys()) as number[];
  const orphanProblems = existingProblemIds.filter((id) => !freshIds.has(id));
  if (orphanProblems.length > 0) await db.problems.bulkDelete(orphanProblems);

  // Ensure a card exists for every problem
  const existingCardIds = new Set(
    (await db.cards.toCollection().primaryKeys()) as number[],
  );
  const missingCards = fresh
    .filter((p) => !existingCardIds.has(p.id))
    .map((p) => newCard(p.id));
  if (missingCards.length > 0) await db.cards.bulkAdd(missingCards);

  // Drop orphan cards (and their reviews) for removed problems
  const orphanCards = [...existingCardIds].filter((id) => !freshIds.has(id));
  if (orphanCards.length > 0) {
    await db.cards.bulkDelete(orphanCards);
    await db.reviews.where('problem_id').anyOf(orphanCards).delete();
  }

  const s = await db.settings.get(1);
  if (!s) {
    await db.settings.put({ id: 1, target: 5, ceiling: 7 });
  }
}

export async function exportAll(): Promise<string> {
  const [problems, cards, reviews, settings] = await Promise.all([
    db.problems.toArray(),
    db.cards.toArray(),
    db.reviews.toArray(),
    db.settings.toArray(),
  ]);
  return JSON.stringify(
    {
      version: 1,
      exported_at: new Date().toISOString(),
      problems,
      cards,
      reviews,
      settings,
    },
    null,
    2,
  );
}

export async function importAll(json: string): Promise<void> {
  const data = JSON.parse(json);
  await db.transaction('rw', db.problems, db.cards, db.reviews, db.settings, async () => {
    await Promise.all([db.problems.clear(), db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
    if (Array.isArray(data.problems)) await db.problems.bulkAdd(data.problems);
    if (Array.isArray(data.cards)) await db.cards.bulkAdd(data.cards);
    if (Array.isArray(data.reviews)) await db.reviews.bulkAdd(data.reviews);
    if (Array.isArray(data.settings)) await db.settings.bulkAdd(data.settings);
  });
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', db.problems, db.cards, db.reviews, db.settings, async () => {
    await Promise.all([db.problems.clear(), db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
  });
  await ensureSeeded();
}
