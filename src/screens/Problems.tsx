import { useMemo, useState } from 'react';
import { I } from '../components/icons';
import { Btn, Card, DiffPill, StatusBadge, relDue } from '../components/ui';
import { useAppCtx } from '../lib/AppContext';
import type { Card as CardT, CardStatus, Difficulty, Problem } from '../engine/types';

interface ProblemsScreenProps {
  onOpenProblem: (p: Problem) => void;
}

interface EnrichedProblem extends Problem {
  card: CardT;
}

const SHEET_LABELS: Record<string, string> = {
  arasu: 'Arasu DSA Sheet',
  neetcode150: 'Neetcode 150',
  striver_sde: "Striver's SDE",
};

export function ProblemsScreen({ onOpenProblem }: ProblemsScreenProps) {
  const { allProblems, allCards, settings, ready } = useAppCtx();

  const [browseSheet, setBrowseSheet] = useState<string | null>(null);
  const activeSheet = browseSheet ?? settings.active_sheet_id;

  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [diffFilter, setDiffFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  // Available sheets derived from the loaded problems
  const availableSheets = useMemo(() => {
    const seen = new Set<string>();
    for (const p of allProblems) {
      if ((p as Problem & { sheet_id?: string }).sheet_id) seen.add((p as Problem & { sheet_id?: string }).sheet_id!);
    }
    const order = ['arasu', 'neetcode150', 'striver_sde'];
    return order.filter((s) => seen.has(s));
  }, [allProblems]);

  const cardById = useMemo(() => new Map(allCards.map((c) => [c.problem_id, c])), [allCards]);

  const sheetProblems = useMemo(
    () => allProblems.filter((p) => (p as Problem & { sheet_id?: string }).sheet_id === activeSheet),
    [allProblems, activeSheet],
  );

  const enriched: EnrichedProblem[] = useMemo(() => {
    return sheetProblems
      .filter((p) => cardById.has(p.id))
      .map((p) => ({ ...p, card: cardById.get(p.id)! }));
  }, [sheetProblems, cardById]);

  const topics = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; order: number }>();
    for (const p of enriched) {
      if (!seen.has(p.topic)) seen.set(p.topic, { id: p.topic, name: p.topic, order: p.order_index });
    }
    return Array.from(seen.values()).sort((a, b) => a.order - b.order);
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q) && !p.topic.toLowerCase().includes(q)) return false;
      if (topicFilter !== 'all' && p.topic !== topicFilter) return false;
      if (diffFilter !== 'all' && p.difficulty !== diffFilter) return false;
      if (statusFilter !== 'all' && p.card.status !== statusFilter) return false;
      return true;
    });
  }, [enriched, search, topicFilter, diffFilter, statusFilter]);

  const grouped = useMemo(() => {
    const byTopic = new Map<string, EnrichedProblem[]>();
    for (const p of filtered) {
      if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
      byTopic.get(p.topic)!.push(p);
    }
    return topics
      .filter((t) => byTopic.has(t.id))
      .map((t) => ({ topic: t, items: byTopic.get(t.id)!.sort((a, b) => a.order_index - b.order_index) }));
  }, [filtered, topics]);

  const total = enriched.length;
  const masteredAll = enriched.filter((p) => p.card.status === 'mastered').length;
  const solvedAll = enriched.filter((p) => p.card.times_solved > 0).length;

  function toggleTopic(id: string) {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function clearAllFilters() {
    setSearch(''); setTopicFilter('all'); setDiffFilter('all'); setStatusFilter('all');
  }

  const anyFilter = search || topicFilter !== 'all' || diffFilter !== 'all' || statusFilter !== 'all';

  if (!ready) {
    return (
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-10">
        <div className="h-16 rounded-2xl skeleton mb-5" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-2xl skeleton" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-6 sm:pt-10 pb-32">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">All problems</h1>
          <p className="text-ink2 dark:text-mist mt-1 text-sm font-medium">
            <span className="tnum font-bold text-ink dark:text-paper">{solvedAll}</span> solved ·{' '}
            <span className="tnum font-bold text-ink dark:text-paper">{masteredAll}</span> mastered ·{' '}
            <span className="tnum">{total}</span> total · <span className="tnum">{topics.length}</span> topics
          </p>
        </div>
      </div>

      {/* Sheet tabs */}
      {availableSheets.length > 1 && (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
          {availableSheets.map((sid) => {
            const isActive = activeSheet === sid;
            const isCurrentSheet = sid === settings.active_sheet_id;
            return (
              <button
                key={sid}
                onClick={() => setBrowseSheet(sid)}
                className={`cursor-pointer shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-accent text-white shadow-glow-sm'
                    : 'bg-[oklch(94%_0.003_280)] dark:bg-night2 border border-hairline dark:border-night4 text-ink2 dark:text-mist hover:border-accent/40'
                }`}
              >
                {SHEET_LABELS[sid] ?? sid}
                {isCurrentSheet && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Filter bar */}
      <Card className="px-3.5 py-3.5 mb-5">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <I.Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 dark:text-mist2 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search problems or topics…"
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-paper dark:bg-night3 border border-hairline dark:border-night4 outline-none focus:ring-2 focus:ring-accent/25 text-sm font-medium transition-all"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Topic"
              value={topicFilter}
              onChange={setTopicFilter}
              options={[{ v: 'all', l: 'All topics' }, ...topics.map((t) => ({ v: t.id, l: t.name }))]}
            />
            <FilterSelect
              label="Difficulty"
              value={diffFilter}
              onChange={setDiffFilter}
              options={[{ v: 'all', l: 'All' }, { v: 'easy', l: 'Easy' }, { v: 'medium', l: 'Medium' }, { v: 'hard', l: 'Hard' }]}
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { v: 'all', l: 'All' }, { v: 'new', l: 'New' }, { v: 'active', l: 'Active' },
                { v: 'mastered', l: 'Mastered' }, { v: 'suspended', l: 'Suspended' },
              ]}
            />
            {anyFilter && (
              <button
                onClick={clearAllFilters}
                className="ml-auto text-xs text-ink3 dark:text-mist2 hover:text-accent inline-flex items-center gap-1.5 cursor-pointer font-semibold transition-colors"
              >
                <I.X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </Card>

      {grouped.length === 0 ? (
        total === 0 ? (
          <Card className="px-10 py-14 text-center">
            <div className="font-bold text-lg">No cards yet for this sheet.</div>
            <div className="text-sm text-ink3 dark:text-mist2 mt-1.5 font-medium">
              Switch to this sheet in Settings to load it.
            </div>
          </Card>
        ) : (
          <EmptyFilter onClear={clearAllFilters} />
        )
      ) : (
        <div className="flex flex-col gap-2.5">
          {grouped.map((g) => (
            <TopicGroup
              key={g.topic.id}
              topic={g.topic}
              items={g.items}
              collapsed={collapsed.has(g.topic.id)}
              onToggle={() => toggleTopic(g.topic.id)}
              onOpenProblem={onOpenProblem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-ink3 dark:text-mist2 font-semibold cursor-pointer">
      <span>{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="cursor-pointer appearance-none h-8 pl-3 pr-7 rounded-lg border border-hairline dark:border-night3 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/25 transition-all"
        >
          {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <I.ChevD size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-ink3 dark:text-mist2" />
      </div>
    </label>
  );
}

function TopicGroup({ topic, items, collapsed, onToggle, onOpenProblem }: {
  topic: { id: string; name: string };
  items: EnrichedProblem[];
  collapsed: boolean;
  onToggle: () => void;
  onOpenProblem: (p: Problem) => void;
}) {
  const mastered = items.filter((p) => p.card.status === 'mastered').length;
  const pct = Math.round((mastered / items.length) * 100);
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="cursor-pointer w-full grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-paper/70 dark:hover:bg-night/50 transition-colors duration-200"
      >
        <span className="text-ink3 dark:text-mist2">
          {collapsed ? <I.ChevR size={16} /> : <I.ChevD size={16} />}
        </span>
        <div className="text-left min-w-0">
          <div className="font-bold text-sm truncate">{topic.name}</div>
          <div className="text-xs text-ink3 dark:text-mist2 tnum mt-0.5 font-medium">{mastered}/{items.length} mastered</div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="w-28 h-1.5 rounded-full bg-paper3 dark:bg-night3 overflow-hidden">
            <div className="barfill h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, oklch(68% 0.22 290), oklch(52% 0.24 290))' }} />
          </div>
          <span className="tnum text-xs text-ink3 dark:text-mist2 w-8 text-right font-bold">{pct}%</span>
        </div>
        <span className="text-xs text-ink3 dark:text-mist2 tnum font-semibold bg-paper3/80 dark:bg-night3/80 px-2 py-0.5 rounded-full">{items.length}</span>
      </button>
      {!collapsed && (
        <div className="border-t border-hairline dark:border-night3 divide-y divide-hairline/60 dark:divide-night3/60">
          {items.map((p) => <ProblemRow key={p.id} p={p} onOpen={() => onOpenProblem(p)} />)}
        </div>
      )}
    </Card>
  );
}

function ProblemRow({ p, onOpen }: { p: EnrichedProblem; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="cursor-pointer w-full grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_70px_120px_90px_90px_24px] items-center gap-3 px-4 sm:px-5 py-3 text-left hover:bg-paper/60 dark:hover:bg-night/50 transition-colors duration-150 group"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-sm font-semibold group-hover:text-accent transition-colors duration-150">{p.title}</span>
        </div>
        <div className="text-xs text-ink3 dark:text-mist2 mt-0.5 sm:hidden font-medium">
          <StatusBadge value={p.card.status as CardStatus} compact /> · <span className="tnum">{p.card.times_solved}×</span> · {relDue(p.card.due)}
        </div>
      </div>
      <div className="justify-self-start"><DiffPill value={p.difficulty as Difficulty} /></div>
      <div className="hidden sm:block"><StatusBadge value={p.card.status as CardStatus} /></div>
      <div className="hidden sm:block text-xs text-ink3 dark:text-mist2 tnum font-medium">{p.card.times_solved}× solved</div>
      <div className="hidden sm:block text-xs text-ink3 dark:text-mist2 font-medium">{relDue(p.card.due)}</div>
      <I.ChevR size={14} className="hidden sm:block text-ink3 dark:text-mist2 group-hover:text-accent transition-colors duration-150" />
    </button>
  );
}

function EmptyFilter({ onClear }: { onClear: () => void }) {
  return (
    <Card className="px-10 py-14 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-paper3 dark:bg-night3 text-ink3 dark:text-mist2 mb-4"><I.Search size={22} /></div>
      <div className="font-bold text-lg">No problems match.</div>
      <div className="text-sm text-ink3 dark:text-mist2 mt-1.5 font-medium">Try widening your search or status filter.</div>
      <Btn variant="outline" className="mt-6" onClick={onClear}><I.X size={14} /> Clear filters</Btn>
    </Card>
  );
}
