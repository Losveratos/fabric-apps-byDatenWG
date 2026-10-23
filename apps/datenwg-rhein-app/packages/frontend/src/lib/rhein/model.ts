// Rhine at Cologne: every daily discharge value 1816..2025 held in the
// browser. Years, months, epochs and the reference period 1817..1920 are
// derived here; every KPI is computed per year in one pass per month filter.

export type Epoch = 'vor 1920' | '1920 bis 1995' | 'ab 1996';
export const EPOCHS: Epoch[] = ['vor 1920', '1920 bis 1995', 'ab 1996'];

/** Reference period of the Rhine story (full years). */
export const REF_FROM = 1817;
export const REF_TO = 1920;

export function epochOf(year: number): Epoch {
  return year < 1920 ? 'vor 1920' : year <= 1995 ? '1920 bis 1995' : 'ab 1996';
}

export const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export interface Day {
  date: string; // YYYY-MM-DD
  y: number;
  m: number; // 1..12
  q: number; // m³/s
  q7: number | null; // trailing 7-day mean, null for the first 6 days
}

export interface Station {
  station: string;
  fluss: string;
  einzugsgebiet: number;
  quelle: string;
  lizenz: string;
  stand: string;
}

export interface RheinData {
  days: Day[];
  /** Complete years only (1817..2025); 1816 has only Nov/Dec. */
  years: number[];
  station: Station;
  /** Old low-water threshold: 5 % quantile of Aug/Sep days 1817..1920 (m³/s). */
  p05: number;
  /** Last day with data. */
  asOf: string;
}

/** Per-year statistics for a month selection. */
export interface YearStat {
  year: number;
  decade: number; // 1810, 1820, ...
  epoch: Epoch;
  sum: number; // Σ q, for weighted means
  days: number;
  nq: number;
  hq: number;
  nm7q: number; // NaN if no 7-day value
  below: number; // days with q < p05
}

/** One pass over all days: per complete year the stats of the selected months. */
export function yearStats(data: RheinData, months: number[]): YearStat[] {
  const sel = months.length ? new Set(months) : null;
  const by = new Map<number, YearStat>();
  for (const d of data.days) {
    if (sel && !sel.has(d.m)) continue;
    let s = by.get(d.y);
    if (!s) {
      s = { year: d.y, decade: Math.floor(d.y / 10) * 10, epoch: epochOf(d.y), sum: 0, days: 0, nq: Infinity, hq: -Infinity, nm7q: Infinity, below: 0 };
      by.set(d.y, s);
    }
    s.sum += d.q;
    s.days += 1;
    if (d.q < s.nq) s.nq = d.q;
    if (d.q > s.hq) s.hq = d.q;
    if (d.q7 != null && d.q7 < s.nm7q) s.nm7q = d.q7;
    if (d.q < data.p05) s.below += 1;
  }
  const years = new Set(data.years);
  return [...by.values()]
    .filter((s) => years.has(s.year))
    .map((s) => (Number.isFinite(s.nm7q) ? s : { ...s, nm7q: NaN }))
    .sort((a, b) => a.year - b.year);
}

/** Inclusive percentile like DAX PERCENTILE.INC. */
export function percentileInc(values: number[], p: number): number {
  if (!values.length) return NaN;
  const v = [...values].sort((a, b) => a - b);
  const r = p * (v.length - 1);
  const lo = Math.floor(r);
  const hi = Math.ceil(r);
  return v[lo] + (v[hi] - v[lo]) * (r - lo);
}

/** Mean daily discharge per month (1..12) over the given years. */
export function monthProfile(data: RheinData, years: Set<number>): number[] {
  const sum = Array(12).fill(0);
  const n = Array(12).fill(0);
  for (const d of data.days) {
    if (!years.has(d.y)) continue;
    sum[d.m - 1] += d.q;
    n[d.m - 1] += 1;
  }
  return sum.map((s, i) => (n[i] ? s / n[i] : NaN));
}
