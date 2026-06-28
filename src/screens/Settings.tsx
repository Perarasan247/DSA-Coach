import { useEffect, useRef, useState } from 'react';
import { supabase } from '../db/supabase';
import { I } from '../components/icons';
import { Btn, Card } from '../components/ui';
import { exportAll, importAll, resetAll } from '../db/db';
import { useAppCtx } from '../lib/AppContext';
import { useSaveSettings, useSettings } from '../lib/store';

interface SettingsScreenProps {
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
}

const EXTERNAL_SHEETS = [
  {
    name: "Fraz's 170 DSA Sheet",
    desc: 'LeetCode DSA sheet for cracking FAANG',
    url: 'https://github.com/gouravkhator/boat-to-cp/blob/main/Leetcode%20DSA%20sheet%20by%20Fraz%20For%20Cracking%20FAANG.pdf',
  },
  {
    name: "DSA Sheet by Arsh",
    desc: '45-day DSA challenge spreadsheet',
    url: 'https://docs.google.com/spreadsheets/d/1MGVBJ8HkRbCnU6EQASjJKCqQE8BWng4qgL0n3vCVOxE/edit?usp=sharing',
  },
  {
    name: "DSA by Shradha Ma'am",
    desc: 'Curated DSA practice sheet',
    url: 'https://docs.google.com/spreadsheets/d/1hXserPuxVoWMG9Hs7y8wVdRCJTcj3xMBAEYUOXQ5Xag/edit?usp=sharing',
  },
];

export function SettingsScreen({ theme, setTheme }: SettingsScreenProps) {
  const settings = useSettings();
  const { sheets, user } = useAppCtx();
  const saveSettings = useSaveSettings();

  const [pace, setPace] = useState(5);
  const [ceiling, setCeiling] = useState(7);
  const [activeSheet, setActiveSheet] = useState('arasu');
  const [status, setStatus] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settings) return;
    setPace(settings.target);
    setCeiling(settings.ceiling);
    setActiveSheet(settings.active_sheet_id);
  }, [settings]);

  // Debounce pace/ceiling saves
  useEffect(() => {
    if (!settings) return;
    if (settings.target === pace && settings.ceiling === ceiling) return;
    const t = setTimeout(() => saveSettings({ target: pace, ceiling }), 400);
    return () => clearTimeout(t);
  }, [pace, ceiling, settings, saveSettings]);

  async function handleSheetChange(sheetId: string) {
    setActiveSheet(sheetId);
    await saveSettings({ active_sheet_id: sheetId });
    flash('Active sheet updated. Refreshing…');
  }

  function handleExport() {
    exportAll().then((json) => {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dsa-coach-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash('Exported.');
    });
  }

  function handleImport(file: File) {
    file
      .text()
      .then(importAll)
      .then(() => flash('Imported.'))
      .catch((e: Error) => flash(`Import failed: ${e.message}`));
  }

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(''), 2200);
  }

  function handleReset() {
    if (!confirm('Reset all progress? This wipes every card, review, and setting.')) return;
    resetAll().then(() => flash('Reset complete.'));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const internalSheets = sheets.length > 0
    ? sheets.filter((s) => ['arasu', 'neetcode150', 'striver_sde'].includes(s.id))
    : [
        { id: 'arasu', name: 'Arasu DSA Sheet', description: 'Curated 308-problem DSA roadmap' },
        { id: 'neetcode150', name: 'Neetcode 150', description: '150 curated LeetCode problems' },
        { id: 'striver_sde', name: "Striver's SDE Sheet", description: '191 problems for SDE interviews' },
      ];

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-6 sm:pt-10 pb-32">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-ink2 dark:text-mist mt-1 text-sm font-medium">
          {user?.email}
        </p>
      </div>

      {/* Sheet selector */}
      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-ink2 dark:text-mist font-bold mb-3">
          Active DSA Sheet
        </div>
        <div className="flex flex-col gap-2">
          {internalSheets.map((sheet) => {
            const active = activeSheet === sheet.id;
            return (
              <button
                key={sheet.id}
                onClick={() => handleSheetChange(sheet.id)}
                className={`cursor-pointer w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-200 ${
                  active
                    ? 'border-accent bg-accent/8 dark:bg-accent/12'
                    : 'border-hairline dark:border-night4 bg-[oklch(94%_0.003_280)] dark:bg-night2 hover:border-accent/40'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                    active ? 'border-accent' : 'border-hairline dark:border-night3'
                  }`}
                >
                  {active && <div className="w-2 h-2 rounded-full bg-accent" />}
                </div>
                <div className="min-w-0">
                  <div className={`font-bold text-sm ${active ? 'text-accent' : ''}`}>{sheet.name}</div>
                  {sheet.description && (
                    <div className="text-xs text-ink3 dark:text-mist2 mt-0.5 font-medium">{sheet.description}</div>
                  )}
                </div>
                {active && (
                  <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 dark:bg-accent/20 px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pace / ceiling / appearance / data / reset */}
      <Card className="divide-y divide-hairline dark:divide-night3 mb-5">
        <Setting
          label="Pace target"
          desc="How many problems you aim to clear each day."
          control={
            <Stepper value={pace} min={1} max={ceiling} onChange={setPace} suffix="per day" />
          }
        />
        <Setting
          label="Daily ceiling"
          desc="Hard cap — the queue will never exceed this, no matter how many revisions are due."
          control={
            <Stepper
              value={ceiling}
              min={Math.max(pace, 1)}
              max={15}
              onChange={setCeiling}
              suffix="max"
            />
          }
        />
        <Setting
          label="Appearance"
          desc="Switch between light and dark."
          control={
            <div className="inline-flex rounded-xl p-1 bg-paper3/80 dark:bg-night3/80 border border-hairline dark:border-night3">
              {(
                [
                  { v: 'light', l: 'Light', i: <I.Sun size={14} /> },
                  { v: 'dark', l: 'Dark', i: <I.Moon size={14} /> },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setTheme(opt.v)}
                  className={`cursor-pointer inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    theme === opt.v
                      ? 'bg-paper dark:bg-night2 shadow-sm text-ink dark:text-paper'
                      : 'text-ink3 dark:text-mist2 hover:text-ink dark:hover:text-paper'
                  }`}
                >
                  {opt.i} {opt.l}
                </button>
              ))}
            </div>
          }
        />
        <Setting
          label="Data"
          desc="Export your full history as JSON, or import from a backup."
          control={
            <div className="flex gap-2">
              <Btn variant="outline" size="sm" onClick={handleExport}>
                <I.Download size={14} /> Export
              </Btn>
              <Btn variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <I.Upload size={14} /> Import
              </Btn>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.target.value = '';
                }}
              />
            </div>
          }
        />
        <Setting
          label="Reset"
          desc="Clear all your cards and reviews, start fresh with the active sheet."
          control={
            <Btn
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-[oklch(55%_0.18_25)] border-[oklch(80%_0.08_25)] hover:bg-[oklch(97%_0.03_25)] dark:hover:bg-[oklch(22%_0.05_25)] dark:border-[oklch(36%_0.1_25)] dark:text-[oklch(75%_0.14_25)]"
            >
              <I.X size={14} /> Reset all
            </Btn>
          }
        />
      </Card>

      {status && (
        <div className="mb-5 text-center text-xs text-accent font-semibold bg-accent/10 dark:bg-accent/15 px-4 py-2 rounded-xl">
          {status}
        </div>
      )}

      {/* External sheets */}
      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-ink2 dark:text-mist font-bold mb-3">
          More DSA Sheets (External)
        </div>
        <Card className="divide-y divide-hairline dark:divide-night3">
          {EXTERNAL_SHEETS.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-4 hover:bg-paper/60 dark:hover:bg-night/50 transition-colors duration-150 group"
            >
              <I.BookOpen size={16} className="shrink-0 text-ink3 dark:text-mist2" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm group-hover:text-accent transition-colors">{s.name}</div>
                <div className="text-xs text-ink3 dark:text-mist2 mt-0.5 font-medium">{s.desc}</div>
              </div>
              <I.External size={14} className="shrink-0 text-ink3 dark:text-mist2 group-hover:text-accent transition-colors" />
            </a>
          ))}
        </Card>
      </div>

      {/* Scheduling info card */}
      <Card className="px-5 py-5 border-accent/20 mb-5">
        <div className="flex items-start gap-4">
          <div
            className="shrink-0 w-10 h-10 rounded-xl text-white inline-flex items-center justify-center shadow-glow-sm"
            style={{
              background: 'linear-gradient(135deg, oklch(65% 0.22 290), oklch(52% 0.24 290))',
            }}
          >
            <I.Calendar size={17} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold">Smart scheduling</div>
            <div className="text-xs text-ink3 dark:text-mist2 mt-1 leading-relaxed font-medium">
              Each rating reschedules the next revision.{' '}
              <span className="text-fluentDk dark:text-[oklch(82%_0.12_150)] font-bold">Fluent</span>{' '}
              doubles the interval (8 → 16 → 32 …); after three Fluents in a row the card is offered up
              to be mastered.{' '}
              <span className="text-stuckDk dark:text-[oklch(85%_0.12_65)] font-bold">Stuck</span>{' '}
              and Shaky reset the streak and pull the next revision back.
            </div>
          </div>
        </div>
      </Card>

      {/* Sign out */}
      <div className="flex justify-center">
        <Btn variant="ghost" size="sm" onClick={handleSignOut} className="text-ink3 dark:text-mist2">
          <I.LogOut size={14} /> Sign out
        </Btn>
      </div>

      <div className="text-center text-[11px] text-ink3 dark:text-mist2 mt-6 font-medium">
        DSA Coach · v0.2
      </div>
    </div>
  );
}

function Setting({
  label,
  desc,
  control,
}: {
  label: string;
  desc: string;
  control: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 sm:py-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start sm:items-center gap-3">
      <div>
        <div className="font-bold text-sm">{label}</div>
        <div className="text-xs text-ink3 dark:text-mist2 mt-1 max-w-md leading-relaxed font-medium">
          {desc}
        </div>
      </div>
      <div className="justify-self-start sm:justify-self-end">{control}</div>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="press cursor-pointer w-9 h-9 rounded-xl border border-hairline dark:border-night3 hover:bg-paper3 dark:hover:bg-night3 inline-flex items-center justify-center text-ink2 dark:text-mist disabled:opacity-30 transition-all duration-200 font-bold"
        disabled={value <= min}
        aria-label="Decrease"
      >
        <I.Minus size={15} />
      </button>
      <div className="inline-flex items-baseline gap-1.5 min-w-[5.5rem] justify-center">
        <span className="text-2xl font-extrabold tnum">{value}</span>
        <span className="text-xs text-ink3 dark:text-mist2 font-semibold">{suffix}</span>
      </div>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="press cursor-pointer w-9 h-9 rounded-xl border border-hairline dark:border-night3 hover:bg-paper3 dark:hover:bg-night3 inline-flex items-center justify-center text-ink2 dark:text-mist disabled:opacity-30 transition-all duration-200"
        disabled={value >= max}
        aria-label="Increase"
      >
        <I.Plus size={15} />
      </button>
    </div>
  );
}
