// Pure calculations for the pipeline page (no React): filtering, probability
// buckets, outlook per close month, grouping by dimension.

import { MONTH_SHORT } from '@/lib/sales/format';
import type { Deal, Dim, FcDeal, Filter, SalesData } from '@/lib/sales/model';

export const fin = (v: number): number => (Number.isFinite(v) ? v : 0);

/** Same member logic as the model: every dimension with a selection must include the value. */
export function passes(f: Filter, row: Record<Dim, string>, skip?: Dim): boolean {
  for (const d of Object.keys(f) as Dim[]) {
    if (d === skip) continue;
    const sel = f[d];
    if (sel && sel.length && !sel.includes(row[d])) return false;
  }
  return true;
}

export const openDealsOf = (data: SalesData, filter: Filter, skip?: Dim): Deal[] =>
  data.deals.filter((d) => d.status === 'offen' && passes(filter, d, skip));

export const forecastOf = (data: SalesData, filter: Filter): FcDeal[] => data.forecast.filter((d) => passes(filter, d));

export const weighted = (d: Deal): number => fin((d.summe * d.wsk) / 100);

// ---------------------------------------------------------------------------
// Probability rows (buckets or raw steps)
// ---------------------------------------------------------------------------

export interface BarRow {
  key: string;
  label: string;
  open: number;
  weighted: number;
  n: number;
}

interface BucketDef {
  key: string;
  label: string;
  test: (wsk: number) => boolean;
}

/** Top = highest probability. */
export const BUCKETS: BucketDef[] = [
  { key: 'b4', label: '> 80 %', test: (w) => w > 80 },
  { key: 'b3', label: '51–80 %', test: (w) => w > 50 && w <= 80 },
  { key: 'b2', label: '21–50 %', test: (w) => w > 20 && w <= 50 },
  { key: 'b1', label: '≤ 20 %', test: (w) => w <= 20 },
];

export function probabilityRows(deals: Deal[], mode: 'bucket' | 'step'): BarRow[] {
  const add = (m: Map<string, BarRow>, key: string, label: string, d: Deal) => {
    const r = m.get(key) ?? { key, label, open: 0, weighted: 0, n: 0 };
    r.open += fin(d.summe);
    r.weighted += weighted(d);
    r.n += 1;
    m.set(key, r);
  };
  const m = new Map<string, BarRow>();
  if (mode === 'bucket') {
    for (const b of BUCKETS) m.set(b.key, { key: b.key, label: b.label, open: 0, weighted: 0, n: 0 });
    for (const d of deals) {
      const b = BUCKETS.find((x) => x.test(d.wsk));
      if (b) add(m, b.key, b.label, d);
    }
    return [...m.values()];
  }
  for (const d of deals) add(m, `s${d.wsk}`, `${d.wsk} %`, d);
  return [...m.values()].sort((a, b) => Number(b.key.slice(1)) - Number(a.key.slice(1)));
}

export function dealsOfRow(deals: Deal[], key: string): Deal[] {
  const test =
    key.startsWith('b') ? (BUCKETS.find((b) => b.key === key)?.test ?? (() => false)) : (w: number) => w === Number(key.slice(1));
  return deals.filter((d) => test(d.wsk));
}

// ---------------------------------------------------------------------------
// Outlook per close month
// ---------------------------------------------------------------------------

export interface OutCol {
  key: string;
  label: string;
  /** 0 for the "älter" column. */
  year: number;
  won: number;
  open: number;
  fc: number;
}

export interface Outlook {
  cols: OutCol[];
  years: { year: number; won: number; open: number; fc: number }[];
  startLabel: string;
}

const MAX_YEAR = 2030;

export function buildOutlook(data: SalesData, deals: Deal[], fc: FcDeal[], mode: 'month' | 'quarter'): Outlook {
  const sy = Number(data.asOf.slice(0, 4));
  const sm = Number(data.asOf.slice(5, 7));
  let endYear = Math.max(2024, sy);
  for (const d of deals) if (d.status === 'offen' && d.closeY > endYear) endYear = d.closeY;
  for (const f of fc) if (f.flag === 1 && f.closeY > endYear) endYear = f.closeY;
  endYear = Math.min(endYear, MAX_YEAR);

  const n = (endYear - sy) * 12 + (12 - sm) + 1;
  const months: OutCol[] = Array.from({ length: n }, (_, i) => {
    const abs = sy * 12 + (sm - 1) + i;
    const year = Math.floor(abs / 12);
    const mo = (abs % 12) + 1;
    return { key: `${year}-${mo}`, label: MONTH_SHORT[mo - 1], year, won: 0, open: 0, fc: 0 };
  });
  const older: OutCol = { key: 'older', label: 'älter', year: 0, won: 0, open: 0, fc: 0 };
  const idxOf = (y: number, m: number) => (y - sy) * 12 + (m - sm);
  const put = (y: number, m: number, f: 'won' | 'open' | 'fc', v: number) => {
    const i = idxOf(y, m);
    if (i >= n) return;
    (i < 0 ? older : months[i])[f] += fin(v);
  };
  for (const d of deals) {
    if (d.status === 'gewonnen') {
      if (idxOf(d.closeY, d.closeM) >= 0) put(d.closeY, d.closeM, 'won', d.summe);
    } else if (d.status === 'offen') put(d.closeY, d.closeM, 'open', weighted(d));
  }
  for (const f of fc) if (f.flag === 1) put(f.closeY, f.closeM, 'fc', f.summe);

  const years: Outlook['years'] = [];
  for (let y = sy; y <= endYear; y++) {
    const ms = months.filter((c) => c.year === y);
    years.push({
      year: y,
      won: ms.reduce((s, c) => s + c.won, 0),
      open: ms.reduce((s, c) => s + c.open, 0),
      fc: ms.reduce((s, c) => s + c.fc, 0),
    });
  }

  let cols: OutCol[] = months;
  if (mode === 'quarter') {
    const q = new Map<string, OutCol>();
    for (const c of months) {
      const mo = Number(c.key.split('-')[1]);
      const qn = Math.ceil(mo / 3);
      const key = `${c.year}-Q${qn}`;
      const e = q.get(key) ?? { key, label: `Q${qn}`, year: c.year, won: 0, open: 0, fc: 0 };
      e.won += c.won;
      e.open += c.open;
      e.fc += c.fc;
      q.set(key, e);
    }
    cols = [...q.values()];
  }
  const hasOlder = older.open > 0 || older.fc > 0 || older.won > 0;
  return { cols: hasOlder ? [older, ...cols] : cols, years, startLabel: `${MONTH_SHORT[sm - 1]} ${sy}` };
}

// ---------------------------------------------------------------------------
// By dimension
// ---------------------------------------------------------------------------

export const TOP_N = 15;

export function groupRows(deals: Deal[], dim: Dim): { rows: BarRow[]; rest: BarRow | null } {
  const m = new Map<string, BarRow>();
  for (const d of deals) {
    const key = d[dim] || '(ohne)';
    const r = m.get(key) ?? { key, label: key, open: 0, weighted: 0, n: 0 };
    r.open += fin(d.summe);
    r.weighted += weighted(d);
    r.n += 1;
    m.set(key, r);
  }
  const all = [...m.values()].sort((a, b) => b.weighted - a.weighted);
  const top = all.slice(0, TOP_N);
  const tail = all.slice(TOP_N);
  const rest: BarRow | null = tail.length
    ? {
        key: '__rest',
        label: `übrige (${tail.length})`,
        open: tail.reduce((s, r) => s + r.open, 0),
        weighted: tail.reduce((s, r) => s + r.weighted, 0),
        n: tail.reduce((s, r) => s + r.n, 0),
      }
    : null;
  return { rows: top, rest };
}

/** Compact number for column labels, no unit (the tile subtitle names it). */
export function fmtK(v: number): string {
  const x = fin(v) / 1000;
  return x.toLocaleString('de-DE', { maximumFractionDigits: x >= 100 ? 0 : 1 });
}
