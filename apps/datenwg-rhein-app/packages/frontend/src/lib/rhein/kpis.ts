// KPI catalogue of the Rhine app. Each KPI has a per-year value and an
// aggregate over several years (weighted mean, min, max or share).

import type { YearStat } from './model';

export type Unit = 'm3s' | 'pct' | 'days';
export type KpiId = 'mq' | 'nq' | 'hq' | 'nm7q' | 'below';

export interface KpiDef {
  id: KpiId;
  label: string;
  short: string;
  unit: Unit;
  /** Polarity for good/bad colours: more water at low flow = good, bigger floods = bad. */
  higherBetter: boolean;
  info: string;
  /** Value of one year. */
  ofYear: (s: YearStat) => number;
  /** Value over several years (the same definition, not a mean of yearly values). */
  ofYears: (s: YearStat[]) => number;
}

const div = (a: number, b: number) => (b ? a / b : NaN);
const sum = (s: YearStat[], f: (x: YearStat) => number) => s.reduce((a, x) => a + f(x), 0);
const minOf = (s: YearStat[], f: (x: YearStat) => number) => {
  const v = s.map(f).filter(Number.isFinite);
  return v.length ? Math.min(...v) : NaN;
};
const maxOf = (s: YearStat[], f: (x: YearStat) => number) => {
  const v = s.map(f).filter(Number.isFinite);
  return v.length ? Math.max(...v) : NaN;
};

export const KPIS: KpiDef[] = [
  {
    id: 'mq',
    label: 'Mittelwasser MQ',
    short: 'MQ',
    unit: 'm3s',
    higherBetter: true,
    info: 'Mittlerer Tagesabfluss in m³/s.',
    ofYear: (s) => div(s.sum, s.days),
    ofYears: (s) => div(sum(s, (x) => x.sum), sum(s, (x) => x.days)),
  },
  {
    id: 'nq',
    label: 'Niedrigwasser NQ',
    short: 'NQ',
    unit: 'm3s',
    higherBetter: true,
    info: 'Kleinster Tagesabfluss in m³/s. Über mehrere Jahre: Mittel der Jahreswerte (MNQ).',
    ofYear: (s) => s.nq,
    ofYears: (s) => div(sum(s, (x) => x.nq), s.length),
  },
  {
    id: 'hq',
    label: 'Hochwasser HQ',
    short: 'HQ',
    unit: 'm3s',
    higherBetter: false,
    info: 'Größter Tagesabfluss in m³/s. Über mehrere Jahre: Mittel der Jahreswerte (MHQ).',
    ofYear: (s) => s.hq,
    ofYears: (s) => div(sum(s, (x) => x.hq), s.length),
  },
  {
    id: 'nm7q',
    label: 'Niedrigstes 7-Tage-Mittel NM7Q',
    short: 'NM7Q',
    unit: 'm3s',
    higherBetter: true,
    info: 'Kleinstes gleitendes 7-Tage-Mittel in m³/s. Über mehrere Jahre: Mittel der Jahreswerte.',
    ofYear: (s) => s.nm7q,
    ofYears: (s) => {
      const v = s.map((x) => x.nm7q).filter(Number.isFinite);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
    },
  },
  {
    id: 'below',
    label: 'Tage unter der alten P05-Schwelle',
    short: 'Unter P05',
    unit: 'pct',
    higherBetter: false,
    info: 'Anteil der Tage unter dem 5-%-Quantil von August und September 1817 bis 1920 (rund 1.090 m³/s).',
    ofYear: (s) => div(s.below, s.days),
    ofYears: (s) => div(sum(s, (x) => x.below), sum(s, (x) => x.days)),
  },
];

export const KPI_BY_ID = Object.fromEntries(KPIS.map((k) => [k.id, k])) as Record<KpiId, KpiDef>;

/** Positive = favourable, respecting polarity. */
export function favourable(k: KpiDef, delta: number): number {
  return k.higherBetter ? delta : -delta;
}

/** Extreme across years (for record views): lowest NQ, highest HQ etc. */
export const extreme = { minOf, maxOf };
