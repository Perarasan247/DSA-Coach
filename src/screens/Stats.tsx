import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useState } from 'react';
import { I } from '../components/icons';
import { Card } from '../components/ui';
import { Heatmap } from '../components/Heatmap';
import { YearSelector, type YearChoice } from '../components/YearSelector';
import { addDays, todayKey } from '../engine/dates';
import type { Review } from '../engine/types';
import { useAppData, useReviews, useStreak } from '../lib/store';

export function StatsScreen() {
  const { problems, cards, ready } = useAppData();
  const reviews = useReviews();
  const streak = useStreak(reviews);
  const [yearMode, setYearMode] = useState<YearChoice>('rolling');

  const data = useMemo(() => {
    if (!problems || !cards) return null;
    const totalAll = problems.length;
    const masteredCount = cards.filter((c) => c.status === 'mastered').length;
    const activeCount = cards.filter((c) => c.status === 'active').length;
    const newCount = cards.filter((c) => c.status === 'new').length;
    const overallPct = Math.round((masteredCount / totalAll) * 100);

    const allAttempts = reviews ?? [];
    const retained = allAttempts.filter((a) => a.rating !== 'stuck').length;
    const retention = allAttempts.length ? Math.round((retained / allAttempts.length) * 100) : 0;

    // Per-topic completion
    const byTopic = new Map<string, { name: string; total: number; mastered: number; order: number }>();
    for (const p of problems) {
      const t = byTopic.get(p.topic) ?? {
        name: p.topic,
        total: 0,
        mastered: 0,
        order: p.order_index,
      };
      t.total += 1;
      byTopic.set(p.topic, t);
    }
    const cardById = new Map(cards.map((c) => [c.problem_id, c]));
    for (const p of problems) {
      const t = byTopic.get(p.topic)!;
      if (cardById.get(p.id)?.status === 'mastered') t.mastered += 1;
    }
    const perTopic = Array.from(byTopic.entries())
      .map(([id, v]) => ({
        id,
        name: v.name,
        total: v.total,
        mastered: v.mastered,
        pct: v.total ? Math.round((v.mastered / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct);

    // Forecast next 14 days
    const today = todayKey();
    const forecast = Array.from({ length: 14 }, (_, i) => {
      const key = addDays(today, i);
      const due = cards.filter((c) => c.due === key && c.status === 'active').length;
      const d = new Date();
      d.setDate(d.getDate() + i);
      return {
        day:
          i === 0
            ? 'Today'
            : `${new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d)} ${d.getDate()}`,
        count: due,
      };
    });

    return {
      totalAll,
      masteredCount,
      activeCount,
      newCount,
      overallPct,
      retention,
      perTopic,
      forecast,
    };
  }, [problems, cards, reviews]);

  if (!ready || !data) {
    return (
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 text-ink3 dark:text-mist2">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-6 sm:pt-10 pb-32">
      <div className="mb-7">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Progress</h1>
        <p className="text-ink2 dark:text-mist mt-1 text-sm">
          Where you are on the way to {data.totalAll}.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPICard
          label="Overall"
          big={`${data.overallPct}%`}
          sub={
            <>
              <span className="tnum">{data.masteredCount}</span> of{' '}
              <span className="tnum">{data.totalAll}</span> mastered
            </>
          }
          accent
        >
          <div className="mt-3 h-1.5 rounded-full bg-paper3 dark:bg-night3 overflow-hidden">
            <div className="barfill h-full bg-accent" style={{ width: `${data.overallPct}%` }} />
          </div>
        </KPICard>
        <KPICard
          label="Streak"
          big={String(streak)}
          sub={streak === 1 ? 'day' : 'days'}
          icon={<I.Flame size={16} className="text-[oklch(65%_0.18_55)]" />}
        />
        <KPICard
          label="Retention"
          big={`${data.retention}%`}
          sub="across all attempts"
          icon={<I.Brain size={16} className="text-accent" />}
        />
        <KPICard
          label="Active"
          big={String(data.activeCount)}
          sub={`${data.newCount} new pending`}
          icon={<I.Spark size={16} className="text-accent2" />}
        />
      </div>

      <Card className="px-5 py-5 mb-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-ink2 dark:text-mist font-semibold">
              Status breakdown
            </div>
            <div className="text-xs text-ink3 dark:text-mist2 mt-1">All {data.totalAll} problems</div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11px] text-ink3 dark:text-mist2">
            <Legend dot="bg-[oklch(45%_0.18_290)]" label="Mastered" value={data.masteredCount} />
            <Legend dot="bg-accent" label="Active" value={data.activeCount} />
            <Legend dot="bg-mist" label="New" value={data.newCount} />
          </div>
        </div>
        <StackedBar
          parts={[
            { c: 'bg-[oklch(45%_0.18_290)]', v: data.masteredCount },
            { c: 'bg-accent', v: data.activeCount },
            { c: 'bg-paper3 dark:bg-night3', v: data.newCount },
          ]}
        />
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-ink3 dark:text-mist2 mt-3 sm:hidden">
          <Legend dot="bg-[oklch(45%_0.18_290)]" label="Mastered" value={data.masteredCount} />
          <Legend dot="bg-accent" label="Active" value={data.activeCount} />
          <Legend dot="bg-mist" label="New" value={data.newCount} />
        </div>
      </Card>

      {/* Streak heatmap */}
      <Card className="px-5 py-5 mb-5">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-ink2 dark:text-mist font-semibold">
              Streak
            </div>
            <div className="text-xs text-ink3 dark:text-mist2 mt-1">
              {yearMode === 'rolling' ? 'Last 12 months' : yearMode} ·{' '}
              {countReviewsInRange(reviews ?? [], yearMode)} reviews
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink3 dark:text-mist2">
              <I.Flame size={14} className="text-[oklch(65%_0.18_55)]" />
              <span className="tnum text-ink dark:text-paper font-medium">{streak}</span>
              <span>{streak === 1 ? 'day' : 'days'} streak</span>
            </div>
            <YearSelector value={yearMode} onChange={setYearMode} reviews={reviews ?? []} />
          </div>
        </div>
        <Heatmap
          reviews={reviews ?? []}
          year={yearMode === 'rolling' ? undefined : yearMode}
        />
      </Card>

      <div className="grid lg:grid-cols-5 gap-5">
        <Card className="lg:col-span-3 px-5 py-5">
          <div className="flex items-end justify-between mb-1">
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-ink2 dark:text-mist font-semibold">
                Upcoming reviews
              </div>
              <div className="text-xs text-ink3 dark:text-mist2 mt-1">Next 14 days</div>
            </div>
            <div className="text-xs text-ink3 dark:text-mist2 tnum">
              <span className="text-ink dark:text-paper font-medium">
                {data.forecast.reduce((s, d) => s + d.count, 0)}
              </span>{' '}
              total
            </div>
          </div>
          <ForecastChart data={data.forecast} />
        </Card>

        <Card className="lg:col-span-2 px-5 py-5">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-ink2 dark:text-mist font-semibold">
                By topic
              </div>
              <div className="text-xs text-ink3 dark:text-mist2 mt-1">
                {data.perTopic.length} topics
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
            {data.perTopic.map((t) => (
              <div key={t.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="truncate text-ink2 dark:text-mist">{t.name}</span>
                  <span className="tnum text-ink3 dark:text-mist2">
                    {t.mastered}/{t.total}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-paper3 dark:bg-night3 overflow-hidden">
                  <div
                    className="barfill h-full"
                    style={{
                      width: `${t.pct}%`,
                      background:
                        'linear-gradient(90deg, oklch(72% 0.13 290), oklch(55% 0.22 290))',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function countReviewsInRange(reviews: Review[], yearMode: YearChoice): number {
  if (yearMode === 'rolling') return reviews.length;
  const prefix = `${yearMode}-`;
  return reviews.filter((r) => r.date.startsWith(prefix)).length;
}

function KPICard({
  label,
  big,
  sub,
  icon,
  accent,
  children,
}: {
  label: string;
  big: string;
  sub: React.ReactNode;
  icon?: React.ReactNode;
  accent?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card
      className={`px-4 py-4 relative overflow-hidden ${
        accent
          ? 'bg-gradient-to-br from-accent3/70 to-paper2/70 dark:from-[oklch(26%_0.06_290)] dark:to-night2'
          : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-ink3 dark:text-mist2">
          {label}
        </div>
        {icon}
      </div>
      <div className="text-3xl font-semibold tnum mt-1 leading-none">{big}</div>
      <div className="text-xs text-ink3 dark:text-mist2 mt-1.5">{sub}</div>
      {children}
    </Card>
  );
}

function Legend({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span>{label}</span>
      <span className="tnum text-ink2 dark:text-mist">{value}</span>
    </span>
  );
}

function StackedBar({ parts }: { parts: { c: string; v: number }[] }) {
  const total = parts.reduce((s, p) => s + p.v, 0);
  return (
    <div className="flex h-3 rounded-full overflow-hidden bg-paper3 dark:bg-night3">
      {parts.map((p, i) => (
        <div
          key={i}
          className={`${p.c} transition-all duration-700`}
          style={{ width: total ? `${(p.v / total) * 100}%` : 0 }}
        />
      ))}
    </div>
  );
}

function ForecastChart({ data }: { data: { day: string; count: number }[] }) {
  return (
    <div className="h-56 mt-3 -ml-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap={6}>
          <defs>
            <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(60% 0.2 290)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="oklch(72% 0.13 290)" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.06} vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.55 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.55 }}
            axisLine={false}
            tickLine={false}
            width={22}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'currentColor', fillOpacity: 0.05 }}
            contentStyle={{
              background: 'oklch(98.5% 0.008 75)',
              border: '1px solid oklch(89% 0.008 75)',
              borderRadius: 12,
              fontSize: 12,
              boxShadow: '0 12px 40px -8px rgba(20,18,30,.18)',
            }}
            labelStyle={{ color: 'oklch(40% 0.01 270)' }}
            itemStyle={{ color: 'oklch(22% 0.01 270)' }}
            formatter={(v: number) => [v, 'due']}
          />
          <Bar dataKey="count" fill="url(#barG)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
