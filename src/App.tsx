import { useEffect, useState } from 'react';
import { AuthScreen } from './auth/AuthScreen';
import { I } from './components/icons';
import { Ring } from './components/ui';
import type { Problem } from './engine/types';
import { AppProvider, useAppCtx } from './lib/AppContext';
import { useTodayQueue, useUndoLastRating } from './lib/store';
import { CalendarScreen } from './screens/Calendar';
import { ProblemDetail } from './screens/ProblemDetail';
import { ProblemsScreen } from './screens/Problems';
import { SettingsScreen } from './screens/Settings';
import { StatsScreen } from './screens/Stats';
import { TodayScreen } from './screens/Today';

type Tab = 'today' | 'problems' | 'stats' | 'calendar' | 'settings';

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

function AppInner() {
  const { user, ready } = useAppCtx();
  const undoLastRating = useUndoLastRating();

  const [tab, setTab] = useState<Tab>('today');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('dsa-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [openProblem, setOpenProblem] = useState<Problem | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
    localStorage.setItem('dsa-theme', theme);
  }, [theme]);

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
  }, [undoLastRating]);

  // Not yet authenticated
  if (user === null && !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-glow">
            <span className="font-bold text-sm tracking-tight text-white">DSA</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  // Authenticated but data still loading
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-glow">
            <span className="font-bold text-sm tracking-tight text-white">DSA</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Sidebar tab={tab} setTab={setTab} theme={theme} setTheme={setTheme} />

      <main className="flex-1 min-w-0 lg:overflow-y-auto">
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
  const { user, settings } = useAppCtx();
  const remaining = queue?.items.length ?? 0;

  const items: { v: Tab; l: string; i: typeof I.Today; badge: number | null }[] = [
    { v: 'today', l: 'Today', i: I.Today, badge: remaining > 0 ? remaining : null },
    { v: 'problems', l: 'All problems', i: I.List, badge: null },
    { v: 'stats', l: 'Progress', i: I.Stats, badge: null },
    { v: 'calendar', l: 'Calendar', i: I.Calendar, badge: null },
    { v: 'settings', l: 'Settings', i: I.Settings, badge: null },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-62 shrink-0 border-r border-hairline dark:border-night3 bg-paper/80 dark:bg-night/90 backdrop-blur-xl sticky top-0 h-screen">
      {/* Logo */}
      <div className="px-5 pt-7 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="relative w-10 h-10 rounded-xl inline-flex items-center justify-center shadow-glow"
            style={{
              background: 'linear-gradient(135deg, oklch(65% 0.22 290), oklch(52% 0.24 290))',
            }}
          >
            <span className="font-extrabold text-sm tracking-tighter text-white">DSA</span>
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sm tracking-tight">DSA Coach</div>
            <div className="text-[10px] text-ink3 dark:text-mist2 font-medium mt-0.5 truncate max-w-[100px]">
              {user?.email?.split('@')[0]}
            </div>
          </div>
        </div>
        {settings.active_sheet_id && (
          <div className="mt-2 text-[10px] text-ink3 dark:text-mist2 font-medium px-0.5">
            Active: <span className="text-accent font-semibold">
              {settings.active_sheet_id === 'arasu' ? 'Arasu DSA Sheet' :
               settings.active_sheet_id === 'neetcode150' ? 'Neetcode 150' :
               settings.active_sheet_id === 'striver_sde' ? "Striver's SDE" :
               settings.active_sheet_id}
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="px-3 flex-1 flex flex-col gap-0.5">
        {items.map((it) => {
          const active = tab === it.v;
          const Icon = it.i;
          return (
            <button
              key={it.v}
              onClick={() => setTab(it.v)}
              className={`group relative w-full flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                active
                  ? 'bg-accent text-white shadow-glow-sm'
                  : 'text-ink2 dark:text-mist hover:bg-paper3/80 dark:hover:bg-night3/70 hover:text-ink dark:hover:text-paper'
              }`}
            >
              <Icon
                size={17}
                className={`shrink-0 transition-colors ${active ? 'text-white' : 'text-ink3 dark:text-mist2 group-hover:text-ink dark:group-hover:text-paper'}`}
              />
              <span className="flex-1 text-left">{it.l}</span>
              {it.badge != null && (
                <span
                  className={`tnum text-[11px] px-1.5 h-5 inline-flex items-center justify-center rounded-full font-semibold ${
                    active
                      ? 'bg-white/25 text-white'
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

      {/* Daily progress card */}
      <div className="px-3 pb-3">
        <div className="rounded-xl border border-hairline dark:border-night3 bg-paper2/60 dark:bg-night2/60 p-3.5">
          <div className="flex items-center gap-3">
            <div className="text-accent dark:text-accent2 shrink-0">
              <Ring done={0} total={remaining === 0 ? 1 : remaining} size={46} stroke={4.5} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-ink3 dark:text-mist2 font-medium uppercase tracking-wider">
                Today
              </div>
              <div className="text-sm font-semibold leading-tight tnum mt-0.5">
                {remaining > 0 ? (
                  <>{remaining} <span className="text-ink3 dark:text-mist2 font-normal">left</span></>
                ) : (
                  <span className="text-fluent dark:text-[oklch(75%_0.15_150)]">All clear</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-hairline dark:border-night3 flex items-center justify-between">
        <span className="text-[11px] text-ink3 dark:text-mist2 font-medium">v0.2</span>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="press cursor-pointer w-8 h-8 rounded-lg hover:bg-paper3 dark:hover:bg-night3 inline-flex items-center justify-center text-ink2 dark:text-mist transition-colors duration-200"
          title="Toggle theme"
          aria-label="Toggle light/dark theme"
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
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-hairline dark:border-night3 bg-paper/92 dark:bg-night/90 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const active = tab === it.v;
          const Icon = it.i;
          return (
            <button
              key={it.v}
              onClick={() => setTab(it.v)}
              className="press cursor-pointer relative flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full bg-accent"
                  style={{ boxShadow: '0 0 8px oklch(60% 0.2 290 / 0.6)' }}
                />
              )}
              <Icon
                size={21}
                className={`transition-all duration-200 ${
                  active ? 'text-accent scale-110' : 'text-ink3 dark:text-mist2'
                }`}
              />
              <span
                className={`text-[10px] font-semibold tracking-wide transition-colors ${
                  active ? 'text-accent' : 'text-ink3 dark:text-mist2'
                }`}
              >
                {it.l}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
