import { useEffect, useMemo, useState } from 'react';
import { I } from '../components/icons';
import { Card, DiffPill, formatDate } from '../components/ui';
import { Heatmap } from '../components/Heatmap';
import { MonthCalendar } from '../components/MonthCalendar';
import { YearSelector, type YearChoice } from '../components/YearSelector';
import { addDays, fromKey, todayKey } from '../engine/dates';
import type { DayKey, Problem, Review } from '../engine/types';
import { ratingClass, useAppData, useReviews, useStreak } from '../lib/store';

interface CalendarScreenProps {
  onOpenProblem: (p: Problem) => void;
}

export function CalendarScreen({ onOpenProblem }: CalendarScreenProps) {
  const { problems, ready } = useAppData();
  const reviews = useReviews();
  const streak = useStreak(reviews);

  const [selectedDay, setSelectedDay] = useState<DayKey>(() => todayKey());
  const [monthCursor, setMonthCursor] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() };
  });
  const [yearMode, setYearMode] = useState<YearChoice>('rolling');

  // Snap the month grid to whatever day the user picked (from heatmap, etc.)
  useEffect(() => {
    const d = fromKey(selectedDay);
    if (d.getFullYear() !== monthCursor.year || d.getMonth() !== monthCursor.month) {
      setMonthCursor({ year: d.getFullYear(), month: d.getMonth() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  const problemById = useMemo(
    () => new Map((problems ?? []).map((p) => [p.id, p])),
    [problems],
  );

  const dayReviews = useMemo(
    () => (reviews ?? []).filter((r) => r.date === selectedDay),
    [reviews, selectedDay],
  );

  const totals = useMemo(() => {
    const list = reviews ?? [];
    const days = new Set(list.map((r) => r.date));
    const t = todayKey();
    const todayCount = list.filter((r) => r.date === t).length;
    return { all: list.length, days: days.size, today: todayCount };
  }, [reviews]);

  if (!ready) {
    return (
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 text-ink3 dark:text-mist2">
        Loading…
      </div>
    );
  }

  const isToday = selectedDay === todayKey();

  function shiftMonth(delta: number) {
    setMonthCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function jumpToToday() {
    const t = new Date();
    setMonthCursor({ year: t.getFullYear(), month: t.getMonth() });
    setSelectedDay(todayKey());
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-6 sm:pt-10 pb-32">
      <div className="mb-7">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-ink2 dark:text-mist mt-1 text-sm">
          Click any day to see what you solved.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <SummaryStat
          icon={<I.Flame size={16} className="text-[oklch(65%_0.18_55)]" />}
          label="Streak"
          value={String(streak)}
          sub={streak === 1 ? 'day' : 'days'}
        />
        <SummaryStat
          icon={<I.Calendar size={16} className="text-accent" />}
          label="Active days"
          value={String(totals.days)}
          sub="logged at least one"
        />
        <SummaryStat
          icon={<I.Check size={16} className="text-fluent" />}
          label="Total reviews"
          value={String(totals.all)}
          sub="all time"
        />
        <SummaryStat
          icon={<I.Spark size={16} className="text-accent2" />}
          label="Today"
          value={String(totals.today)}
          sub={totals.today === 1 ? 'review so far' : 'reviews so far'}
        />
      </div>

      {/* Streak heatmap (year overview) */}
      <Card className="px-5 py-5 mb-5">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-ink2 dark:text-mist font-semibold">
              Streak
            </div>
            <div className="text-xs text-ink3 dark:text-mist2 mt-1">
              {yearMode === 'rolling' ? 'Last 12 months' : yearMode}
            </div>
          </div>
          <YearSelector value={yearMode} onChange={setYearMode} reviews={reviews ?? []} />
        </div>
        <Heatmap
          reviews={reviews ?? []}
          year={yearMode === 'rolling' ? undefined : yearMode}
          onDayClick={setSelectedDay}
          selectedDay={selectedDay}
        />
      </Card>

      {/* Month grid + day detail — compact, side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,340px)_1fr] gap-5">
        <Card className="px-4 py-4 self-start">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftMonth(-1)}
                className="press w-7 h-7 rounded-md border border-hairline dark:border-night3 hover:bg-paper3 dark:hover:bg-night3 inline-flex items-center justify-center text-ink2 dark:text-mist"
                title="Previous month"
              >
                <I.ChevL size={13} />
              </button>
              <button
                onClick={() => shiftMonth(1)}
                className="press w-7 h-7 rounded-md border border-hairline dark:border-night3 hover:bg-paper3 dark:hover:bg-night3 inline-flex items-center justify-center text-ink2 dark:text-mist"
                title="Next month"
              >
                <I.ChevR size={13} />
              </button>
            </div>
            <h3 className="text-sm font-semibold tracking-tight tnum">
              {formatDate(new Date(monthCursor.year, monthCursor.month, 1), {
                month: 'long',
                year: 'numeric',
              })}
            </h3>
            <button
              onClick={jumpToToday}
              className="press h-7 px-2 rounded-md border border-hairline dark:border-night3 hover:bg-paper3 dark:hover:bg-night3 text-[11px] font-medium text-ink2 dark:text-mist"
            >
              Today
            </button>
          </div>
          <MonthCalendar
            year={monthCursor.year}
            month={monthCursor.month}
            reviews={reviews ?? []}
            selectedDay={selectedDay}
            onDayClick={setSelectedDay}
          />
        </Card>

        <Card className="px-5 py-5">
          <DayDetail
            selectedDay={selectedDay}
            dayReviews={dayReviews}
            problemById={problemById}
            isToday={isToday}
            onShiftDay={(d) => setSelectedDay(addDays(selectedDay, d))}
            onJumpToday={jumpToToday}
            onOpenProblem={onOpenProblem}
          />
        </Card>
      </div>
    </div>
  );
}

function DayDetail({
  selectedDay,
  dayReviews,
  problemById,
  isToday,
  onShiftDay,
  onJumpToday,
  onOpenProblem,
}: {
  selectedDay: DayKey;
  dayReviews: Review[];
  problemById: Map<number, Problem>;
  isToday: boolean;
  onShiftDay: (delta: number) => void;
  onJumpToday: () => void;
  onOpenProblem: (p: Problem) => void;
}) {
  const selectedDate = fromKey(selectedDay);
  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onShiftDay(-1)}
            className="press w-8 h-8 rounded-lg border border-hairline dark:border-night3 hover:bg-paper3 dark:hover:bg-night3 inline-flex items-center justify-center text-ink2 dark:text-mist"
            title="Previous day"
          >
            <I.ChevL size={14} />
          </button>
          <button
            onClick={() => onShiftDay(1)}
            disabled={isToday}
            className="press w-8 h-8 rounded-lg border border-hairline dark:border-night3 hover:bg-paper3 dark:hover:bg-night3 inline-flex items-center justify-center text-ink2 dark:text-mist disabled:opacity-30"
            title="Next day"
          >
            <I.ChevR size={14} />
          </button>
          <button
            onClick={onJumpToday}
            className="press h-8 px-3 rounded-lg border border-hairline dark:border-night3 hover:bg-paper3 dark:hover:bg-night3 text-xs font-medium text-ink2 dark:text-mist"
          >
            Today
          </button>
        </div>
        <span className="text-xs text-ink3 dark:text-mist2 tnum">
          {dayReviews.length} {dayReviews.length === 1 ? 'problem' : 'problems'}
        </span>
      </div>

      <div className="mb-4">
        <div className="text-xs uppercase tracking-[0.14em] text-ink3 dark:text-mist2">
          {formatDate(selectedDate, { weekday: 'long' })}
        </div>
        <h2 className="text-2xl font-semibold tracking-tight mt-0.5">
          {formatDate(selectedDate, { month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
      </div>

      {dayReviews.length === 0 ? (
        <EmptyDay isToday={isToday} />
      ) : (
        <div className="flex flex-col divide-y divide-hairline dark:divide-night3">
          {dayReviews.map((r) => (
            <ReviewRow
              key={r.id}
              review={r}
              problem={problemById.get(r.problem_id)}
              onOpen={() => {
                const p = problemById.get(r.problem_id);
                if (p) onOpenProblem(p);
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-ink3 dark:text-mist2">
          {label}
        </div>
        {icon}
      </div>
      <div className="text-2xl font-semibold tnum mt-1 leading-none">{value}</div>
      <div className="text-[11px] text-ink3 dark:text-mist2 mt-1.5">{sub}</div>
    </Card>
  );
}

function EmptyDay({ isToday }: { isToday: boolean }) {
  return (
    <div className="text-center py-10">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-paper3 dark:bg-night3 text-ink3 dark:text-mist2 mb-3">
        <I.Calendar size={18} />
      </div>
      <div className="text-sm text-ink2 dark:text-mist">
        {isToday ? 'Nothing logged yet today.' : 'No reviews on this day.'}
      </div>
    </div>
  );
}

function ReviewRow({
  review,
  problem,
  onOpen,
}: {
  review: Review;
  problem: Problem | undefined;
  onOpen: () => void;
}) {
  if (!problem) {
    return (
      <div className="py-3 text-sm text-ink3 dark:text-mist2">
        <span className="capitalize">{review.rating}</span> · problem removed
      </div>
    );
  }
  const mins = review.time_taken_sec ? Math.round(review.time_taken_sec / 60) : null;
  return (
    <button
      onClick={onOpen}
      className="text-left py-3 grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 hover:bg-paper/50 dark:hover:bg-night/40 -mx-2 px-2 rounded-lg transition-colors"
    >
      <span
        title={review.rating}
        className={`inline-block w-2 h-2 rounded-full ${ratingClass(review.rating)}`}
      />
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{problem.title}</div>
        <div className="text-xs text-ink3 dark:text-mist2 truncate">{problem.topic}</div>
      </div>
      <DiffPill value={problem.difficulty} />
      <span className="hidden sm:inline text-xs capitalize text-ink2 dark:text-mist w-14 text-right">
        {review.rating}
      </span>
      <span className="text-xs text-ink3 dark:text-mist2 tnum w-10 text-right">
        {mins != null ? `${mins}m` : '—'}
      </span>
    </button>
  );
}
