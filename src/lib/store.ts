import { useCallback, useMemo } from 'react';
import { applyRating as applyRatingDB, undoLastRating as undoLastRatingDB, resolveMasterPrompt as resolveMasterDB, updateNotes, saveSettings } from '../db/db';
import { todayKey } from '../engine/dates';
import { buildTodaysQueue, projectedLoadFromCards } from '../engine/scheduler';
import type { Card, Problem, Rating, Review } from '../engine/types';
import { useAppCtx, type AppSettings } from './AppContext';

export type { AppSettings };
export { saveSettings, updateNotes };

// ── Basic data hooks ─────────────────────────────────────────────────────────

export function useProblems(): Problem[] | undefined {
  const { allProblems, settings, ready } = useAppCtx();
  if (!ready) return undefined;
  return allProblems.filter((p) => (p as Problem & { sheet_id?: string }).sheet_id === settings.active_sheet_id);
}

export function useCards(): Card[] | undefined {
  const { allCards, allProblems, settings, ready } = useAppCtx();
  if (!ready) return undefined;
  const sheetProblemIds = new Set(
    allProblems
      .filter((p) => (p as Problem & { sheet_id?: string }).sheet_id === settings.active_sheet_id)
      .map((p) => p.id),
  );
  return allCards.filter((c) => sheetProblemIds.has(c.problem_id));
}

export function useSettings(): AppSettings | undefined {
  const { settings, ready } = useAppCtx();
  return ready ? settings : undefined;
}

export function useReviews(): Review[] | undefined {
  const { reviews, ready } = useAppCtx();
  return ready ? reviews : undefined;
}

// ── Today queue ───────────────────────────────────────────────────────────────

export interface QueueItem {
  card: Card;
  problem: Problem;
}

export interface BuiltQueue {
  revisions: QueueItem[];
  fresh: QueueItem[];
  items: QueueItem[];
  servedCount: number;
}

const SERVED_KEY_PREFIX = 'dsa-served-';

function servedKey(today: string, sheetId: string): string {
  return `${SERVED_KEY_PREFIX}${today}-${sheetId}`;
}

function loadServed(today: string, sheetId: string): number[] | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(servedKey(today, sheetId));
  if (!raw) return null;
  try { return JSON.parse(raw) as number[]; } catch { return null; }
}

function saveServed(today: string, sheetId: string, ids: number[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(servedKey(today, sheetId), JSON.stringify(ids));
}

export function useTodayQueue(): BuiltQueue | undefined {
  const cards = useCards();
  const problems = useProblems();
  const settings = useSettings();
  const reviews = useReviews();
  const today = todayKey();

  return useMemo(() => {
    if (!cards || !problems || !settings) return undefined;

    const sheetId = settings.active_sheet_id;
    const byId = new Map(problems.map((p) => [p.id, p]));
    const cardById = new Map(cards.map((c) => [c.problem_id, c]));
    const getOrder = (id: number) => byId.get(id)?.order_index ?? Number.MAX_SAFE_INTEGER;
    const reviewedTodayIds = new Set(
      (reviews ?? []).filter((r) => r.date === today).map((r) => r.problem_id),
    );

    let servedIds = loadServed(today, sheetId);
    if (servedIds === null) {
      const built = buildTodaysQueue(cards, today, getOrder, settings);
      servedIds = built.items.map((c) => c.problem_id);
      saveServed(today, sheetId, servedIds);
    }

    const items: QueueItem[] = [];
    const revisions: QueueItem[] = [];
    const fresh: QueueItem[] = [];
    for (const id of servedIds) {
      if (reviewedTodayIds.has(id)) continue;
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

// ── Write hooks (wrap DB calls + refresh) ────────────────────────────────────

export function useApplyRating() {
  const { refresh } = useAppCtx();
  return useCallback(
    async (opts: { card: Card; rating: Rating; time_taken_sec?: number; notes?: string }) => {
      const updated = await applyRatingDB(opts);
      await refresh();
      return updated;
    },
    [refresh],
  );
}

export function useUndoLastRating() {
  const { refresh } = useAppCtx();
  return useCallback(async () => {
    const result = await undoLastRatingDB();
    await refresh();
    return result;
  }, [refresh]);
}

export function useResolveMasterPrompt() {
  const { refresh } = useAppCtx();
  return useCallback(async (card: Card, keepGoing: boolean) => {
    const updated = await resolveMasterDB(card, keepGoing);
    await refresh();
    return updated;
  }, [refresh]);
}

export function useSaveSettings() {
  const { refresh } = useAppCtx();
  return useCallback(async (next: Partial<AppSettings>) => {
    await saveSettings(next);
    await refresh();
  }, [refresh]);
}

// ── Derived helpers ──────────────────────────────────────────────────────────

export function useStreak(reviews: Review[] | undefined): number {
  return useMemo(() => {
    if (!reviews || reviews.length === 0) return 0;
    const days = new Set(reviews.map((r) => r.date));
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!days.has(fmt(cursor))) return 0;
    let streak = 0;
    while (days.has(fmt(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [reviews]);
}

export function useSettingsOrDefault(): { target: number; ceiling: number } {
  const s = useSettings();
  return s ?? { target: 5, ceiling: 7 };
}

export function useAppData() {
  const { allProblems, allCards, reviews, settings, ready } = useAppCtx();
  const problems = useProblems();
  const cards = useCards();
  return { problems, cards, allProblems, allCards, reviews, settings, ready };
}

export function useDoneToday(): number {
  const reviews = useReviews();
  const today = todayKey();
  return useMemo(() => {
    if (!reviews) return 0;
    return new Set(reviews.filter((r) => r.date === today).map((r) => r.problem_id)).size;
  }, [reviews, today]);
}

export function useProjectedLoad() {
  const cards = useCards();
  return useMemo(() => (cards ? projectedLoadFromCards(cards) : {}), [cards]);
}

export const fmtRating = (r: Rating): string => r[0].toUpperCase() + r.slice(1);
export const ratingClass = (r: Rating) => ({ stuck: 'bg-stuck', shaky: 'bg-shaky', fluent: 'bg-fluent' }[r]);
