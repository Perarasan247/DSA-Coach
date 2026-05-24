import { useEffect, useRef, useState } from 'react';
import { I } from '../components/icons';
import { Btn, Card } from '../components/ui';
import { exportAll, importAll, resetAll } from '../db/db';
import { saveSettings, useSettings } from '../lib/store';

interface SettingsScreenProps {
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
}

export function SettingsScreen({ theme, setTheme }: SettingsScreenProps) {
  const settings = useSettings();
  const [pace, setPace] = useState(5);
  const [ceiling, setCeiling] = useState(7);
  const [status, setStatus] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settings) return;
    setPace(settings.target);
    setCeiling(settings.ceiling);
  }, [settings]);

  useEffect(() => {
    if (settings && (settings.target !== pace || settings.ceiling !== ceiling)) {
      saveSettings({ target: pace, ceiling });
    }
  }, [pace, ceiling, settings]);

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
      .catch((e) => flash(`Import failed: ${e.message}`));
  }

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(''), 2200);
  }

  function handleReset() {
    if (!confirm('Reset all progress? This wipes every card, review, and setting.')) return;
    resetAll().then(() => flash('Reset.'));
  }

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-6 sm:pt-10 pb-32">
      <div className="mb-7">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Settings</h1>
        <p className="text-ink2 dark:text-mist mt-1 text-sm">Tune the pace. Keep it sustainable.</p>
      </div>

      <Card className="divide-y divide-hairline dark:divide-night3">
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
            <div className="inline-flex rounded-xl p-1 bg-paper3/70 dark:bg-night3/70 border border-hairline dark:border-night3">
              {(
                [
                  { v: 'light', l: 'Light', i: <I.Sun size={14} /> },
                  { v: 'dark', l: 'Dark', i: <I.Moon size={14} /> },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setTheme(opt.v)}
                  className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm font-medium transition-all ${
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
          desc="Export your full history as JSON, or import from another device."
          control={
            <div className="flex gap-2">
              <Btn variant="outline" size="sm" onClick={handleExport}>
                <I.Download size={14} /> Export
              </Btn>
              <Btn
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
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
          desc="Clear all progress and re-seed problems from the default catalog."
          control={
            <Btn variant="outline" size="sm" onClick={handleReset}>
              <I.X size={14} /> Reset all
            </Btn>
          }
        />
      </Card>

      {status && (
        <div className="mt-4 text-center text-xs text-accent">{status}</div>
      )}

      <Card className="px-5 py-5 mt-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-accent3 dark:bg-[oklch(28%_0.08_290)] text-accent inline-flex items-center justify-center">
            <I.Calendar size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">Smart scheduling</div>
            <div className="text-xs text-ink3 dark:text-mist2 mt-0.5">
              Each rating reschedules the next revision.{' '}
              <span className="text-fluentDk dark:text-[oklch(86%_0.1_150)]">Fluent</span> doubles
              the interval (8 → 16 → 32 …); after three Fluents in a row the card is offered up to
              be mastered.{' '}
              <span className="text-stuckDk dark:text-[oklch(90%_0.1_65)]">Stuck</span> and Shaky
              reset the streak and pull the next revision back.
            </div>
          </div>
        </div>
      </Card>

      <div className="text-center text-[11px] text-ink3 dark:text-mist2 mt-8">
        DSA Coach · v0.1
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
        <div className="font-medium">{label}</div>
        <div className="text-xs text-ink3 dark:text-mist2 mt-1 max-w-md leading-relaxed">
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
        className="press w-8 h-8 rounded-lg border border-hairline dark:border-night3 hover:bg-paper3 dark:hover:bg-night3 inline-flex items-center justify-center text-ink2 dark:text-mist disabled:opacity-30"
        disabled={value <= min}
      >
        <I.Minus size={14} />
      </button>
      <div className="inline-flex items-baseline gap-1.5 min-w-[5.5rem] justify-center">
        <span className="text-2xl font-semibold tnum">{value}</span>
        <span className="text-xs text-ink3 dark:text-mist2">{suffix}</span>
      </div>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="press w-8 h-8 rounded-lg border border-hairline dark:border-night3 hover:bg-paper3 dark:hover:bg-night3 inline-flex items-center justify-center text-ink2 dark:text-mist disabled:opacity-30"
        disabled={value >= max}
      >
        <I.Plus size={14} />
      </button>
    </div>
  );
}
