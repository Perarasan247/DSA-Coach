import { useMemo } from 'react';
import type { Review } from '../engine/types';

export type YearChoice = 'rolling' | number;

interface YearSelectorProps {
  value: YearChoice;
  onChange: (v: YearChoice) => void;
  reviews: Review[];
  /** How many past calendar years to always include (default 4). */
  pastYears?: number;
}

export function YearSelector({
  value,
  onChange,
  reviews,
  pastYears = 4,
}: YearSelectorProps) {
  const years = useMemo(() => {
    const set = new Set<number>();
    const now = new Date().getFullYear();
    set.add(now);
    for (let y = now - 1; y >= now - pastYears; y--) set.add(y);
    for (const r of reviews) set.add(parseInt(r.date.slice(0, 4), 10));
    return [...set].sort((a, b) => b - a);
  }, [reviews, pastYears]);

  return (
    <select
      value={value === 'rolling' ? 'rolling' : String(value)}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === 'rolling' ? 'rolling' : parseInt(v, 10));
      }}
      className="appearance-none h-8 pl-3 pr-8 rounded-lg border border-hairline dark:border-night3 text-xs outline-none focus:ring-2 focus:ring-accent/25"
    >
      <option value="rolling">Last 12 months</option>
      {years.map((y) => (
        <option key={y} value={String(y)}>
          {y}
        </option>
      ))}
    </select>
  );
}
