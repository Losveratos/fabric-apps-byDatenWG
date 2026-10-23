// Memoised compute functions of the Rhine context. AC = selected years,
// REF = the same months in the reference period 1817..1920.

import type { KpiDef } from './kpis';
import { EPOCHS, monthProfile, REF_FROM, REF_TO, yearStats, type Epoch, type RheinData, type YearStat } from './model';

export type Grain = 'decade' | 'year';

export interface Selection {
  /** Months 1..12; empty = whole year. */
  months: number[];
  /** Epochs; empty = all. */
  epochs: Epoch[];
}

export interface Point {
  key: number; // year or decade start
  label: string; // "1947" or "1940er"
  epoch: Epoch;
  ac: number;
  ref: number;
  /** Bucket is inside the epoch selection. */
  active: boolean;
  /** Number of complete years in the bucket. */
  years: number;
}

export interface GroupValue {
  group: string;
  ac: number;
  ref: number;
}

export function makeCompute(data: RheinData, sel: Selection) {
  const statsCache = new Map<string, YearStat[]>();
  const stats = (months: number[] = sel.months) => {
    const k = [...months].sort((a, b) => a - b).join(',');
    let hit = statsCache.get(k);
    if (!hit) statsCache.set(k, (hit = yearStats(data, months)));
    return hit;
  };
  const inEpochs = (s: YearStat) => !sel.epochs.length || sel.epochs.includes(s.epoch);
  const refYears = (s: YearStat) => s.year >= REF_FROM && s.year <= REF_TO;

  /** KPI over the selected epochs and months. */
  const total = (kpi: KpiDef, opts: { months?: number[]; epochs?: Epoch[] } = {}) => {
    const ep = opts.epochs ?? sel.epochs;
    return kpi.ofYears(stats(opts.months).filter((s) => !ep.length || ep.includes(s.epoch)));
  };

  /** Reference value 1817..1920 for the same months. */
  const ref = (kpi: KpiDef, opts: { months?: number[] } = {}) => kpi.ofYears(stats(opts.months).filter(refYears));

  /** One point per year or decade over the whole series (all epochs, active flag for the selection). */
  const series = (kpi: KpiDef, grain: Grain, opts: { months?: number[] } = {}): Point[] => {
    const all = stats(opts.months);
    const r = ref(kpi, opts);
    if (grain === 'year')
      return all.map((s) => ({ key: s.year, label: String(s.year), epoch: s.epoch, ac: kpi.ofYear(s), ref: r, active: inEpochs(s), years: 1 }));
    const by = new Map<number, YearStat[]>();
    for (const s of all) {
      const arr = by.get(s.decade);
      if (arr) arr.push(s);
      else by.set(s.decade, [s]);
    }
    return [...by.entries()].map(([dec, arr]) => ({
      key: dec,
      label: `${dec}er`,
      epoch: arr[0].epoch,
      ac: kpi.ofYears(arr),
      ref: r,
      active: arr.some(inEpochs),
      years: arr.length,
    }));
  };

  /** KPI per epoch (always all three) against the reference. */
  const byEpoch = (kpi: KpiDef, opts: { months?: number[] } = {}): GroupValue[] => {
    const r = ref(kpi, opts);
    return EPOCHS.map((e) => ({ group: e, ac: kpi.ofYears(stats(opts.months).filter((s) => s.epoch === e)), ref: r }));
  };

  /** KPI per calendar month (1..12) for the selected epochs against the reference. */
  const byMonth = (kpi: KpiDef, opts: { epochs?: Epoch[] } = {}): GroupValue[] =>
    Array.from({ length: 12 }, (_, i) => ({
      group: String(i + 1),
      ac: total(kpi, { months: [i + 1], epochs: opts.epochs }),
      ref: ref(kpi, { months: [i + 1] }),
    }));

  /** Mean discharge per month for a set of years (season profile). */
  const profile = (years: number[]) => monthProfile(data, new Set(years));

  /** Years of the selection, sorted by a KPI (for rankings like the driest years). */
  const ranking = (kpi: KpiDef, dir: 'asc' | 'desc', n: number, opts: { months?: number[] } = {}) =>
    stats(opts.months)
      .filter(inEpochs)
      .map((s) => ({ year: s.year, epoch: s.epoch, value: kpi.ofYear(s) }))
      .filter((x) => Number.isFinite(x.value))
      .sort((a, b) => (dir === 'asc' ? a.value - b.value : b.value - a.value))
      .slice(0, n);

  return { stats, total, ref, series, byEpoch, byMonth, profile, ranking };
}

export type Compute = ReturnType<typeof makeCompute>;
