import { useMemo } from 'react';
import { dayKey } from '../engine/dates';
import type { DayKey, Review } from '../engine/types';

interface HeatmapProps {
  reviews: Review[];
  /** How many weekly columns to show. 52 ≈ one year. Ignored if `year` is set. */
  weeks?: number;
  /** When set, render every week that overlaps that calendar year. */
  year?: number;
  /** When set, cells become buttons that fire this on click. */
  onDayClick?: (key: DayKey) => void;
  selectedDay?: DayKey | null;
}

interface Cell {
  key: DayKey;
  date: Date;
  count: number;
  isFuture: boolean;
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function Heatmap({
  reviews,
  weeks = 52,
  year,
  onDayClick,
  selectedDay,
}: HeatmapProps) {
  const { columns, monthLabels, todayKey: todayStr } = useMemo(
    () => buildGrid(reviews, weeks, year),
    [reviews, weeks, year],
  );

  return (
    <div className="overflow-x-auto scrollbar-thin -mx-1 px-1 pb-1">
      <div className="inline-flex flex-col gap-1.5 min-w-max">
        {/* Month label row */}
        <div className="flex gap-[3px] pl-8 h-3">
          {columns.map((_, i) => {
            const label = monthLabels.find((m) => m.col === i);
            return (
              <div
                key={i}
                className="w-[11px] text-[10px] text-ink3 dark:text-mist2 leading-none whitespace-nowrap"
              >
                {label?.label ?? ''}
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div className="flex gap-[3px]">
          {/* Day-of-week labels (Mon/Wed/Fri only, like GitHub) */}
          <div className="flex flex-col gap-[3px] pr-1 text-[10px] text-ink3 dark:text-mist2">
            {DAY_LABELS.map((d, i) => (
              <div key={i} className="h-[11px] leading-none w-6">
                {d}
              </div>
            ))}
          </div>
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((cell) => (
                <HeatCell
                  key={cell.key}
                  cell={cell}
                  isToday={cell.key === todayStr}
                  selected={selectedDay === cell.key}
                  onClick={onDayClick && !cell.isFuture ? () => onDayClick(cell.key) : undefined}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 text-[10px] text-ink3 dark:text-mist2 mt-1 pr-1">
          <span>Less</span>
          {[0, 1, 2, 3, 5].map((c) => (
            <div key={c} className={`w-[11px] h-[11px] rounded-sm ${levelClass(c)}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

function HeatCell({
  cell,
  isToday,
  selected,
  onClick,
}: {
  cell: Cell;
  isToday: boolean;
  selected: boolean;
  onClick?: () => void;
}) {
  if (cell.isFuture) {
    return <div className="w-[11px] h-[11px] rounded-sm bg-transparent" aria-hidden />;
  }
  const bg = levelClass(cell.count);
  const ring = selected
    ? 'ring-2 ring-accent ring-offset-1 ring-offset-paper dark:ring-offset-night2'
    : isToday
      ? 'ring-1 ring-ink2/40 dark:ring-mist/40'
      : '';
  const title = `${prettyDate(cell.date)} — ${cell.count} ${
    cell.count === 1 ? 'review' : 'reviews'
  }`;

  if (!onClick) {
    return <div title={title} className={`w-[11px] h-[11px] rounded-sm ${bg} ${ring}`} />;
  }
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-[11px] h-[11px] rounded-sm ${bg} ${ring} hover:outline hover:outline-1 hover:outline-accent/70 transition-shadow`}
      aria-label={title}
    />
  );
}

function levelClass(count: number): string {
  if (count <= 0) return 'bg-[oklch(87%_0.003_280)] dark:bg-[oklch(28%_0.008_270)]';
  if (count === 1) return 'bg-[oklch(83%_0.05_290)] dark:bg-[oklch(36%_0.07_290)]';
  if (count <= 2) return 'bg-[oklch(72%_0.11_290)] dark:bg-[oklch(48%_0.13_290)]';
  if (count <= 4) return 'bg-[oklch(62%_0.17_290)] dark:bg-[oklch(58%_0.17_290)]';
  return 'bg-[oklch(52%_0.21_290)] dark:bg-[oklch(68%_0.16_290)]';
}

function buildGrid(reviews: Review[], weeks: number, year?: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = dayKey(today);

  let start: Date;
  let end: Date;
  if (year !== undefined) {
    // Snap start to the Sunday on/before Jan 1, end to the Saturday on/after Dec 31.
    const jan1 = new Date(year, 0, 1);
    start = new Date(jan1);
    start.setDate(jan1.getDate() - jan1.getDay());
    const dec31 = new Date(year, 11, 31);
    end = new Date(dec31);
    end.setDate(dec31.getDate() + (6 - dec31.getDay()));
  } else {
    // Rolling window: `weeks` columns ending with the column that contains today.
    const thisSunday = new Date(today);
    thisSunday.setDate(today.getDate() - today.getDay());
    end = new Date(thisSunday);
    end.setDate(end.getDate() + 6);
    start = new Date(thisSunday);
    start.setDate(start.getDate() - (weeks - 1) * 7);
  }

  const counts = new Map<string, number>();
  for (const r of reviews) counts.set(r.date, (counts.get(r.date) ?? 0) + 1);

  const columns: Cell[][] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const col: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor);
      const key = dayKey(date);
      col.push({
        key,
        date,
        count: counts.get(key) ?? 0,
        isFuture: date.getTime() > today.getTime(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(col);
  }

  // Month labels — first column whose first day starts a new month, with a
  // small minimum spacing so adjacent labels don't crowd each other.
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let i = 0; i < columns.length; i++) {
    const firstDate = columns[i][0].date;
    const m = firstDate.getMonth();
    if (m !== lastMonth) {
      if (monthLabels.length === 0 || i - monthLabels[monthLabels.length - 1].col >= 3) {
        monthLabels.push({ col: i, label: MONTHS[m] });
        lastMonth = m;
      }
    }
  }

  return { columns, monthLabels, todayKey: todayStr };
}

function prettyDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}
