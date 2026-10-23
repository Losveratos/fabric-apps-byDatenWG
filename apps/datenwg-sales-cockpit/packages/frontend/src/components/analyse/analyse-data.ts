// Pure data helpers of the Analyse page: monthly AC/PY series, members of a
// dimension with their series, and the key message of the time analysis.

import type { SalesContextValue } from '@/hooks/sales.context';
import { favourable, type KpiDef, type KpiId } from '@/lib/sales/kpis';
import { emptyAcc, mergeAcc, sumMonths, type Acc, type Dim, type Filter } from '@/lib/sales/model';

export const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** KPIs that look ahead (pipeline, forecast): months after the snapshot carry data. */
const FORWARD: KpiId[] = ['openV', 'openW', 'fc'];

export const isForward = (k: KpiDef) => FORWARD.includes(k.id);

export const fin = (v: number) => Number.isFinite(v);

/** The sales context parts the pure helpers need. */
export type DataCtx = Pick<SalesContextValue, 'agg' | 'year' | 'pyYear' | 'months' | 'filter' | 'lastClosed'>;

/** Filter without the members of one dimension (so every member stays visible). */
export function withoutDim(filter: Filter, dim: Dim): Filter {
  const f: Filter = { ...filter };
  delete f[dim];
  return f;
}

/** 12 empty accumulators. */
export const emptyYear = (): Acc[] => Array.from({ length: 12 }, emptyAcc);

/** Month-wise merge of several 12-month accumulator arrays. */
export function mergeYears(list: Acc[][]): Acc[] {
  return ALL_MONTHS.map((m) => {
    const out = emptyAcc();
    for (const arr of list) if (arr[m - 1]) mergeAcc(out, arr[m - 1]);
    return out;
  });
}

/**
 * Monthly values of a 12-month accumulator array. Months after the last
 * closed month of the analysis year carry no actuals (NaN), except for
 * forward-looking KPIs.
 */
export function monthValues(arr: Acc[] | undefined, value: (a: Acc) => number, blankAfter: number): number[] {
  const a = arr ?? emptyYear();
  return ALL_MONTHS.map((m) => (m > blankAfter ? NaN : value(a[m - 1])));
}

export interface Series {
  acM: number[];
  pyM: number[];
  ac: number;
  py: number;
}

/** AC and PY series plus period values of one accumulator pair. */
export function seriesOf(ctx: DataCtx, value: (a: Acc) => number, forward: boolean, acArr: Acc[] | undefined, pyArr: Acc[] | undefined): Series {
  const blank = forward ? 12 : ctx.lastClosed;
  const months = forward ? ctx.months : ctx.months.filter((m) => m <= ctx.lastClosed);
  const a = acArr ?? emptyYear();
  const p = pyArr ?? emptyYear();
  return {
    acM: monthValues(a, value, blank),
    pyM: monthValues(p, value, 12),
    ac: months.length ? value(sumMonths(a, months)) : NaN,
    py: value(sumMonths(p, months.length ? months : ctx.months)),
  };
}

/** Whole-selection series of a KPI under the current filter. */
export function totalSeries(ctx: DataCtx, kpi: KpiDef): Series {
  const ac = ctx.agg(ctx.year, ctx.filter, null).get('');
  const py = ctx.agg(ctx.pyYear, ctx.filter, null).get('');
  return seriesOf(ctx, kpi.value, isForward(kpi), ac, py);
}

export interface MemberSeries extends Series {
  member: string;
  selected: boolean;
}

/**
 * Series per member of a dimension (the dimension's own filter is ignored so
 * all members stay visible; selected members are flagged), sorted by AC desc.
 */
export function memberSeries(ctx: DataCtx, kpi: KpiDef, dim: Dim, top?: number): MemberSeries[] {
  const f = withoutDim(ctx.filter, dim);
  const acMap = ctx.agg(ctx.year, f, dim);
  const pyMap = ctx.agg(ctx.pyYear, f, dim);
  const sel = ctx.filter[dim] ?? [];
  const names = new Set([...acMap.keys(), ...pyMap.keys()]);
  const list = [...names].map((member) => ({
    member,
    selected: sel.includes(member),
    ...seriesOf(ctx, kpi.value, isForward(kpi), acMap.get(member), pyMap.get(member)),
  }));
  list.sort(byAcDesc);
  return top ? list.slice(0, top) : list;
}

/** Sort by AC descending, NaN last, then by name. */
export function byAcDesc(a: { ac: number; member?: string }, b: { ac: number; member?: string }): number {
  const fa = fin(a.ac);
  const fb = fin(b.ac);
  if (fa && fb && b.ac !== a.ac) return b.ac - a.ac;
  if (fa !== fb) return fa ? -1 : 1;
  return (a.member ?? '').localeCompare(b.member ?? '', 'de');
}

/** Largest driver of a total change: member whose Δ points the same way and is largest. */
export function largestDriver(list: { member: string; ac: number; py: number }[], totalDelta: number): { member: string; delta: number } | null {
  let best: { member: string; delta: number } | null = null;
  for (const r of list) {
    const d = (fin(r.ac) ? r.ac : 0) - (fin(r.py) ? r.py : 0);
    if (!fin(d) || d === 0) continue;
    if (fin(totalDelta) && totalDelta !== 0 && Math.sign(d) !== Math.sign(totalDelta)) continue;
    if (!best || Math.abs(d) > Math.abs(best.delta)) best = { member: r.member, delta: d };
  }
  return best;
}

/** Favourable sign of a variance (true = good). NaN counts as neutral-good. */
export const isGood = (higherBetter: boolean, delta: number) => !fin(delta) || (higherBetter ? delta >= 0 : delta <= 0);

/** Favourable sign for a KPI. */
export const goodFor = (k: KpiDef, delta: number) => !fin(delta) || favourable(k, delta) >= 0;
