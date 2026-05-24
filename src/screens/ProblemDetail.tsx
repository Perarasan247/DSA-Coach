import { useEffect, useMemo, useState } from 'react';
import { I } from '../components/icons';
import { Card, DiffPill, StatusBadge, formatDate, relDue, shortDate } from '../components/ui';
import { db } from '../db/db';
import { updateNotes, useCards, useReviews } from '../lib/store';
import type { Problem, Rating, Review } from '../engine/types';

interface ProblemDetailProps {
  problem: Problem;
  onClose: () => void;
}

export function ProblemDetail({ problem, onClose }: ProblemDetailProps) {
  const cards = useCards();
  const allReviews = useReviews();
  const card = cards?.find((c) => c.problem_id === problem.id);
  const attempts = useMemo(
    () => (allReviews ?? []).filter((r) => r.problem_id === problem.id),
    [allReviews, problem.id],
  );

  const [notes, setNotes] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    db.reviews
      .where('problem_id')
      .equals(problem.id)
      .reverse()
      .sortBy('id')
      .then((rs) => {
        const latest = rs.find((r) => r.notes);
        setNotes(latest?.notes ?? '');
        setLoaded(true);
      });
  }, [problem.id]);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      updateNotes(problem.id, notes);
    }, 600);
    return () => clearTimeout(t);
  }, [notes, problem.id, loaded]);

  const stats = useMemo(() => {
    const r = { stuck: 0, shaky: 0, fluent: 0 };
    for (const a of attempts) r[a.rating] = (r[a.rating] ?? 0) + 1;
    return r;
  }, [attempts]);

  if (!card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center px-0 sm:px-6">
      <div className="absolute inset-0 bg-ink/30 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-paper dark:bg-night2 rounded-t-3xl sm:rounded-2xl shadow-pop border-t sm:border border-hairline dark:border-night3 max-h-[92vh] overflow-y-auto scrollbar-thin">
        <div className="sticky top-0 z-10 bg-paper/95 dark:bg-night2/95 backdrop-blur border-b border-hairline dark:border-night3 px-5 sm:px-7 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.14em] text-ink3 dark:text-mist2">
              {problem.topic}
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mt-1 truncate">
              {problem.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DiffPill value={problem.difficulty} />
              <StatusBadge value={card.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="press shrink-0 w-9 h-9 rounded-full hover:bg-paper3 dark:hover:bg-night3 inline-flex items-center justify-center text-ink2 dark:text-mist"
          >
            <I.X size={18} />
          </button>
        </div>

        <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Times solved" value={String(card.times_solved)} />
            <Stat label="Current interval" value={card.interval > 0 ? `${card.interval}d` : '—'} />
            <Stat
              label="Next due"
              value={card.due ? shortDate(card.due) : '—'}
              sub={card.due ? relDue(card.due) : ''}
            />
            <Stat
              label="Fluency mix"
              custom={
                <div className="flex items-center gap-1.5 mt-0.5">
                  <FluencyBar stats={stats} />
                </div>
              }
            />
          </div>

          {problem.url && (
            <a
              href={problem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-2 text-sm text-accent hover:underline"
            >
              Open on LeetCode <I.External size={13} />
            </a>
          )}

          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-ink2 dark:text-mist font-semibold mb-3">
              Past attempts
            </div>
            {attempts.length === 0 ? (
              <Card className="px-5 py-6 text-center text-sm text-ink3 dark:text-mist2">
                No attempts yet. This one's waiting for you in the New queue.
              </Card>
            ) : (
              <Timeline attempts={[...attempts].reverse()} />
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-ink2 dark:text-mist font-semibold mb-2 flex items-center justify-between">
              <span>Notes</span>
              <span className="text-[10px] tracking-normal text-ink3 dark:text-mist2">
                autosaves
              </span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pattern, edge cases, insights…"
              rows={4}
              className="w-full p-3 rounded-xl bg-paper2 dark:bg-night3 border border-hairline dark:border-night3 outline-none focus:ring-2 focus:ring-accent/25 text-sm leading-relaxed resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  custom,
}: {
  label: string;
  value?: string;
  sub?: string;
  custom?: React.ReactNode;
}) {
  return (
    <Card className="px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-ink3 dark:text-mist2">{label}</div>
      {custom ?? (
        <>
          <div className="text-lg font-semibold tnum mt-0.5">{value}</div>
          {sub && <div className="text-[11px] text-ink3 dark:text-mist2 mt-0.5">{sub}</div>}
        </>
      )}
    </Card>
  );
}

function FluencyBar({ stats }: { stats: Record<Rating, number> }) {
  const total = stats.stuck + stats.shaky + stats.fluent;
  if (total === 0) return <div className="text-sm text-ink3 dark:text-mist2">—</div>;
  return (
    <div className="w-full">
      <div className="flex h-2 rounded-full overflow-hidden bg-paper3 dark:bg-night3">
        <div className="bg-stuck" style={{ width: `${(stats.stuck / total) * 100}%` }} />
        <div className="bg-shaky" style={{ width: `${(stats.shaky / total) * 100}%` }} />
        <div className="bg-fluent" style={{ width: `${(stats.fluent / total) * 100}%` }} />
      </div>
      <div className="flex items-center gap-2 text-[10px] text-ink3 dark:text-mist2 mt-1.5 tnum">
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-stuck" />
          {stats.stuck}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-shaky" />
          {stats.shaky}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-fluent" />
          {stats.fluent}
        </span>
      </div>
    </div>
  );
}

function Timeline({ attempts }: { attempts: Review[] }) {
  return (
    <div className="relative pl-5">
      <div className="absolute left-1.5 top-2 bottom-2 w-px bg-hairline dark:bg-night3" />
      <div className="flex flex-col gap-3">
        {attempts.map((a, i) => {
          const c =
            a.rating === 'stuck' ? 'bg-stuck' : a.rating === 'shaky' ? 'bg-shaky' : 'bg-fluent';
          const mins = a.time_taken_sec ? Math.floor(a.time_taken_sec / 60) : null;
          return (
            <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <span
                className={`relative -ml-[15px] w-3 h-3 rounded-full ring-4 ring-paper dark:ring-night2 ${c}`}
              />
              <div>
                <div className="text-sm font-medium capitalize">{a.rating}</div>
                <div className="text-[11px] text-ink3 dark:text-mist2 tnum">
                  {formatDate(parseDay(a.date), {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {mins != null && ` · ${mins} min`}
                  {a.notes && ` · ${a.notes}`}
                </div>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-ink3 dark:text-mist2">
                {i === 0 ? 'most recent' : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseDay(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
