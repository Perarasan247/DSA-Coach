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
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl skeleton" />
          ))}
        </div>
        <div className="h-48 rounded-2xl skeleton" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-6 sm:pt-10 pb-32">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Progress</h1>
        <p className="text-ink2 dark:text-mist mt-1 text-sm font-medium">
          Where you are on the way to <span className="tnum text-ink dark:text-paper font-bold">{data.totalAll}</span>.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPICard
          label="Overall"
          big={`${data.overallPct}%`}
          sub={
            <>
              <span className="tnum font-bold">{data.masteredCount}</span> of{' '}
              <span className="tnum">{data.totalAll}</span> mastered
            </>
          }
          accent
          gradientFrom="oklch(96% 0.04 290 / 0.6)"
          gradientTo="transparent"
        >
          <div className="mt-3 h-1.5 rounded-full bg-paper3 dark:bg-night3 overflow-hidden">
            <div
              className="barfill h-full rounded-full"
              style={{
                width: `${data.overallPct}%`,
                background: 'linear-gradient(90deg, oklch(68% 0.22 290), oklch(52% 0.24 290))',
              }}
            />
          </div>
        </KPICard>
        <KPICard
          label="Streak"
          big={String(streak)}
          sub={streak === 1 ? 'day' : 'days'}
          icon={
            <I.Flame
              size={17}
              className="text-[oklch(68%_0.2_55)]"
              style={{ filter: 'drop-shadow(0 0 5px oklch(68% 0.2 55 / 0.4))' }}
            />
          }
          gradientFrom="oklch(96% 0.05 55 / 0.5)"
          gradientTo="transparent"
        />
        <KPICard
          label="Retention"
          big={`${data.retention}%`}
          sub="across all attempts"
          icon={<I.Brain size={17} className="text-accent" />}
          gradientFrom="oklch(96% 0.04 290 / 0.4)"
          gradientTo="transparent"
        />
        <KPICard
          label="Active"
          big={String(data.activeCount)}
          sub={`${data.newCount} new pending`}
          icon={<I.Spark size={17} className="text-accent2" />}
          gradientFrom="oklch(96% 0.04 150 / 0.4)"
          gradientTo="transparent"
        />
      </div>

      {/* Status breakdown */}
      <Card className="px-5 py-5 mb-5">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink2 dark:text-mist font-bold">
              Status breakdown
            </div>
            <div className="text-xs text-ink3 dark:text-mist2 mt-1 font-medium">
              All {data.totalAll} problems
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11px] text-ink3 dark:text-mist2">
            <Legend dot="bg-[oklch(52%_0.18_290)]" label="Mastered" value={data.masteredCount} />
            <Legend dot="bg-accent" label="Active" value={data.activeCount} />
            <Legend dot="bg-mist" label="New" value={data.newCount} />
          </div>
        </div>
        <StackedBar
          parts={[
            { c: 'bg-[oklch(52%_0.18_290)]', v: data.masteredCount },
            { c: 'bg-accent', v: data.activeCount },
            { c: 'bg-paper3 dark:bg-night3', v: data.newCount },
          ]}
        />
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-ink3 dark:text-mist2 mt-3 sm:hidden">
          <Legend dot="bg-[oklch(52%_0.18_290)]" label="Mastered" value={data.masteredCount} />
          <Legend dot="bg-accent" label="Active" value={data.activeCount} />
          <Legend dot="bg-mist" label="New" value={data.newCount} />
        </div>
      </Card>

      {/* Streak heatmap */}
      <Card className="px-5 py-5 mb-5">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink2 dark:text-mist font-bold">
              Activity
            </div>
            <div className="text-xs text-ink3 dark:text-mist2 mt-1 font-medium">
              {yearMode === 'rolling' ? 'Last 12 months' : yearMode} ·{' '}
              {countReviewsInRange(reviews ?? [], yearMode)} reviews
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink3 dark:text-mist2">
              <I.Flame
                size={14}
                className="text-[oklch(68%_0.2_55)]"
                style={{ filter: 'drop-shadow(0 0 3px oklch(68% 0.2 55 / 0.4))' }}
              />
              <span className="tnum text-ink dark:text-paper font-bold">{streak}</span>
              <span className="font-medium">{streak === 1 ? 'day' : 'days'} streak</span>
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
        {/* Forecast chart */}
        <Card className="lg:col-span-3 px-5 py-5">
          <div className="flex items-end justify-between mb-1">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink2 dark:text-mist font-bold">
                Upcoming reviews
              </div>
              <div className="text-xs text-ink3 dark:text-mist2 mt-1 font-medium">Next 14 days</div>
            </div>
            <div className="text-xs text-ink3 dark:text-mist2 tnum font-medium">
              <span className="text-ink dark:text-paper font-bold">
                {data.forecast.reduce((s, d) => s + d.count, 0)}
              </span>{' '}
              total
            </div>
          </div>
          <ForecastChart data={data.forecast} />
        </Card>

        {/* Topics */}
        <Card className="lg:col-span-2 px-5 py-5">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink2 dark:text-mist font-bold">
                By topic
              </div>
              <div className="text-xs text-ink3 dark:text-mist2 mt-1 font-medium">
                {data.perTopic.length} topics
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
            {data.perTopic.map((t) => (
              <div key={t.id}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="truncate text-ink2 dark:text-mist font-semibold">{t.name}</span>
                  <span className="tnum text-ink3 dark:text-mist2 font-medium ml-2 shrink-0">
                    {t.mastered}/{t.total}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-paper3 dark:bg-night3 overflow-hidden">
                  <div
                    className="barfill h-full rounded-full"
                    style={{
                      width: `${t.pct}%`,
                      background:
                        'linear-gradient(90deg, oklch(68% 0.22 290), oklch(52% 0.24 290))',
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
  gradientFrom,
  gradientTo,
  children,
}: {
  label: string;
  big: string;
  sub: React.ReactNode;
  icon?: React.ReactNode;
  accent?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className={`px-4 py-4 relative overflow-hidden ${accent ? '' : ''}`}>
      {(gradientFrom || accent) && (
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            background: `radial-gradient(ellipse at top left, ${gradientFrom ?? 'oklch(96% 0.04 290 / 0.5)'}, ${gradientTo ?? 'transparent'} 70%)`,
          }}
        />
      )}
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] uppercase tracking-widest text-ink3 dark:text-mist2 font-bold">
            {label}
          </div>
          {icon}
        </div>
        <div className="text-3xl font-extrabold tnum mt-0.5 leading-none tracking-tight">
          {big}
        </div>
        <div className="text-xs text-ink3 dark:text-mist2 mt-1.5 font-medium">{sub}</div>
        {children}
      </div>
    </Card>
  );
}

function Legend({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
      <span>{label}</span>
      <span className="tnum text-ink2 dark:text-mist font-bold">{value}</span>
    </span>
  );
}

function StackedBar({ parts }: { parts: { c: string; v: number }[] }) {
  const total = parts.reduce((s, p) => s + p.v, 0);
  return (
    <div className="flex h-3 rounded-full overflow-hidden bg-paper3 dark:bg-night3 gap-px">
      {parts.map((p, i) => (
        <div
          key={i}
          className={`${p.c} transition-all duration-700 first:rounded-l-full last:rounded-r-full`}
          style={{ width: total ? `${(p.v / total) * 100}%` : 0 }}
        />
      ))}
    </div>
  );
}

function ForecastChart({ data }: { data: { day: string; count: number }[] }) {
  return (
    <div className="h-56 mt-3 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap={8}>
          <defs>
            <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(65% 0.22 290)" stopOpacity={1} />
              <stop offset="100%" stopColor="oklch(55% 0.2 290)" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.05} vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5, fontFamily: '"Plus Jakarta Sans"', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5, fontFamily: '"Plus Jakarta Sans"', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={20}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'currentColor', fillOpacity: 0.04 }}
            contentStyle={{
              background: 'oklch(98.5% 0.008 75)',
              border: '1px solid oklch(89% 0.008 75)',
              borderRadius: 14,
              fontSize: 12,
              fontFamily: '"Plus Jakarta Sans"',
              fontWeight: 600,
              boxShadow: '0 16px 48px -8px rgba(20,18,30,.18)',
              padding: '8px 12px',
            }}
            labelStyle={{ color: 'oklch(40% 0.01 270)', fontWeight: 700 }}
            itemStyle={{ color: 'oklch(22% 0.01 270)' }}
            formatter={(v: number) => [v, 'due']}
          />
          <Bar dataKey="count" fill="url(#barG)" radius={[6, 6, 2, 2]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
