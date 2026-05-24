import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo } from 'react';
import { db } from '../db/db';
import { todayKey } from '../engine/dates';
import {
  buildTodaysQueue,
  projectedLoadFromCards,
  rate as engineRate,
  resolveMaster as engineResolveMaster,
  type ScheduleSettings,
} from '../engine/scheduler';
import type { Card, Problem, Rating, Review, Settings } from '../engine/types';

export function useProblems(): Problem[] | undefined {
  return useLiveQuery(() => db.problems.orderBy('order_index').toArray(), []);
}

export function useCards(): Card[] | undefined {
  return useLiveQuery(() => db.cards.toArray(), []);
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(() => db.settings.get(1), []);
}

export function useReviews(): Review[] | undefined {
  return useLiveQuery(() => db.reviews.orderBy('date').toArray(), []);
}

export interface QueueItem {
  card: Card;
  problem: Problem;
}

export interface BuiltQueue {
  revisions: QueueItem[];
  fresh: QueueItem[];
  items: QueueItem[];
  /** Number of problems originally served at the start of today (locked). */
  servedCount: number;
}

const SERVED_KEY_PREFIX = 'dsa-served-';

function loadServed(today: string): number[] | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(`${SERVED_KEY_PREFIX}${today}`);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as number[];
  } catch {
    return null;
  }
}

function saveServed(today: string, ids: number[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${SERVED_KEY_PREFIX}${today}`, JSON.stringify(ids));
}

/**
 * Today's queue is computed on first build of the day and then locked to a
 * fixed set of problem IDs via localStorage. Subsequent calls during the day
 * show only those served items minus the ones the user has already rated
 * today — the queue does NOT silently refill with new problems as you go.
 * Use the Bonus Round to deliberately pull more.
 */
export function useTodayQueue(): BuiltQueue | undefined {
  const cards = useCards();
  const problems = useProblems();
  const settings = useSettings();
  const reviews = useReviews();
  const today = todayKey();

  return useMemo(() => {
    if (!cards || !problems || !settings) return undefined;

    const byId = new Map(problems.map((p) => [p.id, p]));
    const cardById = new Map(cards.map((c) => [c.problem_id, c]));
    const getOrder = (id: number) =>
      byId.get(id)?.order_index ?? Number.MAX_SAFE_INTEGER;
    const reviewedTodayIds = new Set(
      (reviews ?? []).filter((r) => r.date === today).map((r) => r.problem_id),
    );

    // Lock the served set on first build of the day.
    let servedIds = loadServed(today);
    if (servedIds === null) {
      const built = buildTodaysQueue(cards, today, getOrder, settings);
      servedIds = built.items.map((c) => c.problem_id);
      saveServed(today, servedIds);
    }

    const items: QueueItem[] = [];
    const revisions: QueueItem[] = [];
    const fresh: QueueItem[] = [];
    for (const id of servedIds) {
      if (reviewedTodayIds.has(id)) continue; // already rated today
      const card = cardById.get(id);
      const problem = byId.get(id);
      if (!card || !problem || card.status === 'mastered') continue;
      const item: QueueItem = { card, problem };
      items.push(item);
      if (card.total_reviews === 0) fresh.push(item);
      else revisions.push(item);
    }

    return { items, revisions, fresh, servedCount: servedIds.length };
  }, [cards, problems, settings, reviews, today]);
}

interface RateOpts {
  card: Card;
  rating: Rating;
  time_taken_sec?: number;
  notes?: string;
}

/** Apply a rating: updates the card, writes a review (with snapshot for undo). */
export async function applyRating({ card, rating, time_taken_sec, notes }: RateOpts): Promise<Card> {
  const today = todayKey();
  const settings = (await db.settings.get(1)) ?? { id: 1 as const, target: 5, ceiling: 7 };
  const allCards = await db.cards.toArray();

  // Build projected load EXCLUDING this card so its own current due doesn't bias the smoothing.
  const others = allCards.filter((c) => c.problem_id !== card.problem_id);
  const projected = projectedLoadFromCards(others);

  // If this is a brand-new card being served from the queue, mark first_solved_at.
  const updated = engineRate(card, rating, today, projected, settings);

  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.put(updated);
    await db.reviews.add({
      problem_id: card.problem_id,
      date: today,
      rating,
      time_taken_sec,
      notes,
      prev_card: card,
    });
  });

  return updated;
}

export async function resolveMasterPrompt(card: Card, keepGoing: boolean): Promise<Card> {
  const today = todayKey();
  const updated = engineResolveMaster(card, keepGoing, today);
  await db.cards.put(updated);
  return updated;
}

/** Undo the most recent rating: restore the prev_card snapshot, delete the review row. */
export async function undoLastRating(): Promise<Review | null> {
  const reviews = await db.reviews.orderBy('id').reverse().limit(1).toArray();
  if (reviews.length === 0) return null;
  const last = reviews[0];
  if (!last.prev_card) {
    await db.reviews.delete(last.id!);
    return last;
  }
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.put(last.prev_card!);
    await db.reviews.delete(last.id!);
  });
  return last;
}

export async function updateNotes(problemId: number, notes: string): Promise<void> {
  // Notes live on the most recent review. If none exists, create a notes-only stub
  // dated today so the user can still capture insight on unsolved problems.
  const last = await db.reviews
    .where('problem_id')
    .equals(problemId)
    .reverse()
    .sortBy('id');
  if (last.length > 0) {
    await db.reviews.update(last[0].id!, { notes });
  } else {
    await db.reviews.add({ problem_id: problemId, date: todayKey(), rating: 'shaky', notes });
  }
}

export async function saveSettings(next: Omit<Settings, 'id'>): Promise<void> {
  await db.settings.put({ id: 1, ...next });
}

/**
 * Strict streak: consecutive days with ≥1 review, ending today. If today
 * has no review yet, returns 0 — opening the app without solving anything
 * does not count toward the streak.
 */
export function useStreak(reviews: Review[] | undefined): number {
  return useMemo(() => {
    if (!reviews || reviews.length === 0) return 0;
    const days = new Set(reviews.map((r) => r.date));
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!days.has(fmt(cursor))) return 0;
    let streak = 0;
    while (days.has(fmt(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [reviews]);
}

export function useSettingsOrDefault(): ScheduleSettings {
  const s = useSettings();
  return s ? { target: s.target, ceiling: s.ceiling } : { target: 5, ceiling: 7 };
}

export function useAppData() {
  const problems = useProblems();
  const cards = useCards();
  const reviews = useReviews();
  const settings = useSettings();
  const ready = !!(problems && cards && settings);
  return { problems, cards, reviews, settings, ready };
}

export const fmtRating = (r: Rating): string => r[0].toUpperCase() + r.slice(1);

export const ratingClass = (r: Rating) =>
  ({ stuck: 'bg-stuck', shaky: 'bg-shaky', fluent: 'bg-fluent' }[r]);

// Re-export a callable rate that calls applyRating for ergonomics
export const useApplyRating = () => useCallback(applyRating, []);
