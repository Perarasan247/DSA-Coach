import { addDays } from './dates';
import type { Card, CardStatus, DayKey, ProjectedLoad, Rating } from './types';

export const FLUENT_BASE = 8;
export const SHAKY_RANGE: readonly [number, number] = [4, 5];
export const STUCK_RANGE: readonly [number, number] = [2, 3];
export const MASTER_STREAK = 3;

export interface ScheduleSettings {
  target: number;
  ceiling: number;
}

export const DEFAULT_SETTINGS: ScheduleSettings = { target: 5, ceiling: 7 };

export function newCard(problemId: number): Card {
  return {
    problem_id: problemId,
    status: 'new',
    interval: 0,
    due: null,
    consecutive_fluent: 0,
    total_reviews: 0,
    times_solved: 0,
    ready_to_master: false,
    first_solved_at: null,
    mastered_at: null,
  };
}

/**
 * Pick the earliest offset whose projected load is under the ceiling.
 * If every day in the range is already saturated, fall back to range[0].
 */
export function pickOffset(
  range: readonly [number, number],
  today: DayKey,
  projectedLoadByDay: ProjectedLoad,
  ceiling: number = DEFAULT_SETTINGS.ceiling,
): number {
  const [lo, hi] = range;
  for (let offset = lo; offset <= hi; offset++) {
    const key = addDays(today, offset);
    const load = projectedLoadByDay[key] ?? 0;
    if (load < ceiling) return offset;
  }
  return lo;
}

/**
 * Apply a fluency rating to a card and return the updated card.
 * - Fluent doubles the interval (starts at FLUENT_BASE on the first rating)
 * - Shaky/Stuck reset the streak and pull the interval back via pickOffset
 * - After MASTER_STREAK consecutive Fluents the card is flagged ready_to_master.
 */
export function rate(
  card: Card,
  rating: Rating,
  today: DayKey,
  projectedLoadByDay: ProjectedLoad = {},
  settings: ScheduleSettings = DEFAULT_SETTINGS,
): Card {
  const next: Card = { ...card };
  next.times_solved += 1;
  next.total_reviews += 1;
  const isFirstRating = next.total_reviews === 1;

  if (rating === 'fluent') {
    next.consecutive_fluent += 1;
    next.interval = isFirstRating ? FLUENT_BASE : Math.max(1, card.interval) * 2;
  } else {
    next.consecutive_fluent = 0;
    next.ready_to_master = false;
    const range = rating === 'shaky' ? SHAKY_RANGE : STUCK_RANGE;
    const offset = pickOffset(range, today, projectedLoadByDay, settings.ceiling);
    next.interval = offset;
  }

  next.status = 'active' as CardStatus;
  next.due = addDays(today, next.interval);
  if (next.first_solved_at == null) next.first_solved_at = today;

  if (next.consecutive_fluent >= MASTER_STREAK) {
    next.ready_to_master = true;
  }

  return next;
}

/**
 * Resolve the "Mark mastered, or one more revision?" prompt.
 * keepGoing=true: keep the due date rate() just set (will re-prompt next time).
 * keepGoing=false: mark mastered and remove from queue.
 */
export function resolveMaster(card: Card, keepGoing: boolean, today: DayKey): Card {
  if (keepGoing) {
    return { ...card, ready_to_master: false };
  }
  return {
    ...card,
    status: 'mastered',
    mastered_at: today,
    due: null,
    ready_to_master: false,
  };
}

export interface QueueResult {
  /** All cards to serve today (revisions first, then new), capped at ceiling. */
  items: Card[];
  revisions: Card[];
  fresh: Card[];
}

/**
 * Build today's queue from the current card state.
 * - revisions = active cards with due ≤ today (overdue first, then weakest)
 * - new fills only toward TARGET; only revisions can push toward CEILING
 * - Returns up to settings.ceiling items in display order (revisions then new).
 *
 * `getOrderIndex` resolves the roadmap order_index for a problem_id. New
 * problems are introduced strictly in ascending order_index order.
 */
export function buildTodaysQueue(
  cards: Card[],
  today: DayKey,
  getOrderIndex: (problemId: number) => number,
  settings: ScheduleSettings = DEFAULT_SETTINGS,
): QueueResult {
  const due = cards
    .filter((c) => c.status === 'active' && c.due != null && c.due <= today)
    .sort((a, b) => {
      const da = a.due!;
      const db = b.due!;
      if (da !== db) return da < db ? -1 : 1; // most overdue first
      if (a.consecutive_fluent !== b.consecutive_fluent) {
        return a.consecutive_fluent - b.consecutive_fluent; // weakest first
      }
      if (a.interval !== b.interval) return a.interval - b.interval;
      return getOrderIndex(a.problem_id) - getOrderIndex(b.problem_id);
    });

  const revisions = due.slice(0, settings.ceiling);
  const slotsForNew = Math.max(0, settings.target - revisions.length);

  const fresh =
    slotsForNew === 0
      ? []
      : cards
          .filter((c) => c.status === 'new')
          .sort((a, b) => getOrderIndex(a.problem_id) - getOrderIndex(b.problem_id))
          .slice(0, slotsForNew);

  return {
    items: [...revisions, ...fresh],
    revisions,
    fresh,
  };
}

/**
 * Build a ProjectedLoad map from existing cards' due dates. Useful as input
 * to rate(), so pickOffset can smooth load against already-scheduled days.
 */
export function projectedLoadFromCards(cards: Card[]): ProjectedLoad {
  const map: ProjectedLoad = {};
  for (const c of cards) {
    if (c.status !== 'active' || c.due == null) continue;
    map[c.due] = (map[c.due] ?? 0) + 1;
  }
  return map;
}
