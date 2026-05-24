import { useEffect, useState } from 'react';
import { I } from './components/icons';
import { Ring } from './components/ui';
import { ensureSeeded } from './db/db';
import type { Problem } from './engine/types';
import { useTodayQueue, undoLastRating } from './lib/store';
import { CalendarScreen } from './screens/Calendar';
import { ProblemDetail } from './screens/ProblemDetail';
import { ProblemsScreen } from './screens/Problems';
import { SettingsScreen } from './screens/Settings';
import { StatsScreen } from './screens/Stats';
import { TodayScreen } from './screens/Today';

type Tab = 'today' | 'problems' | 'stats' | 'calendar' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('dsa-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [openProblem, setOpenProblem] = useState<Problem | null>(null);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    ensureSeeded().then(() => setSeeded(true));
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
    localStorage.setItem('dsa-theme', theme);
  }, [theme]);

  // Global cmd/ctrl-Z = undo last rating
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undoLastRating();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!seeded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink3 dark:text-mist2 text-sm">
        Initializing…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Sidebar tab={tab} setTab={setTab} theme={theme} setTheme={setTheme} />

      <main className="flex-1 min-w-0">
        {tab === 'today' && <TodayScreen onOpenProblem={setOpenProblem} />}
        {tab === 'problems' && <ProblemsScreen onOpenProblem={setOpenProblem} />}
        {tab === 'stats' && <StatsScreen />}
        {tab === 'calendar' && <CalendarScreen onOpenProblem={setOpenProblem} />}
        {tab === 'settings' && <SettingsScreen theme={theme} setTheme={setTheme} />}
      </main>

      <MobileTabBar tab={tab} setTab={setTab} />

      {openProblem && (
        <ProblemDetail problem={openProblem} onClose={() => setOpenProblem(null)} />
      )}
    </div>
  );
}

function Sidebar({
  tab,
  setTab,
  theme,
  setTheme,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
}) {
  const queue = useTodayQueue();
  const remaining = queue?.items.length ?? 0;

  const items: { v: Tab; l: string; i: typeof I.Today; badge: number | null }[] = [
    { v: 'today', l: 'Today', i: I.Today, badge: remaining > 0 ? remaining : null },
    { v: 'problems', l: 'All problems', i: I.List, badge: null },
    { v: 'stats', l: 'Progress', i: I.Stats, badge: null },
    { v: 'calendar', l: 'Calendar', i: I.Calendar, badge: null },
    { v: 'settings', l: 'Settings', i: I.Settings, badge: null },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-hairline dark:border-night3 bg-paper2/40 dark:bg-night2/40 backdrop-blur-sm sticky top-0 h-screen">
      <div className="px-5 pt-7 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-accent text-white inline-flex items-center justify-center shadow-[0_6px_18px_-6px_oklch(60%_0.2_290/.6)]">
            <span className="font-semibold text-sm tracking-tight">DSA</span>
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm tracking-tight">DSA Coach</div>
            <div className="text-[11px] text-ink3 dark:text-mist2">spaced repetition</div>
          </div>
        </div>
      </div>

      <nav className="px-3 flex-1 flex flex-col gap-1">
        {items.map((it) => {
          const Active = tab === it.v;
          const Icon = it.i;
          return (
            <button
              key={it.v}
              onClick={() => setTab(it.v)}
              className={`group relative w-full flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium transition-all ${
                Active
                  ? 'bg-paper dark:bg-night3 text-ink dark:text-paper shadow-sm'
                  : 'text-ink2 dark:text-mist hover:bg-paper/50 dark:hover:bg-night2/60'
              }`}
            >
              <Icon size={17} className={Active ? 'text-accent' : 'text-ink3 dark:text-mist2'} />
              <span className="flex-1 text-left">{it.l}</span>
              {it.badge != null && (
                <span
                  className={`tnum text-[11px] px-1.5 h-5 inline-flex items-center justify-center rounded-full font-semibold ${
                    Active
                      ? 'bg-accent text-white'
                      : 'bg-accent/15 text-accent dark:bg-accent/20'
                  }`}
                >
                  {it.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3">
        <div className="rounded-xl border border-hairline dark:border-night3 bg-paper/60 dark:bg-night/40 p-3">
          <div className="flex items-center gap-3">
            <div className="text-accent dark:text-accent2">
              <Ring done={0} total={remaining === 0 ? 1 : remaining} size={48} stroke={5} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-ink3 dark:text-mist2">Today</div>
              <div className="text-sm font-medium leading-tight tnum">{remaining} left</div>
              <div className="text-[11px] text-ink3 dark:text-mist2 mt-0.5">
                {remaining > 0 ? 'in your queue' : 'all clear ✓'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-hairline dark:border-night3 flex items-center justify-between">
        <span className="text-[11px] text-ink3 dark:text-mist2">v0.1</span>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="press w-8 h-8 rounded-lg hover:bg-paper3 dark:hover:bg-night3 inline-flex items-center justify-center text-ink2 dark:text-mist"
          title="Toggle theme"
        >
          {theme === 'dark' ? <I.Sun size={15} /> : <I.Moon size={15} />}
        </button>
      </div>
    </aside>
  );
}

function MobileTabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { v: Tab; l: string; i: typeof I.Today }[] = [
    { v: 'today', l: 'Today', i: I.Today },
    { v: 'problems', l: 'Problems', i: I.List },
    { v: 'stats', l: 'Progress', i: I.Stats },
    { v: 'calendar', l: 'Calendar', i: I.Calendar },
    { v: 'settings', l: 'Settings', i: I.Settings },
  ];
  return (
    <div
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-hairline dark:border-night3 bg-paper/90 dark:bg-night/85 backdrop-blur-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const Active = tab === it.v;
          const Icon = it.i;
          return (
            <button
              key={it.v}
              onClick={() => setTab(it.v)}
              className="press relative flex flex-col items-center justify-center gap-0.5 py-2.5"
            >
              <Icon size={20} className={Active ? 'text-accent' : 'text-ink3 dark:text-mist2'} />
              <span
                className={`text-[10px] tracking-wide ${
                  Active ? 'text-accent font-medium' : 'text-ink3 dark:text-mist2'
                }`}
              >
                {it.l}
              </span>
              {Active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
