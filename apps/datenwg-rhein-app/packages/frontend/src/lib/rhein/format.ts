import type { KpiDef, Unit } from './kpis';

const nf = (v: number, d: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');

const SPEC: Record<Unit, { div: number; dec: number; suffix: string; label: string }> = {
  m3s: { div: 1, dec: 0, suffix: '', label: 'm³/s' },
  pct: { div: 0.01, dec: 1, suffix: ' %', label: '%' },
  days: { div: 1, dec: 0, suffix: '', label: 'Tage' },
};

export function unitLabel(k: KpiDef): string {
  return SPEC[k.unit].label;
}

export function fmt(k: KpiDef, v: number): string {
  if (!Number.isFinite(v)) return 'n. a.';
  const s = SPEC[k.unit];
  return nf(v / s.div, s.dec) + s.suffix;
}

/** Signed absolute variance; percentages as percentage points. */
export function fmtDelta(k: KpiDef, d: number): string {
  if (!Number.isFinite(d)) return 'n. a.';
  const s = SPEC[k.unit];
  const txt = nf(Math.abs(d) / s.div, s.dec);
  const isZero = !/[1-9]/.test(txt);
  return (isZero ? '±' : d > 0 ? '+' : '−') + txt + (k.unit === 'pct' ? ' PP' : '');
}

export function fmtRel(r: number, dec = 1): string {
  if (!Number.isFinite(r)) return 'n. a.';
  return (r > 0 ? '+' : r < 0 ? '−' : '±') + nf(Math.abs(r) * 100, dec) + ' %';
}

export function relDelta(a: number, ref: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(ref) || ref === 0) return NaN;
  return (a - ref) / Math.abs(ref);
}

export function fmtNum(v: number, dec = 0): string {
  return Number.isFinite(v) ? nf(v, dec) : 'n. a.';
}

export function fmtDate(iso: string): string {
  if (!iso) return 'n. a.';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
