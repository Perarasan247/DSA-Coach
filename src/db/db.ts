import { supabase } from './supabase';
import { todayKey } from '../engine/dates';
import { newCard, projectedLoadFromCards, rate as engineRate, resolveMaster as engineResolveMaster } from '../engine/scheduler';
import type { Card, Problem, Rating, Review } from '../engine/types';
import type { AppSettings } from '../lib/AppContext';

// ── Rating ──────────────────────────────────────────────────────────────────

interface RateOpts {
  card: Card;
  rating: Rating;
  time_taken_sec?: number;
  notes?: string;
}

export async function applyRating({ card, rating, time_taken_sec, notes }: RateOpts): Promise<Card> {
  const today = todayKey();
  const uid = (await supabase.auth.getUser()).data.user!.id;

  const { data: allCardsRaw } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', uid);

  const allCards: Card[] = (allCardsRaw ?? []).map(rowToCard);
  const others = allCards.filter((c) => c.problem_id !== card.problem_id);
  const projected = projectedLoadFromCards(others);

  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', uid)
    .single();

  const settings = settingsRow
    ? { target: settingsRow.target, ceiling: settingsRow.ceiling }
    : { target: 5, ceiling: 7 };

  const updated = engineRate(card, rating, today, projected, settings);

  await supabase
    .from('cards')
    .update(cardToRow(updated))
    .eq('user_id', uid)
    .eq('problem_id', card.problem_id);

  await supabase.from('reviews').insert({
    user_id: uid,
    problem_id: card.problem_id,
    date: today,
    rating,
    time_taken_sec: time_taken_sec ?? null,
    notes: notes ?? null,
    prev_card: card,
  });

  return updated;
}

export async function resolveMasterPrompt(card: Card, keepGoing: boolean): Promise<Card> {
  const today = todayKey();
  const updated = engineResolveMaster(card, keepGoing, today);
  const uid = (await supabase.auth.getUser()).data.user!.id;
  await supabase
    .from('cards')
    .update(cardToRow(updated))
    .eq('user_id', uid)
    .eq('problem_id', card.problem_id);
  return updated;
}

export async function undoLastRating(): Promise<Review | null> {
  const uid = (await supabase.auth.getUser()).data.user!.id;

  const { data: rows } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', uid)
    .order('id', { ascending: false })
    .limit(1);

  if (!rows || rows.length === 0) return null;
  const last = rows[0];
  const review: Review = {
    id: last.id,
    problem_id: last.problem_id,
    date: last.date,
    rating: last.rating,
    time_taken_sec: last.time_taken_sec,
    notes: last.notes,
    prev_card: last.prev_card,
  };

  if (last.prev_card) {
    await supabase
      .from('cards')
      .update(cardToRow(last.prev_card as Card))
      .eq('user_id', uid)
      .eq('problem_id', last.problem_id);
  }
  await supabase.from('reviews').delete().eq('id', last.id).eq('user_id', uid);

  return review;
}

export async function updateNotes(problemId: number, notes: string): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user!.id;

  const { data: rows } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', uid)
    .eq('problem_id', problemId)
    .order('id', { ascending: false })
    .limit(1);

  if (rows && rows.length > 0) {
    await supabase.from('reviews').update({ notes }).eq('id', rows[0].id).eq('user_id', uid);
  } else {
    await supabase.from('reviews').insert({
      user_id: uid,
      problem_id: problemId,
      date: todayKey(),
      rating: 'shaky',
      notes,
    });
  }
}

export async function saveSettings(next: Partial<AppSettings>): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user!.id;
  await supabase
    .from('user_settings')
    .upsert({ user_id: uid, ...next }, { onConflict: 'user_id' });
}

// ── Data export / import / reset ────────────────────────────────────────────

export async function exportAll(): Promise<string> {
  const uid = (await supabase.auth.getUser()).data.user!.id;
  const [problemsRes, cardsRes, reviewsRes, settingsRes] = await Promise.all([
    supabase.from('problems').select('*').order('order_index'),
    supabase.from('cards').select('*').eq('user_id', uid),
    supabase.from('reviews').select('*').eq('user_id', uid).order('date'),
    supabase.from('user_settings').select('*').eq('user_id', uid).single(),
  ]);
  return JSON.stringify(
    {
      version: 2,
      exported_at: new Date().toISOString(),
      problems: problemsRes.data ?? [],
      cards: cardsRes.data ?? [],
      reviews: reviewsRes.data ?? [],
      settings: settingsRes.data ?? {},
    },
    null,
    2,
  );
}

export async function importAll(json: string): Promise<void> {
  const data = JSON.parse(json);
  const uid = (await supabase.auth.getUser()).data.user!.id;

  if (Array.isArray(data.cards)) {
    await supabase.from('cards').delete().eq('user_id', uid);
    const rows = data.cards.map((c: Card) => ({ ...cardToRow(c), user_id: uid }));
    for (let i = 0; i < rows.length; i += 100) {
      await supabase.from('cards').insert(rows.slice(i, i + 100));
    }
  }
  if (Array.isArray(data.reviews)) {
    await supabase.from('reviews').delete().eq('user_id', uid);
    const rows = data.reviews.map((r: Review) => ({ ...r, user_id: uid, id: undefined }));
    for (let i = 0; i < rows.length; i += 100) {
      await supabase.from('reviews').insert(rows.slice(i, i + 100));
    }
  }
  if (data.settings) {
    await supabase.from('user_settings').upsert({ user_id: uid, ...data.settings }, { onConflict: 'user_id' });
  }
}

export async function resetAll(): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user!.id;
  await Promise.all([
    supabase.from('cards').delete().eq('user_id', uid),
    supabase.from('reviews').delete().eq('user_id', uid),
  ]);
  await supabase
    .from('user_settings')
    .upsert({ user_id: uid, target: 5, ceiling: 7, active_sheet_id: 'arasu' }, { onConflict: 'user_id' });

  // Re-create cards for the default Arasu sheet
  const { data: probs } = await supabase.from('problems').select('id').eq('sheet_id', 'arasu');
  if (probs && probs.length > 0) {
    const cards = probs.map((p) => ({ ...newCard(p.id as number), user_id: uid }));
    for (let i = 0; i < cards.length; i += 100) {
      await supabase.from('cards').insert(cards.slice(i, i + 100));
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function rowToCard(row: Record<string, unknown>): Card {
  return {
    problem_id: row.problem_id as number,
    status: row.status as Card['status'],
    interval: row.interval as number,
    due: row.due as string | null,
    consecutive_fluent: row.consecutive_fluent as number,
    total_reviews: row.total_reviews as number,
    times_solved: row.times_solved as number,
    ready_to_master: row.ready_to_master as boolean,
    first_solved_at: row.first_solved_at as string | null,
    mastered_at: row.mastered_at as string | null,
  };
}

function cardToRow(card: Card): Omit<Card, 'problem_id'> & Record<string, unknown> {
  return {
    status: card.status,
    interval: card.interval,
    due: card.due,
    consecutive_fluent: card.consecutive_fluent,
    total_reviews: card.total_reviews,
    times_solved: card.times_solved,
    ready_to_master: card.ready_to_master,
    first_solved_at: card.first_solved_at,
    mastered_at: card.mastered_at,
  };
}

// Kept for backwards-compat with any import that used `db` directly.
// In the new architecture callers should use AppContext / store hooks.
export const db = {
  problems: null as unknown as { toArray: () => Promise<Problem[]> },
};
