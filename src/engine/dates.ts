import type { DayKey } from './types';

/** Return today's local date as a YYYY-MM-DD string (no time component). */
export function todayKey(now: Date = new Date()): DayKey {
  return dayKey(now);
}

export function dayKey(d: Date): DayKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string into a local Date at midnight. */
export function fromKey(k: DayKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Add `n` days to a DayKey and return the new DayKey. */
export function addDays(k: DayKey, n: number): DayKey {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** Whole-day difference: b - a (positive when b is later). */
export function diffDays(a: DayKey, b: DayKey): number {
  const da = fromKey(a).getTime();
  const db = fromKey(b).getTime();
  return Math.round((db - da) / 86_400_000);
}

/** True iff a ≤ b (date-wise). */
export function lte(a: DayKey, b: DayKey): boolean {
  return diffDays(a, b) >= 0;
}
