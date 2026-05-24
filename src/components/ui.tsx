import type { ReactNode } from 'react';
import { I } from './icons';
import type { CardStatus, Difficulty, Rating } from '../engine/types';

// ---------- Difficulty pill — always neutral, never accent/fluency ----------
export function DiffPill({ value }: { value: Difficulty }) {
  const cls = {
    easy: 'bg-paper2 text-ink2 dark:bg-night2 dark:text-mist',
    medium: 'bg-paper3 text-ink2 dark:bg-night3 dark:text-mist',
    hard: 'bg-[oklch(86%_0.012_75)] text-ink dark:bg-[oklch(30%_0.012_270)] dark:text-paper',
  }[value];
  const label = value[0].toUpperCase() + value.slice(1);
  return <span className={`pill-diff ${cls}`}>{label}</span>;
}

// ---------- Status badge (different palette from fluency) ----------
export function StatusBadge({ value, compact = false }: { value: CardStatus; compact?: boolean }) {
  const map: Record<CardStatus, { dot: string; label: string }> = {
    new: { dot: 'bg-mist', label: 'New' },
    active: { dot: 'bg-accent', label: 'Active' },
    mastered: { dot: 'bg-[oklch(45%_0.18_290)]', label: 'Mastered' },
    suspended: { dot: 'bg-[oklch(60%_0.16_25)]', label: 'Suspended' },
  };
  const m = map[value];
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${
        compact ? 'text-[11px]' : 'text-xs'
      } text-ink2 dark:text-mist`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

// ---------- Soft Card ----------
interface CardProps {
  className?: string;
  children: ReactNode;
}
export function Card({ className = '', children }: CardProps) {
  return (
    <div
      className={`bg-paper2/70 dark:bg-night2/70 backdrop-blur-sm border border-hairline dark:border-night3 rounded-2xl shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

// ---------- Button ----------
type BtnVariant = 'primary' | 'ghost' | 'outline' | 'soft';
type BtnSize = 'sm' | 'md' | 'lg';
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
}
export function Btn({ variant = 'ghost', size = 'md', className = '', children, ...rest }: BtnProps) {
  const sizes: Record<BtnSize, string> = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-base',
  };
  const variants: Record<BtnVariant, string> = {
    primary:
      'bg-accent text-white hover:brightness-110 active:brightness-95 shadow-[0_6px_20px_-8px_oklch(60%_0.2_290/.6)]',
    ghost: 'bg-transparent text-ink2 dark:text-mist hover:bg-paper3/60 dark:hover:bg-night3/60',
    outline:
      'bg-transparent border border-hairline dark:border-night3 text-ink dark:text-paper hover:bg-paper2 dark:hover:bg-night2',
    soft: 'bg-paper3/70 dark:bg-night3/70 text-ink dark:text-paper hover:bg-paper3 dark:hover:bg-night3',
  };
  return (
    <button
      className={`press inline-flex items-center gap-2 rounded-xl font-medium transition-all ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------- Fluency buttons (hero action) ----------
export const FLUENCY: Array<{
  key: Rating;
  label: string;
  hint: string;
  desc: string;
  cls: string;
  dot: string;
}> = [
  {
    key: 'stuck',
    label: 'Stuck',
    hint: '1',
    desc: "Couldn't solve without a reference",
    cls:
      'border-stuck/40 bg-stuckBg text-stuckDk hover:bg-[oklch(94%_0.05_65)] dark:bg-[oklch(26%_0.06_55)] dark:text-[oklch(90%_0.1_65)] dark:border-[oklch(40%_0.1_55)]',
    dot: 'bg-stuck',
  },
  {
    key: 'shaky',
    label: 'Shaky',
    hint: '2',
    desc: 'Solved it but struggled',
    cls:
      'border-shaky/40 bg-shakyBg text-shakyDk hover:bg-[oklch(94%_0.04_235)] dark:bg-[oklch(26%_0.07_235)] dark:text-[oklch(86%_0.1_235)] dark:border-[oklch(40%_0.1_235)]',
    dot: 'bg-shaky',
  },
  {
    key: 'fluent',
    label: 'Fluent',
    hint: '3',
    desc: 'Solved smoothly and confidently',
    cls:
      'border-fluent/40 bg-fluentBg text-fluentDk hover:bg-[oklch(94%_0.05_150)] dark:bg-[oklch(26%_0.06_150)] dark:text-[oklch(86%_0.1_150)] dark:border-[oklch(40%_0.1_150)]',
    dot: 'bg-fluent',
  },
];

export function FluencyButtons({
  onPick,
  picked,
  compact = false,
}: {
  onPick: (r: Rating) => void;
  picked?: Rating | null;
  compact?: boolean;
}) {
  return (
    <div className={`grid grid-cols-3 gap-2.5 ${compact ? '' : 'sm:gap-3'}`}>
      {FLUENCY.map((f) => {
        const active = picked === f.key;
        return (
          <button
            key={f.key}
            onClick={() => onPick(f.key)}
            className={`press group relative rounded-2xl border-2 ${f.cls} ${
              active ? 'ring-2 ring-offset-2 ring-offset-paper dark:ring-offset-night ring-current' : ''
            } transition-all ${compact ? 'p-3' : 'p-4'} text-left`}
          >
            <div className="flex items-start justify-between">
              <div className={`flex items-center gap-2 ${compact ? '' : 'mb-1'}`}>
                <span
                  className={`inline-block ${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-full ${f.dot}`}
                />
                <span className={`font-semibold ${compact ? 'text-sm' : 'text-base sm:text-lg'}`}>
                  {f.label}
                </span>
              </div>
              <span className="kbd">{f.hint}</span>
            </div>
            {!compact && <div className="text-xs leading-snug opacity-75 mt-1">{f.desc}</div>}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Daily progress ring ----------
export function Ring({
  done,
  total,
  size = 92,
  stroke = 9,
}: {
  done: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 1 : done / total;
  const dash = c * pct;
  const cleared = done >= total && total > 0;
  const gradId = `ringGrad-${size}`;
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .7s cubic-bezier(.22,1,.36,1)' }}
        />
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(72% 0.18 290)" />
            <stop offset="100%" stopColor="oklch(55% 0.22 290)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {cleared ? (
          <I.Check size={Math.round(size * 0.32)} className="text-accent" stroke={2.4} />
        ) : (
          <>
            <div
              className="tnum font-semibold leading-none"
              style={{ fontSize: Math.max(13, size * 0.22) }}
            >
              {done}
              <span className="text-ink3 dark:text-mist2 font-normal">/{total}</span>
            </div>
            {size >= 60 && (
              <div className="text-[10px] uppercase tracking-wider mt-1 text-ink3 dark:text-mist2">
                today
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Streak chip ----------
export function StreakChip({ days }: { days: number }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 h-9 rounded-full border border-hairline dark:border-night3 bg-paper2/60 dark:bg-night2/60">
      <I.Flame size={15} className="text-[oklch(65%_0.18_55)]" />
      <span className="tnum font-semibold text-sm">{days}</span>
      <span className="text-xs text-ink3 dark:text-mist2">day streak</span>
    </div>
  );
}

// ---------- Date helpers ----------
export function formatDate(d: Date, opts?: Intl.DateTimeFormatOptions): string {
  const f = new Intl.DateTimeFormat(
    'en-US',
    opts ?? { weekday: 'long', month: 'long', day: 'numeric' },
  );
  return f.format(d);
}

export function shortDate(d: Date | string): string {
  const date = typeof d === 'string' ? parseDayKey(d) : d;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function parseDayKey(k: string): Date {
  const [y, m, dd] = k.split('-').map(Number);
  return new Date(y, m - 1, dd);
}

export function relDue(d: string | null): string {
  if (!d) return '—';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = parseDayKey(d);
  const diff = Math.round((dd.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${-diff}d overdue`;
  if (diff < 7) return `in ${diff}d`;
  return shortDate(d);
}

// ---------- Confetti burst ----------
export function Confetti({ trigger }: { trigger: number }) {
  if (!trigger) return null;
  const pieces = Array.from({ length: 26 }, (_, i) => {
    const hue = [55, 150, 235, 290][i % 4];
    const dx = (Math.random() - 0.5) * 360;
    const rot = Math.random() * 1080 - 540;
    const delay = Math.random() * 0.2;
    return (
      <span
        key={`${trigger}-${i}`}
        className="confetti-piece"
        style={
          {
            left: '50%',
            top: '0%',
            background: `oklch(70% 0.18 ${hue})`,
            ['--dx' as any]: `${dx}px`,
            ['--rot' as any]: `${rot}deg`,
            animationDelay: `${delay}s`,
          } as React.CSSProperties
        }
      />
    );
  });
  return <div className="pointer-events-none absolute inset-0 overflow-visible">{pieces}</div>;
}
