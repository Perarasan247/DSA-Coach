import type { ReactNode } from 'react';
import { I } from './icons';
import type { CardStatus, Difficulty, Rating } from '../engine/types';

// ---------- Difficulty pill ----------
export function DiffPill({ value }: { value: Difficulty }) {
  const cls = {
    easy:
      'bg-[oklch(92%_0.055_150)] text-[oklch(30%_0.15_150)] border border-[oklch(74%_0.09_150)] ' +
      'dark:bg-[oklch(26%_0.07_150)] dark:text-[oklch(70%_0.13_150)] dark:border-[oklch(42%_0.11_150)]',
    medium:
      'bg-[oklch(93%_0.045_60)] text-[oklch(30%_0.14_55)] border border-[oklch(76%_0.08_60)] ' +
      'dark:bg-[oklch(26%_0.06_55)] dark:text-[oklch(72%_0.13_60)] dark:border-[oklch(42%_0.1_55)]',
    hard:
      'bg-[oklch(93%_0.035_20)] text-[oklch(32%_0.13_20)] border border-[oklch(76%_0.07_20)] ' +
      'dark:bg-[oklch(26%_0.05_20)] dark:text-[oklch(70%_0.11_20)] dark:border-[oklch(42%_0.09_20)]',
  }[value];
  const label = value[0].toUpperCase() + value.slice(1);
  return <span className={`pill-diff ${cls}`}>{label}</span>;
}

// ---------- Status badge ----------
export function StatusBadge({ value, compact = false }: { value: CardStatus; compact?: boolean }) {
  const map: Record<CardStatus, { dot: string; label: string }> = {
    new: { dot: 'bg-mist', label: 'New' },
    active: { dot: 'bg-accent', label: 'Active' },
    mastered: { dot: 'bg-[oklch(52%_0.18_290)]', label: 'Mastered' },
    suspended: { dot: 'bg-[oklch(60%_0.16_25)]', label: 'Suspended' },
  };
  const m = map[value];
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${
        compact ? 'text-[11px]' : 'text-xs'
      } text-ink2 dark:text-mist font-medium`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${m.dot} shrink-0`} />
      {m.label}
    </span>
  );
}

// ---------- Card ----------
interface CardProps {
  className?: string;
  children: ReactNode;
}
export function Card({ className = '', children }: CardProps) {
  return (
    <div
      className={`bg-[oklch(94%_0.003_280)] dark:bg-night2 border border-hairline dark:border-night4 rounded-2xl shadow-card dark:shadow-card-dark ${className}`}
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
      'bg-accent text-white hover:brightness-110 active:brightness-95 shadow-glow-sm font-semibold',
    ghost: 'bg-transparent text-ink2 dark:text-mist hover:bg-paper3/70 dark:hover:bg-night3/70',
    outline:
      'bg-transparent border border-hairline dark:border-night3 text-ink dark:text-paper hover:bg-paper2 dark:hover:bg-night2 font-medium',
    soft: 'bg-paper3/80 dark:bg-night3/80 text-ink dark:text-paper hover:bg-paper3 dark:hover:bg-night3 font-medium',
  };
  return (
    <button
      className={`press cursor-pointer inline-flex items-center gap-2 rounded-xl font-medium transition-all duration-200 ${sizes[size]} ${variants[variant]} ${className}`}
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
  descCls: string;
  dot: string;
  activeCls: string;
}> = [
  {
    key: 'stuck',
    label: 'Stuck',
    hint: '1',
    desc: "Couldn't solve without a reference",
    cls:
      'border-stuck/40 bg-stuckBg text-stuckDk hover:bg-[oklch(93%_0.05_65)] ' +
      'dark:bg-[oklch(26%_0.05_55)] dark:text-[oklch(90%_0.1_65)] dark:border-[oklch(45%_0.1_55)] dark:hover:bg-[oklch(30%_0.06_55)]',
    descCls: 'text-stuckDk/75 dark:text-[oklch(70%_0.07_65)]',
    dot: 'bg-stuck',
    activeCls: 'ring-2 ring-stuck/40 ring-offset-1 ring-offset-paper dark:ring-offset-night',
  },
  {
    key: 'shaky',
    label: 'Shaky',
    hint: '2',
    desc: 'Solved it but struggled',
    cls:
      'border-shaky/40 bg-shakyBg text-shakyDk hover:bg-[oklch(93%_0.03_235)] ' +
      'dark:bg-[oklch(26%_0.05_235)] dark:text-[oklch(88%_0.09_235)] dark:border-[oklch(45%_0.1_235)] dark:hover:bg-[oklch(30%_0.06_235)]',
    descCls: 'text-shakyDk/75 dark:text-[oklch(68%_0.06_235)]',
    dot: 'bg-shaky',
    activeCls: 'ring-2 ring-shaky/40 ring-offset-1 ring-offset-paper dark:ring-offset-night',
  },
  {
    key: 'fluent',
    label: 'Fluent',
    hint: '3',
    desc: 'Solved smoothly and confidently',
    cls:
      'border-fluent/40 bg-fluentBg text-fluentDk hover:bg-[oklch(93%_0.05_150)] ' +
      'dark:bg-[oklch(26%_0.05_150)] dark:text-[oklch(88%_0.1_150)] dark:border-[oklch(45%_0.1_150)] dark:hover:bg-[oklch(30%_0.06_150)]',
    descCls: 'text-fluentDk/75 dark:text-[oklch(68%_0.07_150)]',
    dot: 'bg-fluent',
    activeCls: 'ring-2 ring-fluent/40 ring-offset-1 ring-offset-paper dark:ring-offset-night',
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
            className={`press cursor-pointer group relative rounded-2xl border-2 ${f.cls} ${
              active ? f.activeCls : ''
            } transition-all duration-200 ${compact ? 'p-3' : 'p-4'} text-left`}
          >
            <div className="flex items-start justify-between">
              <div className={`flex items-center gap-2 ${compact ? '' : 'mb-1.5'}`}>
                <span
                  className={`inline-block ${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-full ${f.dot} shrink-0`}
                />
                <span className={`font-bold ${compact ? 'text-sm' : 'text-base sm:text-lg'}`}>
                  {f.label}
                </span>
              </div>
              <span className="kbd mt-0.5">{f.hint}</span>
            </div>
            {!compact && (
              <div className={`text-xs leading-snug font-medium ${f.descCls}`}>{f.desc}</div>
            )}
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
  const pct = total === 0 ? 1 : Math.min(done / total, 1);
  const dash = c * pct;
  const cleared = done >= total && total > 0;
  const gradId = `ringGrad-${size}`;
  const glowId = `ringGlow-${size}`;
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(75% 0.18 290)" />
            <stop offset="100%" stopColor="oklch(52% 0.24 290)" />
          </linearGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.1"
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
          style={{
            transition: 'stroke-dasharray .8s cubic-bezier(.22,1,.36,1)',
            filter: cleared ? `url(#${glowId})` : undefined,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {cleared ? (
          <I.Check size={Math.round(size * 0.33)} className="text-accent" stroke={2.5} />
        ) : (
          <>
            <div
              className="tnum font-bold leading-none"
              style={{ fontSize: Math.max(13, size * 0.22) }}
            >
              {done}
              <span className="text-ink3 dark:text-mist2 font-normal" style={{ fontSize: Math.max(11, size * 0.16) }}>
                /{total}
              </span>
            </div>
            {size >= 60 && (
              <div className="text-[9px] uppercase tracking-widest mt-1 text-ink3 dark:text-mist2 font-semibold">
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
    <div
      className="inline-flex items-center gap-2 px-3 h-9 rounded-full border border-hairline dark:border-night4 bg-[oklch(94%_0.003_280)] dark:bg-night3"
      style={{ boxShadow: days > 0 ? '0 0 12px oklch(65% 0.18 55 / 0.2)' : undefined }}
    >
      <I.Flame
        size={15}
        className="text-[oklch(65%_0.2_55)]"
        style={{ filter: days > 0 ? 'drop-shadow(0 0 4px oklch(68% 0.2 55 / 0.5))' : undefined }}
      />
      <span className="tnum font-bold text-sm">{days}</span>
      <span className="text-xs text-ink3 dark:text-mist font-medium">day streak</span>
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
  const pieces = Array.from({ length: 32 }, (_, i) => {
    const hue = [55, 150, 235, 290, 320][i % 5];
    const dx = (Math.random() - 0.5) * 400;
    const rot = Math.random() * 1080 - 540;
    const delay = Math.random() * 0.3;
    const size = Math.random() * 6 + 6;
    return (
      <span
        key={`${trigger}-${i}`}
        className="confetti-piece"
        style={
          {
            left: `${40 + Math.random() * 20}%`,
            top: '0%',
            width: `${size}px`,
            height: `${size * 1.6}px`,
            background: `oklch(70% 0.2 ${hue})`,
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
