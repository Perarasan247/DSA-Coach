import { useMemo, useState } from 'react';
import { I } from '../components/icons';
import { Btn, Card, DiffPill, StatusBadge, relDue } from '../components/ui';
import { useAppData } from '../lib/store';
import type { Card as CardT, CardStatus, Difficulty, Problem } from '../engine/types';

interface ProblemsScreenProps {
  onOpenProblem: (p: Problem) => void;
}

interface EnrichedProblem extends Problem {
  card: CardT;
}

export function ProblemsScreen({ onOpenProblem }: ProblemsScreenProps) {
  const { problems, cards, ready } = useAppData();

  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [diffFilter, setDiffFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const enriched: EnrichedProblem[] = useMemo(() => {
    if (!problems || !cards) return [];
    const byId = new Map(cards.map((c) => [c.problem_id, c]));
    return problems.map((p) => ({ ...p, card: byId.get(p.id)! }));
  }, [problems, cards]);

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
      if (q && !p.title.toLowerCase().includes(q) && !p.topic.toLowerCase().includes(q))
        return false;
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
    return topics.filter((t) => byTopic.has(t.id)).map((t) => ({
      topic: t,
      items: byTopic.get(t.id)!.sort((a, b) => a.order_index - b.order_index),
    }));
  }, [filtered, topics]);

  const total = enriched.length;
  const masteredAll = enriched.filter((p) => p.card.status === 'mastered').length;
  const solvedAll = enriched.filter((p) => p.card.times_solved > 0).length;

  function toggleTopic(id: string) {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function clearAllFilters() {
    setSearch('');
    setTopicFilter('all');
    setDiffFilter('all');
    setStatusFilter('all');
  }

  const anyFilter =
    search || topicFilter !== 'all' || diffFilter !== 'all' || statusFilter !== 'all';

  if (!ready) {
    return (
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 text-ink3 dark:text-mist2">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-6 sm:pt-10 pb-32">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">All problems</h1>
          <p className="text-ink2 dark:text-mist mt-1 text-sm">
            <span className="tnum font-medium text-ink dark:text-paper">{solvedAll}</span> solved ·{' '}
            <span className="tnum font-medium text-ink dark:text-paper">{masteredAll}</span>{' '}
            mastered · <span className="tnum">{total}</span> total ·{' '}
            <span className="tnum">{topics.length}</span> topics
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-ink3 dark:text-mist2">
          <I.Layers size={14} /> Roadmap order
        </div>
      </div>

      <Card className="px-3 py-3 mb-5">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <I.Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 dark:text-mist2 pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search problems or topics…"
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-paper2 dark:bg-night2 border border-hairline dark:border-night3 outline-none focus:ring-2 focus:ring-accent/25 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Topic"
              value={topicFilter}
              onChange={setTopicFilter}
              options={[
                { v: 'all', l: 'All topics' },
                ...topics.map((t) => ({ v: t.id, l: t.name })),
              ]}
            />
            <FilterSelect
              label="Difficulty"
              value={diffFilter}
              onChange={setDiffFilter}
              options={[
                { v: 'all', l: 'All' },
                { v: 'easy', l: 'Easy' },
                { v: 'medium', l: 'Medium' },
                { v: 'hard', l: 'Hard' },
              ]}
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { v: 'all', l: 'All' },
                { v: 'new', l: 'New' },
                { v: 'active', l: 'Active' },
                { v: 'mastered', l: 'Mastered' },
                { v: 'suspended', l: 'Suspended' },
              ]}
            />
            {anyFilter && (
              <button
                onClick={clearAllFilters}
                className="ml-auto text-xs text-ink3 dark:text-mist2 hover:text-accent inline-flex items-center gap-1.5"
              >
                <I.X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </Card>

      {grouped.length === 0 ? (
        <EmptyFilter onClear={clearAllFilters} />
      ) : (
        <div className="flex flex-col gap-3">
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-ink3 dark:text-mist2">
      <span>{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none h-8 pl-3 pr-7 rounded-lg border border-hairline dark:border-night3 text-sm outline-none focus:ring-2 focus:ring-accent/25"
        >
          {options.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
        <I.ChevD
          size={13}
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-ink3 dark:text-mist2"
        />
      </div>
    </label>
  );
}

function TopicGroup({
  topic,
  items,
  collapsed,
  onToggle,
  onOpenProblem,
}: {
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
        className="w-full grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-paper/60 dark:hover:bg-night/40 transition-colors"
      >
        <span className="text-ink3 dark:text-mist2">
          {collapsed ? <I.ChevR size={16} /> : <I.ChevD size={16} />}
        </span>
        <div className="text-left min-w-0">
          <div className="font-medium truncate">{topic.name}</div>
          <div className="text-xs text-ink3 dark:text-mist2 tnum mt-0.5">
            {mastered}/{items.length} mastered
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="w-32 h-1.5 rounded-full bg-paper3 dark:bg-night3 overflow-hidden">
            <div className="barfill h-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <span className="tnum text-xs text-ink3 dark:text-mist2 w-8 text-right">{pct}%</span>
        </div>
        <span className="text-xs text-ink3 dark:text-mist2 tnum">{items.length}</span>
      </button>
      {!collapsed && (
        <div className="border-t border-hairline dark:border-night3 divide-y divide-hairline/70 dark:divide-night3/70">
          {items.map((p) => (
            <ProblemRow key={p.id} p={p} onOpen={() => onOpenProblem(p)} />
          ))}
        </div>
      )}
    </Card>
  );
}

function ProblemRow({ p, onOpen }: { p: EnrichedProblem; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_70px_120px_90px_90px_24px] items-center gap-3 px-4 sm:px-5 py-3 text-left hover:bg-paper/50 dark:hover:bg-night/40 transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-sm font-medium">{p.title}</span>
        </div>
        <div className="text-xs text-ink3 dark:text-mist2 mt-0.5 sm:hidden">
          <StatusBadge value={p.card.status as CardStatus} compact /> ·{' '}
          <span className="tnum">{p.card.times_solved}×</span> · {relDue(p.card.due)}
        </div>
      </div>
      <div className="justify-self-start">
        <DiffPill value={p.difficulty as Difficulty} />
      </div>
      <div className="hidden sm:block">
        <StatusBadge value={p.card.status as CardStatus} />
      </div>
      <div className="hidden sm:block text-xs text-ink3 dark:text-mist2 tnum">
        {p.card.times_solved}× solved
      </div>
      <div className="hidden sm:block text-xs text-ink3 dark:text-mist2">
        {relDue(p.card.due)}
      </div>
      <I.ChevR size={14} className="hidden sm:block text-ink3 dark:text-mist2" />
    </button>
  );
}

function EmptyFilter({ onClear }: { onClear: () => void }) {
  return (
    <Card className="px-10 py-14 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-paper3 dark:bg-night3 text-ink3 dark:text-mist2 mb-4">
        <I.Search size={20} />
      </div>
      <div className="font-medium">No problems match those filters.</div>
      <div className="text-sm text-ink3 dark:text-mist2 mt-1">
        Try widening your search or status filter.
      </div>
      <Btn variant="outline" className="mt-5" onClick={onClear}>
        <I.X size={14} /> Clear filters
      </Btn>
    </Card>
  );
}
