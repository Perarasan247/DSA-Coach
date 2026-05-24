import { useMemo } from 'react';
import { dayKey, todayKey } from '../engine/dates';
import type { DayKey, Review } from '../engine/types';

interface MonthCalendarProps {
  year: number;
  /** 0–11 */
  month: number;
  reviews: Review[];
  selectedDay: DayKey | null;
  onDayClick: (key: DayKey) => void;
}

interface MonthCell {
  key: DayKey | null;
  date: Date | null;
  count: number;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthCalendar({
  year,
  month,
  reviews,
  selectedDay,
  onDayClick,
}: MonthCalendarProps) {
  const cells = useMemo(() => buildMonthCells(year, month, reviews), [year, month, reviews]);
  const today = todayKey();

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-2 text-[11px] font-medium uppercase tracking-wider text-ink3 dark:text-mist2 text-center">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => (
          <DayCell
            key={i}
            cell={cell}
            isToday={cell.key === today}
            selected={cell.key !== null && cell.key === selectedDay}
            onClick={cell.key ? () => onDayClick(cell.key!) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  cell,
  isToday,
  selected,
  onClick,
}: {
  cell: MonthCell;
  isToday: boolean;
  selected: boolean;
  onClick?: () => void;
}) {
  if (!cell.key || !cell.date) {
    return <div className="aspect-square" aria-hidden />;
  }
  const has = cell.count > 0;

  const base = 'aspect-square rounded-lg flex flex-col items-center justify-center transition-colors text-left p-1 select-none';
  let bg: string;
  if (selected) {
    bg = 'bg-accent text-white shadow-[0_6px_20px_-8px_oklch(60%_0.2_290/.6)]';
  } else if (has) {
    bg =
      'bg-accent3 dark:bg-[oklch(28%_0.08_290)] text-ink dark:text-paper hover:bg-[oklch(92%_0.05_290)] dark:hover:bg-[oklch(34%_0.09_290)]';
  } else {
    bg = 'bg-paper2 dark:bg-night3/40 text-ink2 dark:text-mist hover:bg-paper3 dark:hover:bg-night3';
  }
  const ring = isToday && !selected ? 'ring-1 ring-accent/60' : '';

  return (
    <button
      onClick={onClick}
      className={`${base} ${bg} ${ring}`}
      title={`${prettyDate(cell.date)} — ${cell.count} ${
        cell.count === 1 ? 'review' : 'reviews'
      }`}
    >
      <span className="text-sm font-medium tnum">{cell.date.getDate()}</span>
      {has && (
        <span
          className={`text-[10px] tnum leading-none mt-0.5 ${
            selected ? 'text-white/85' : 'text-accent'
          }`}
        >
          {cell.count}
        </span>
      )}
    </button>
  );
}

function buildMonthCells(year: number, month: number, reviews: Review[]): MonthCell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekday = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = lastDay.getDate();

  const counts = new Map<string, number>();
  for (const r of reviews) counts.set(r.date, (counts.get(r.date) ?? 0) + 1);

  const cells: MonthCell[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ key: null, date: null, count: 0 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = dayKey(date);
    cells.push({ key, date, count: counts.get(key) ?? 0 });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: null, date: null, count: 0 });
  }
  return cells;
}

function prettyDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}
