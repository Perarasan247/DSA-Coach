import { useEffect, useMemo, useState } from 'react';
import { I } from '../components/icons';
import {
  Card,
  Confetti,
  DiffPill,
  FluencyButtons,
  Ring,
  StreakChip,
  formatDate,
} from '../components/ui';
import {
  useApplyRating,
  useAppData,
  useResolveMasterPrompt,
  useReviews,
  useStreak,
  useTodayQueue,
  useUndoLastRating,
  type QueueItem,
} from '../lib/store';
import { todayKey } from '../engine/dates';
import type { Card as CardT, Problem, Rating } from '../engine/types';

interface TodayProps {
  onOpenProblem: (p: Problem) => void;
}

const BONUS_KEY_PREFIX = 'dsa-bonus-';

export function TodayScreen({ onOpenProblem }: TodayProps) {
  const queue = useTodayQueue();
  const { ready, cards, problems, settings } = useAppData();
  const reviews = useReviews();
  const applyRating = useApplyRating();
  const resolveMasterPrompt = useResolveMasterPrompt();
  const undoLastRating = useUndoLastRating();
  const streak = useStreak(reviews);
  const today = todayKey();
  const activeSheetId = settings?.active_sheet_id ?? 'arasu';
  const bonusKey = `${BONUS_KEY_PREFIX}${today}-${activeSheetId}`;
  const bonusSize = settings?.target ?? 5;

  const [bonusIds, setBonusIds] = useState<number[] | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(`${BONUS_KEY_PREFIX}${todayKey()}-${settings?.active_sheet_id ?? 'arasu'}`);
    return raw ? (JSON.parse(raw) as number[]) : null;
  });

  useEffect(() => {
    const raw = localStorage.getItem(bonusKey);
    setBonusIds(raw ? (JSON.parse(raw) as number[]) : null);
  }, [bonusKey]);

  const bonusItems: QueueItem[] = useMemo(() => {
    if (!bonusIds || !cards || !problems || !reviews) return [];
    const cardById = new Map(cards.map((c) => [c.problem_id, c]));
    const problemById = new Map(problems.map((p) => [p.id, p]));
    const ratedToday = new Set(
      reviews.filter((r) => r.date === today).map((r) => r.problem_id),
    );
    const items: QueueItem[] = [];
    for (const id of bonusIds) {
      if (ratedToday.has(id)) continue;
      const card = cardById.get(id);
      const problem = problemById.get(id);
      if (card && problem) items.push({ card, problem });
    }
    return items;
  }, [bonusIds, cards, problems, reviews, today]);

  const [expanded, setExpanded] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState<number>(0);
  const [masterFor, setMasterFor] = useState<CardT | null>(null);

  useEffect(() => {
    if (!queue) return;
    const all = [...queue.items, ...bonusItems];
    if (expanded == null && all.length > 0) {
      setExpanded(all[0].problem.id);
    }
  }, [queue, bonusItems, expanded]);

  const remainingTotal = (queue?.items.length ?? 0) + bonusItems.length;
  useEffect(() => {
    if (remainingTotal === 0 && (reviews ?? []).some((r) => r.date === today)) {
      setCelebrate((c) => (c === 0 ? Date.now() : c));
    }
    if (remainingTotal > 0) {
      setCelebrate(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingTotal]);

  if (!ready || !queue) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-10">
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const doneToday = (reviews ?? []).filter((r) => r.date === today).length;
  const remainingPrimary = queue.items.length;
  const remainingBonus = bonusItems.length;
  const plannedTotal = queue.servedCount + (bonusIds?.length ?? 0);
  const ringDone = Math.min(doneToday, plannedTotal);
  const totalToday = plannedTotal;
  const isPrimaryDone = remainingPrimary === 0;
  const isAllDone = remainingPrimary === 0 && remainingBonus === 0;
  const todayDate = new Date();

  const newPoolSize = (cards ?? []).filter(
    (c) => c.status === 'new' && !(bonusIds ?? []).includes(c.problem_id),
  ).length;
  const canActivateBonus = !bonusIds && newPoolSize > 0;
  const actualBonusOffer = Math.min(bonusSize, newPoolSize);

  async function handleRate(
    item: QueueItem,
    rating: Rating,
    extras?: { time_taken_sec?: number; notes?: string },
  ) {
    const before = item.card;
    const updated = await applyRating({ card: before, rating, ...extras });
    if (updated.ready_to_master) {
      setMasterFor(updated);
    }
    const all = [...queue!.items, ...bonusItems];
    const idx = all.findIndex((i) => i.problem.id === item.problem.id);
    const next = all[idx + 1];
    setExpanded(next ? next.problem.id : null);
  }

  function activateBonus() {
    if (!cards || !problems) return;
    const orderById = new Map(problems.map((p) => [p.id, p.order_index]));
    const ratedToday = new Set(
      (reviews ?? []).filter((r) => r.date === today).map((r) => r.problem_id),
    );
    const next = cards
      .filter((c) => c.status === 'new' && !ratedToday.has(c.problem_id))
      .sort(
        (a, b) =>
          (orderById.get(a.problem_id) ?? Infinity) -
          (orderById.get(b.problem_id) ?? Infinity),
      )
      .slice(0, bonusSize)
      .map((c) => c.problem_id);
    if (next.length === 0) return;
    setBonusIds(next);
    localStorage.setItem(bonusKey, JSON.stringify(next));
  }

  function clearBonusForToday() {
    setBonusIds(null);
    localStorage.removeItem(bonusKey);
  }

  return (
    <div className="relative max-w-3xl mx-auto px-5 sm:px-8 pt-6 sm:pt-10 pb-32">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 sm:mb-12">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-ink3 dark:text-mist2 mb-1.5 font-semibold">
            {formatDate(todayDate, { weekday: 'long' })}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {formatDate(todayDate, { month: 'long', day: 'numeric' })}
          </h1>
          <div className="mt-3 flex items-center gap-2.5 flex-wrap">
            <StreakChip days={streak} />
            <span className="text-xs text-ink3 dark:text-mist2">·</span>
            <span className="text-xs text-ink3 dark:text-mist2 font-medium">
              {remainingTotal === 0
                ? `${doneToday} solved today`
                : `${remainingTotal} to go`}
              {bonusIds && remainingTotal > 0 && (
                <span className="ml-1.5 text-accent font-semibold">+ bonus active</span>
              )}
            </span>
            {doneToday > 0 && (
              <button
                onClick={() => undoLastRating()}
                title="Undo last rating (Ctrl+Z)"
                className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-ink3 dark:text-mist2 hover:text-accent dark:hover:text-accent2 font-medium transition-colors duration-200"
              >
                <I.Undo size={13} />
                Undo
              </button>
            )}
          </div>
        </div>
        <div className="text-accent dark:text-accent2 shrink-0">
          <Ring done={ringDone} total={totalToday === 0 ? 1 : totalToday} size={90} />
        </div>
      </div>

      {/* Master prompt */}
      {masterFor && (
        <MasterPrompt
          card={masterFor}
          onResolve={async (keepGoing) => {
            await resolveMasterPrompt(masterFor, keepGoing);
            setMasterFor(null);
          }}
        />
      )}

      {isAllDone ? (
        <ClearedState
          streak={streak}
          celebrate={celebrate}
          solvedToday={doneToday}
          bonusUsed={!!bonusIds}
          canActivateBonus={canActivateBonus}
          bonusOffer={actualBonusOffer}
          onActivateBonus={activateBonus}
          onUndo={async () => {
            await undoLastRating();
            setCelebrate(0);
          }}
        />
      ) : (
        <>
          {queue.revisions.length > 0 && (
            <Section eyebrow="Revisions" count={queue.revisions.length} hint="Due today">
              <div className="flex flex-col gap-2.5">
                {queue.revisions.map((it) => (
                  <QueueCard
                    key={it.problem.id}
                    item={it}
                    expanded={expanded === it.problem.id}
                    onToggle={() =>
                      setExpanded(expanded === it.problem.id ? null : it.problem.id)
                    }
                    onRate={(r, extras) => handleRate(it, r, extras)}
                    onOpenProblem={() => onOpenProblem(it.problem)}
                  />
                ))}
              </div>
            </Section>
          )}

          {queue.fresh.length > 0 && (
            <Section
              eyebrow="New"
              count={queue.fresh.length}
              hint="First look — take your time"
              className="mt-8"
            >
              <div className="flex flex-col gap-2.5">
                {queue.fresh.map((it) => (
                  <QueueCard
                    key={it.problem.id}
                    item={it}
                    isNew
                    expanded={expanded === it.problem.id}
                    onToggle={() =>
                      setExpanded(expanded === it.problem.id ? null : it.problem.id)
                    }
                    onRate={(r, extras) => handleRate(it, r, extras)}
                    onOpenProblem={() => onOpenProblem(it.problem)}
                  />
                ))}
              </div>
            </Section>
          )}

          {bonusItems.length > 0 && (
            <Section
              eyebrow="Bonus"
              count={bonusItems.length}
              hint="Stretch round"
              className="mt-8"
              actions={
                <button
                  onClick={clearBonusForToday}
                  className="text-[11px] text-ink3 dark:text-mist2 hover:text-accent cursor-pointer transition-colors font-medium"
                  title="Remove the bonus round for today"
                >
                  skip
                </button>
              }
            >
              <div className="flex flex-col gap-2.5">
                {bonusItems.map((it) => (
                  <QueueCard
                    key={it.problem.id}
                    item={it}
                    isBonus
                    expanded={expanded === it.problem.id}
                    onToggle={() =>
                      setExpanded(expanded === it.problem.id ? null : it.problem.id)
                    }
                    onRate={(r, extras) => handleRate(it, r, extras)}
                    onOpenProblem={() => onOpenProblem(it.problem)}
                  />
                ))}
              </div>
            </Section>
          )}

          {isPrimaryDone && canActivateBonus && (
            <BonusCTA offer={actualBonusOffer} onActivate={activateBonus} className="mt-8" />
          )}

          <div className="mt-8 flex items-center justify-between text-xs text-ink3 dark:text-mist2 px-1">
            <div className="flex items-center gap-2 font-medium">
              <I.Target size={14} /> Pace target:
              <span className="tnum text-ink dark:text-paper font-semibold">
                {settings?.target ?? 5}/day
              </span>
            </div>
            <div className="flex items-center gap-2">
              Daily ceiling:
              <span className="tnum text-ink dark:text-paper font-semibold">
                {settings?.ceiling ?? 7}
              </span>
            </div>
          </div>
        </>
      )}

      <KeyboardHandler
        enabled={expanded != null}
        onRate={(r) => {
          if (expanded == null) return;
          const all = [...queue.items, ...bonusItems];
          const it = all.find((i) => i.problem.id === expanded);
          if (it) handleRate(it, r);
        }}
      />
    </div>
  );
}

function KeyboardHandler({
  enabled,
  onRate,
}: {
  enabled: boolean;
  onRate: (r: Rating) => void;
}) {
  useEffect(() => {
    if (!enabled) return;
    function handler(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const map: Record<string, Rating> = { '1': 'stuck', '2': 'shaky', '3': 'fluent' };
      const r = map[e.key];
      if (r) {
        e.preventDefault();
        onRate(r);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onRate]);
  return null;
}

function Section({
  eyebrow,
  count,
  hint,
  className = '',
  actions,
  children,
}: {
  eyebrow: string;
  count: number;
  hint: string;
  className?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-ink2 dark:text-mist font-bold">
            {eyebrow}
          </h2>
          <span className="tnum text-xs text-ink3 dark:text-mist2 bg-paper3/80 dark:bg-night3/80 px-2 py-0.5 rounded-full font-semibold">
            {count}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink3 dark:text-mist2 font-medium">
          <span>{hint}</span>
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}

interface QueueCardProps {
  item: QueueItem;
  isNew?: boolean;
  isBonus?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onRate: (r: Rating, extras?: { time_taken_sec?: number; notes?: string }) => void;
  onOpenProblem: () => void;
}

function QueueCard({
  item,
  isNew,
  isBonus,
  expanded,
  onToggle,
  onRate,
  onOpenProblem,
}: QueueCardProps) {
  const { problem, card } = item;
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  function pick(r: Rating) {
    onRate(r, {
      time_taken_sec: time ? Math.round(Number(time) * 60) : undefined,
      notes: notes || undefined,
    });
    setTime('');
    setNotes('');
  }

  const tag = isBonus ? 'BONUS' : isNew ? 'NEW' : null;

  return (
    <Card
      className={`overflow-hidden transition-all duration-200 ${
        expanded ? 'shadow-pop dark:shadow-card-dark' : 'hover:shadow-pop/50'
      }`}
    >
      <div
        className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 sm:px-5 py-3.5 cursor-pointer select-none"
        onClick={onToggle}
      >
        {/* Quick complete circle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            pick('fluent');
          }}
          className="cursor-pointer w-6 h-6 rounded-full border-2 border-hairline dark:border-night3 hover:border-fluent text-transparent hover:text-fluent flex items-center justify-center transition-all duration-200 shrink-0"
          aria-label="Quick complete (Fluent)"
        >
          <I.Check size={13} stroke={2.5} />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate font-semibold text-sm">{problem.title}</span>
            {tag && (
              <span className="shrink-0 text-[9px] uppercase tracking-widest text-accent font-bold bg-accent/10 dark:bg-accent/15 px-1.5 py-0.5 rounded-full">
                {tag}
              </span>
            )}
          </div>
          <div className="text-xs text-ink3 dark:text-mist2 mt-0.5 flex items-center gap-1.5 font-medium">
            <span className="truncate">{problem.topic}</span>
            {!isNew && !isBonus && card.interval > 0 && (
              <>
                <span className="opacity-40">·</span>
                <span>{card.interval}d interval</span>
              </>
            )}
          </div>
        </div>

        <DiffPill value={problem.difficulty} />

        {problem.url && (
          <a
            href={problem.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open on LeetCode"
            className="hidden sm:inline-flex cursor-pointer items-center justify-center w-9 h-9 rounded-lg text-ink3 dark:text-mist2 hover:text-accent hover:bg-accent/10 dark:hover:bg-accent/15 transition-all duration-200"
          >
            <I.External size={15} />
          </a>
        )}
      </div>

      {/* Expandable section */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-hairline dark:border-night4 px-4 sm:px-5 py-4 sm:py-5 bg-[oklch(91%_0.003_280)] dark:bg-[oklch(16%_0.007_270)]">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink2 dark:text-mist font-bold">
                How did it go?
              </div>
              {problem.url && (
                <a
                  href={problem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium cursor-pointer"
                >
                  Open on LeetCode <I.External size={12} />
                </a>
              )}
            </div>
            <FluencyButtons picked={null} onPick={pick} />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3">
              <label className="block">
                <div className="text-[11px] uppercase tracking-wider text-ink3 dark:text-mist2 mb-1.5 font-semibold">
                  Time
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="—"
                    className="w-full h-9 px-3 pr-10 rounded-xl bg-paper dark:bg-night3 border border-hairline dark:border-night4 outline-none focus:ring-2 focus:ring-accent/30 tnum text-sm transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink3 dark:text-mist2 font-medium">
                    min
                  </span>
                </div>
              </label>
              <label className="block">
                <div className="text-[11px] uppercase tracking-wider text-ink3 dark:text-mist2 mb-1.5 font-semibold">
                  Notes
                </div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key insight, edge case, pattern…"
                  className="w-full h-9 px-3 rounded-xl bg-paper dark:bg-night3 border border-hairline dark:border-night4 outline-none focus:ring-2 focus:ring-accent/30 text-sm transition-all"
                />
              </label>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={onOpenProblem}
                className="cursor-pointer text-xs text-ink3 dark:text-mist2 hover:text-accent inline-flex items-center gap-1.5 font-medium transition-colors"
              >
                View problem detail <I.ChevR size={12} />
              </button>
              <div className="text-[11px] text-ink3 dark:text-mist2 hidden sm:block">
                Press <span className="kbd">1</span> <span className="kbd">2</span>{' '}
                <span className="kbd">3</span> to rate
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MasterPrompt({
  card,
  onResolve,
}: {
  card: CardT;
  onResolve: (keepGoing: boolean) => void;
}) {
  void card;
  return (
    <Card className="px-5 sm:px-6 py-5 mb-5 border-accent/40 dark:border-accent/30 overflow-hidden relative">
      <div
        className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-30"
        style={{
          background: 'linear-gradient(135deg, oklch(96% 0.04 290 / 0.8), transparent 60%)',
        }}
      />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="shrink-0 w-10 h-10 rounded-xl text-white inline-flex items-center justify-center shadow-glow-sm"
            style={{
              background: 'linear-gradient(135deg, oklch(65% 0.22 290), oklch(52% 0.24 290))',
            }}
          >
            <I.Trophy size={17} />
          </div>
          <div className="min-w-0">
            <div className="font-bold">Three Fluents in a row.</div>
            <div className="text-xs text-ink3 dark:text-mist2 mt-0.5 font-medium">
              Mark this one mastered, or keep it on the schedule for one more revision?
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onResolve(true)}
            className="press cursor-pointer inline-flex items-center gap-2 h-9 px-3 rounded-xl text-sm border border-hairline dark:border-night3 hover:bg-paper2 dark:hover:bg-night2 font-medium transition-all duration-200"
          >
            One more revision
          </button>
          <button
            onClick={() => onResolve(false)}
            className="press cursor-pointer inline-flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold bg-accent text-white hover:brightness-110 shadow-glow-sm transition-all duration-200"
          >
            Mark mastered
          </button>
        </div>
      </div>
    </Card>
  );
}

function BonusCTA({
  offer,
  onActivate,
  className = '',
}: {
  offer: number;
  onActivate: () => void;
  className?: string;
}) {
  return (
    <Card className={`px-5 sm:px-6 py-5 border-accent/30 overflow-hidden relative ${className}`}>
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-25"
        style={{
          background: 'linear-gradient(135deg, oklch(95% 0.05 290 / 0.7), transparent 60%)',
        }}
      />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="shrink-0 w-10 h-10 rounded-xl text-white inline-flex items-center justify-center shadow-glow-sm"
            style={{
              background: 'linear-gradient(135deg, oklch(65% 0.22 290), oklch(52% 0.24 290))',
            }}
          >
            <I.Spark size={17} />
          </div>
          <div className="min-w-0">
            <div className="font-bold">Primary queue done. Want more?</div>
            <div className="text-xs text-ink3 dark:text-mist2 mt-0.5 font-medium">
              Pull up to{' '}
              <span className="tnum text-ink dark:text-paper font-bold">{offer}</span>{' '}
              extra new problems. They count toward today.
            </div>
          </div>
        </div>
        <button
          onClick={onActivate}
          className="press cursor-pointer shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold bg-accent text-white hover:brightness-110 shadow-glow-sm transition-all duration-200"
        >
          <I.Plus size={14} /> Bonus round
        </button>
      </div>
    </Card>
  );
}

function ClearedState({
  streak,
  celebrate,
  solvedToday,
  bonusUsed,
  canActivateBonus,
  bonusOffer,
  onActivateBonus,
  onUndo,
}: {
  streak: number;
  celebrate: number;
  solvedToday: number;
  bonusUsed: boolean;
  canActivateBonus: boolean;
  bonusOffer: number;
  onActivateBonus: () => void;
  onUndo: () => void;
}) {
  return (
    <div className="relative">
      <Confetti trigger={celebrate} />
      <Card className="px-7 sm:px-10 py-10 sm:py-14 text-center overflow-hidden relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(65% 55% at 50% 0%, oklch(72% 0.15 290 / .18) 0%, transparent 70%)',
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, oklch(65% 0.2 290 / 0.4), transparent)' }}
        />
        <div className="relative">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white mb-5 shadow-glow"
            style={{
              background: 'linear-gradient(135deg, oklch(68% 0.22 290), oklch(52% 0.24 290))',
            }}
          >
            <I.Trophy size={28} stroke={2} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {bonusUsed ? 'Bonus cleared too.' : 'Day cleared.'}
          </h2>
          <p className="mt-2.5 text-ink2 dark:text-mist max-w-md mx-auto font-medium">
            {solvedToday > 0 ? (
              <>
                <span className="tnum font-bold text-accent">{solvedToday}</span>{' '}
                {solvedToday === 1 ? 'problem' : 'problems'} today
                {streak > 0 && (
                  <>
                    {' · '}
                    <span className="tnum font-bold text-accent">{streak}</span>{' '}
                    day streak
                  </>
                )}
                . Small reps, big compounding.
              </>
            ) : (
              <>Nothing due today. Tomorrow's queue is already brewing.</>
            )}
          </p>

          {canActivateBonus && (
            <button
              onClick={onActivateBonus}
              className="press cursor-pointer mt-7 inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold bg-accent text-white hover:brightness-110 shadow-glow transition-all duration-200"
            >
              <I.Spark size={15} /> Bonus round (+{bonusOffer})
            </button>
          )}

          <div className="mt-7">
            <button
              onClick={onUndo}
              className="cursor-pointer text-xs text-ink3 dark:text-mist2 hover:text-accent inline-flex items-center gap-1.5 font-medium transition-colors"
            >
              <I.Undo size={12} /> Undo last rating
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
