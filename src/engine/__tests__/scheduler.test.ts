import { describe, expect, it } from 'vitest';
import { addDays } from '../dates';
import {
  DEFAULT_SETTINGS,
  buildTodaysQueue,
  newCard,
  projectedLoadFromCards,
  rate,
  resolveMaster,
} from '../scheduler';
import type { Card } from '../types';

const TODAY = '2026-05-01';

function makeNew(id: number): Card {
  return newCard(id);
}

describe('rate() — fluent path', () => {
  it('first Fluent → interval 8, due in 8 days', () => {
    const c = rate(makeNew(1), 'fluent', TODAY);
    expect(c.interval).toBe(8);
    expect(c.due).toBe(addDays(TODAY, 8));
    expect(c.consecutive_fluent).toBe(1);
    expect(c.status).toBe('active');
    expect(c.first_solved_at).toBe(TODAY);
  });

  it('three Fluents in a row → 8, 16, then ready_to_master at streak 3', () => {
    let c = rate(makeNew(1), 'fluent', '2026-05-01');
    expect(c.interval).toBe(8);
    expect(c.ready_to_master).toBe(false);

    c = rate(c, 'fluent', '2026-05-09'); // +8 from first
    expect(c.interval).toBe(16);
    expect(c.consecutive_fluent).toBe(2);
    expect(c.ready_to_master).toBe(false);

    c = rate(c, 'fluent', '2026-05-25'); // +16 from second
    expect(c.consecutive_fluent).toBe(3);
    expect(c.ready_to_master).toBe(true);
    // Interval would have been 32 — kept (it's irrelevant once mastered)
    expect(c.interval).toBe(32);
  });
});

describe('rate() — shaky / stuck base intervals', () => {
  it('first Stuck on a new card → +2 days, status active', () => {
    const c = rate(makeNew(1), 'stuck', TODAY);
    expect(c.interval).toBe(2);
    expect(c.due).toBe(addDays(TODAY, 2));
    expect(c.consecutive_fluent).toBe(0);
  });

  it('first Shaky on a new card → +4 days', () => {
    const c = rate(makeNew(1), 'shaky', TODAY);
    expect(c.interval).toBe(4);
    expect(c.due).toBe(addDays(TODAY, 4));
  });

  it('first Fluent → +8 days', () => {
    const c = rate(makeNew(1), 'fluent', TODAY);
    expect(c.interval).toBe(8);
  });
});

describe('rate() — shaky-first sequence retires on the 5th attempt', () => {
  it('shaky, shaky, fluent×3 → streak 3 → ready_to_master', () => {
    let c = makeNew(1);
    c = rate(c, 'shaky', TODAY);
    expect(c.interval).toBe(4);
    expect(c.consecutive_fluent).toBe(0);

    c = rate(c, 'shaky', addDays(TODAY, 4));
    expect(c.interval).toBe(4);
    expect(c.consecutive_fluent).toBe(0);

    c = rate(c, 'fluent', addDays(TODAY, 8));
    // First Fluent — not the very first rating, so doubles previous interval (4) → 8
    expect(c.interval).toBe(8);
    expect(c.consecutive_fluent).toBe(1);

    c = rate(c, 'fluent', addDays(TODAY, 16));
    expect(c.interval).toBe(16);
    expect(c.consecutive_fluent).toBe(2);
    expect(c.ready_to_master).toBe(false);

    c = rate(c, 'fluent', addDays(TODAY, 32));
    expect(c.consecutive_fluent).toBe(3);
    expect(c.ready_to_master).toBe(true);
  });
});

describe('rate() — first Fluent after Stuck doubles the previous interval', () => {
  it('Stuck (+2), then Fluent → interval 4', () => {
    let c = rate(makeNew(1), 'stuck', TODAY);
    expect(c.interval).toBe(2);
    c = rate(c, 'fluent', addDays(TODAY, 2));
    expect(c.interval).toBe(4);
    expect(c.consecutive_fluent).toBe(1);
  });
});

describe('rate() — Shaky/Stuck resets streak and pulls interval to base', () => {
  it('active card interval 16 + streak 2 → Shaky pulls to 4, streak 0', () => {
    const c: Card = {
      ...newCard(1),
      status: 'active',
      interval: 16,
      due: '2026-05-25',
      consecutive_fluent: 2,
      total_reviews: 2,
      times_solved: 2,
      first_solved_at: '2026-05-01',
    };
    const next = rate(c, 'shaky', '2026-05-25');
    expect(next.interval).toBe(4);
    expect(next.consecutive_fluent).toBe(0);
    expect(next.ready_to_master).toBe(false);
  });

  it('Stuck pulls to 2 by default', () => {
    const c: Card = {
      ...newCard(1),
      status: 'active',
      interval: 16,
      due: '2026-05-25',
      consecutive_fluent: 2,
      total_reviews: 2,
      times_solved: 2,
      first_solved_at: '2026-05-01',
    };
    const next = rate(c, 'stuck', '2026-05-25');
    expect(next.interval).toBe(2);
    expect(next.consecutive_fluent).toBe(0);
  });
});

describe('pickOffset / load smoothing', () => {
  it('uses the late edge when the early day is saturated', () => {
    const load = { [addDays(TODAY, 4)]: 7 };
    const c = rate(makeNew(1), 'shaky', TODAY, load);
    expect(c.interval).toBe(5); // skipped 4, used 5
  });

  it('stays on the early edge when nothing is saturated', () => {
    const c = rate(makeNew(1), 'stuck', TODAY, {});
    expect(c.interval).toBe(2);
  });
});

describe('resolveMaster()', () => {
  it('keepGoing=false → status mastered, due null, mastered_at set', () => {
    let c = rate(makeNew(1), 'fluent', '2026-05-01');
    c = rate(c, 'fluent', '2026-05-09');
    c = rate(c, 'fluent', '2026-05-25');
    expect(c.ready_to_master).toBe(true);

    const mastered = resolveMaster(c, false, '2026-05-25');
    expect(mastered.status).toBe('mastered');
    expect(mastered.due).toBeNull();
    expect(mastered.mastered_at).toBe('2026-05-25');
    expect(mastered.ready_to_master).toBe(false);
  });

  it('keepGoing=true → keeps active, clears ready_to_master flag', () => {
    let c = rate(makeNew(1), 'fluent', '2026-05-01');
    c = rate(c, 'fluent', '2026-05-09');
    c = rate(c, 'fluent', '2026-05-25');
    const kept = resolveMaster(c, true, '2026-05-25');
    expect(kept.status).toBe('active');
    expect(kept.due).toBe(c.due);
    expect(kept.ready_to_master).toBe(false);
  });
});

// ---------- Queue tests ----------

const orderIndex = (id: number) => id;

function activeCard(id: number, dueOffset: number, fluentStreak = 0, interval = 4): Card {
  return {
    ...newCard(id),
    status: 'active',
    interval,
    due: addDays(TODAY, dueOffset),
    consecutive_fluent: fluentStreak,
    total_reviews: 1,
    times_solved: 1,
    first_solved_at: TODAY,
  };
}

describe('buildTodaysQueue()', () => {
  it('0 due → 5 new', () => {
    const cards = [
      makeNew(1),
      makeNew(2),
      makeNew(3),
      makeNew(4),
      makeNew(5),
      makeNew(6),
      makeNew(7),
    ];
    const q = buildTodaysQueue(cards, TODAY, orderIndex);
    expect(q.revisions).toHaveLength(0);
    expect(q.fresh).toHaveLength(5);
    expect(q.items).toHaveLength(5);
  });

  it('2 due → 2 rev + 3 new = 5', () => {
    const cards: Card[] = [
      activeCard(10, 0),
      activeCard(11, -1),
      makeNew(1),
      makeNew(2),
      makeNew(3),
      makeNew(4),
    ];
    const q = buildTodaysQueue(cards, TODAY, orderIndex);
    expect(q.revisions).toHaveLength(2);
    expect(q.fresh).toHaveLength(3);
    expect(q.items).toHaveLength(5);
  });

  it('7 due → 7 rev + 0 new (revisions can stretch to ceiling)', () => {
    const cards: Card[] = [
      activeCard(10, 0),
      activeCard(11, 0),
      activeCard(12, 0),
      activeCard(13, 0),
      activeCard(14, 0),
      activeCard(15, 0),
      activeCard(16, 0),
      makeNew(1),
      makeNew(2),
    ];
    const q = buildTodaysQueue(cards, TODAY, orderIndex);
    expect(q.revisions).toHaveLength(7);
    expect(q.fresh).toHaveLength(0);
    expect(q.items).toHaveLength(7);
  });

  it('8 due → 7 shown, 1 carries over (still active, due ≤ today)', () => {
    const due: Card[] = [
      activeCard(10, 0),
      activeCard(11, 0),
      activeCard(12, 0),
      activeCard(13, 0),
      activeCard(14, 0),
      activeCard(15, 0),
      activeCard(16, 0),
      activeCard(17, 0),
    ];
    const q = buildTodaysQueue(due, TODAY, orderIndex);
    expect(q.items).toHaveLength(7);
    const served = new Set(q.items.map((c) => c.problem_id));
    const carriedOver = due.filter((c) => !served.has(c.problem_id));
    expect(carriedOver).toHaveLength(1);
    // The carried-over card is still due ≤ today, so it leads tomorrow's queue.
    expect(carriedOver[0].due! <= TODAY).toBe(true);
  });

  it('most-overdue cards lead the queue', () => {
    const cards: Card[] = [
      activeCard(10, 0), // due today
      activeCard(11, -3), // 3 days overdue
      activeCard(12, -1), // 1 day overdue
    ];
    const q = buildTodaysQueue(cards, TODAY, orderIndex);
    expect(q.items.map((c) => c.problem_id)).toEqual([11, 12, 10, /* no new since target=5 */]);
  });

  it('within same due date, weaker streaks come first', () => {
    const cards: Card[] = [
      activeCard(10, 0, 2),
      activeCard(11, 0, 0),
      activeCard(12, 0, 1),
    ];
    const q = buildTodaysQueue(cards, TODAY, orderIndex);
    expect(q.items.map((c) => c.problem_id)).toEqual([11, 12, 10]);
  });

  it('new problems are introduced strictly in order_index order', () => {
    const cards: Card[] = [makeNew(5), makeNew(2), makeNew(9), makeNew(1)];
    const q = buildTodaysQueue(cards, TODAY, orderIndex);
    expect(q.fresh.map((c) => c.problem_id)).toEqual([1, 2, 5, 9]);
  });

  it('mastered cards never appear in the queue', () => {
    const mastered: Card = {
      ...newCard(99),
      status: 'mastered',
      times_solved: 5,
      total_reviews: 5,
      consecutive_fluent: 3,
      mastered_at: '2026-04-01',
    };
    const cards: Card[] = [mastered, makeNew(1), activeCard(10, 0)];
    const q = buildTodaysQueue(cards, TODAY, orderIndex);
    const ids = q.items.map((c) => c.problem_id);
    expect(ids).not.toContain(99);
  });

  it('respects custom target/ceiling settings', () => {
    const cards: Card[] = [
      activeCard(10, 0),
      activeCard(11, 0),
      activeCard(12, 0),
      activeCard(13, 0),
      makeNew(1),
      makeNew(2),
    ];
    const q = buildTodaysQueue(cards, TODAY, orderIndex, { target: 3, ceiling: 5 });
    expect(q.revisions).toHaveLength(4); // all 4 due fit under ceiling 5
    expect(q.fresh).toHaveLength(0); // target 3 already exceeded by 4 revisions
  });
});

describe('projectedLoadFromCards()', () => {
  it('counts active+due cards per day', () => {
    const cards: Card[] = [
      activeCard(10, 1),
      activeCard(11, 1),
      activeCard(12, 2),
      makeNew(99),
    ];
    const load = projectedLoadFromCards(cards);
    expect(load[addDays(TODAY, 1)]).toBe(2);
    expect(load[addDays(TODAY, 2)]).toBe(1);
  });
});

describe('integration — carry-over scenario', () => {
  it('serving 7 and finishing 4 leaves 3 overdue for the next day', () => {
    const today = '2026-05-01';
    const tomorrow = '2026-05-02';
    const cards: Card[] = Array.from({ length: 7 }, (_, i) => activeCard(i + 1, 0));

    // Day 1: serve all 7
    const q1 = buildTodaysQueue(cards, today, orderIndex);
    expect(q1.items).toHaveLength(7);

    // Rate only the first 4 as fluent
    const rated = q1.items.slice(0, 4).map((c) => rate(c, 'fluent', today));
    const unrated = q1.items.slice(4); // still due today

    const cardsDay2 = [
      ...rated, // due in 16d each
      ...unrated, // still due 2026-05-01
    ];

    const q2 = buildTodaysQueue(cardsDay2, tomorrow, orderIndex, DEFAULT_SETTINGS);
    expect(q2.revisions).toHaveLength(3);
    expect(q2.revisions.every((c) => c.due! <= tomorrow)).toBe(true);
  });
});

describe('DEFAULT_SETTINGS', () => {
  it('has target 5 and ceiling 7', () => {
    expect(DEFAULT_SETTINGS.target).toBe(5);
    expect(DEFAULT_SETTINGS.ceiling).toBe(7);
  });
});
