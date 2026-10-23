import type { KpiDef, Unit } from './kpis';

const nf = (v: number, d: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');

const SPEC: Record<Unit, { div: number; dec: number; suffix: string; label: string }> = {
  mio: { div: 1e6, dec: 2, suffix: '', label: 'Mio. €' },
  tsd: { div: 1e3, dec: 1, suffix: '', label: 'Tsd. €' },
  n: { div: 1, dec: 0, suffix: '', label: 'Anzahl' },
  days: { div: 1, dec: 0, suffix: '', label: 'Tage' },
  pct: { div: 0.01, dec: 1, suffix: ' %', label: '%' },
};

export function unitLabel(k: KpiDef): string {
  return SPEC[k.unit].label;
}

export function fmt(k: KpiDef, v: number): string {
  if (!Number.isFinite(v)) return '–';
  const s = SPEC[k.unit];
  return nf(v / s.div, s.dec) + s.suffix;
}

/** Signed absolute variance; percentages as percentage points. */
export function fmtDelta(k: KpiDef, d: number): string {
  if (!Number.isFinite(d)) return '–';
  const s = SPEC[k.unit];
  const txt = nf(Math.abs(d) / s.div, s.dec);
  const isZero = !/[1-9]/.test(txt);
  return (isZero ? '±' : d > 0 ? '+' : '−') + txt + (k.unit === 'pct' ? ' PP' : '');
}

export function fmtRel(r: number, dec = 1): string {
  if (!Number.isFinite(r)) return '–';
  return (r > 0 ? '+' : r < 0 ? '−' : '±') + nf(Math.abs(r) * 100, dec) + ' %';
}

export function relDelta(a: number, ref: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(ref) || ref === 0) return NaN;
  return (a - ref) / Math.abs(ref);
}

/** € amount with automatic unit for free texts (e.g. deal lists). */
export function fmtEuro(v: number): string {
  if (!Number.isFinite(v)) return '–';
  if (Math.abs(v) >= 1e6) return nf(v / 1e6, 2) + ' Mio. €';
  if (Math.abs(v) >= 1e3) return nf(v / 1e3, 1) + ' Tsd. €';
  return nf(v, 0) + ' €';
}

export function fmtDate(iso: string): string {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export const MONTH_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

/** IBCS period notation, e.g. "Jan..Dez 2022" or "Mai 2022". */
export function periodLabel(months: number[], year: number): string {
  if (!months.length) return String(year);
  if (months.length === 1) return `${MONTH_SHORT[months[0] - 1]} ${year}`;
  return `${MONTH_SHORT[months[0] - 1]}..${MONTH_SHORT[months[months.length - 1] - 1]} ${year}`;
}
