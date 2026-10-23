// Small IBCS building blocks shared by table, cards and charts.

import { cn } from '@/lib/utils';

export type Scenario = 'AC' | 'FC' | 'ACFC' | 'PL' | 'PY' | 'SIM';

/** Scenario swatch in IBCS notation: AC solid, PY grey, PL outlined, FC hatched. */
export function ScenarioMark({ s, className }: { s: Scenario; className?: string }) {
  const base = 'inline-block size-[10px] shrink-0 align-middle';
  if (s === 'AC') return <span className={cn(base, 'bg-ac', className)} aria-hidden="true" />;
  if (s === 'PY') return <span className={cn(base, 'bg-py', className)} aria-hidden="true" />;
  if (s === 'PL') return <span className={cn(base, 'border-[1.5px] border-pl', className)} aria-hidden="true" />;
  if (s === 'FC') return <span className={cn(base, 'hatch border border-fc', className)} aria-hidden="true" />;
  if (s === 'SIM') return <span className={cn(base, 'hatch-sim border border-sim', className)} aria-hidden="true" />;
  return (
    <span className={cn(base, 'flex overflow-hidden border border-ac', className)} aria-hidden="true">
      <span className="h-full w-1/2 bg-ac" />
      <span className="hatch h-full w-1/2" />
    </span>
  );
}

export function ScenarioLabel({ s, label }: { s: Scenario; label?: string }) {
  const text = label ?? (s === 'ACFC' ? 'AC+FC' : s);
  return (
    <span className="inline-flex items-center gap-100 font-monospace text-100 font-medium tracking-wide">
      <ScenarioMark s={s} />
      {text}
    </span>
  );
}

/**
 * Horizontal variance bar around a zero axis. `value` is the signed (good is
 * positive) variance, `max` the shared scale of the column.
 */
export function VarianceBar({ value, max, width = 90 }: { value: number; max: number; width?: number }) {
  const half = width / 2;
  const len = max > 0 && Number.isFinite(value) ? Math.min(half, (Math.abs(value) / max) * half) : 0;
  const good = value >= 0;
  return (
    <svg width={width} height={12} aria-hidden="true" className="block">
      <rect
        x={good ? half : half - len}
        y={2}
        width={len}
        height={8}
        fill={good ? 'var(--color-good)' : 'var(--color-bad)'}
      />
      <line x1={half} x2={half} y1={0} y2={12} stroke="var(--color-foreground)" strokeWidth={1} />
    </svg>
  );
}

/** Relative variance as pin (IBCS "needle"): a stem with a square head. */
export function VariancePin({ value, max, width = 70 }: { value: number; max: number; width?: number }) {
  const half = width / 2;
  if (!Number.isFinite(value) || max <= 0) return <svg width={width} height={12} aria-hidden="true" />;
  const len = Math.min(half - 3, (Math.abs(value) / max) * (half - 3));
  const good = value >= 0;
  const x = good ? half + len : half - len;
  const color = good ? 'var(--color-good)' : 'var(--color-bad)';
  return (
    <svg width={width} height={12} aria-hidden="true" className="block">
      <line x1={half} x2={x} y1={6} y2={6} stroke={color} strokeWidth={1.5} />
      <rect x={x - 3} y={3} width={6} height={6} fill={color} />
      <line x1={half} x2={half} y1={0} y2={12} stroke="var(--color-foreground)" strokeWidth={1} />
    </svg>
  );
}

/** SVG <defs> with the hatch patterns used by charts. */
export function HatchDefs({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={`${id}-fc`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="4" height="4" fill="var(--color-card)" />
        <line x1="0" y1="0" x2="0" y2="4" stroke="var(--color-fc)" strokeWidth="2" />
      </pattern>
      <pattern id={`${id}-sim`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="4" height="4" fill="var(--color-card)" />
        <line x1="0" y1="0" x2="0" y2="4" stroke="var(--color-sim)" strokeWidth="2" />
      </pattern>
    </defs>
  );
}
