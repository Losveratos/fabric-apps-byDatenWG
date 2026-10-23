// Pure data and geometry helpers of the monthly integrated variance chart
// (ported from the Auslastung VarIntChart). AC of the selected epochs against
// REF = the same month in the reference period 1817 bis 1920. The KPIs are not
// additive, so the Δ tier shows plain columns per month, never a bridge.

import { C, relCap } from '@/lib/ibcs/notation';
import type { GroupValue } from '@/lib/rhein/compute';
import { relDelta } from '@/lib/rhein/format';
import { favourable, type KpiDef } from '@/lib/rhein/kpis';
import { MONTHS, type Epoch } from '@/lib/rhein/model';

export const fin = (v: number) => Number.isFinite(v);

/** Opacity of months outside the month selection. */
export const OUT_OPACITY = 0.35;

export const REF_LABEL = 'REF';
export const REF_TEXT = 'REF 1817 bis 1920';

export const MONTHS_LONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/** Good (favourable) or neutral; NaN counts as good so nothing turns red without data. */
export const goodFor = (kpi: KpiDef, d: number) => !fin(d) || favourable(kpi, d) >= 0;

// ---------- geometry ----------

export interface Geom {
  W: number;
  X0: number;
  X1: number;
  BAND_X: number;
  BAND_W: number;
  CAP: number;
  CAT: number;
  GAP: number;
  hRel: number;
  hWf: number;
  hBase: number;
  fCap: number;
  fLab: number;
  fVal: number;
  fCat: number;
  pinR: number;
  stem: number;
}

export const BIG: Geom = {
  W: 760,
  X0: 8,
  X1: 676,
  BAND_X: 690,
  BAND_W: 70,
  CAP: 14,
  CAT: 18,
  GAP: 14,
  hRel: 70,
  hWf: 96,
  hBase: 150,
  fCap: 10.5,
  fLab: 10,
  fVal: 11,
  fCat: 11,
  pinR: 4.2,
  stem: 2,
};

export const slotOf = (g: Geom, n: number) => (g.X1 - g.X0) / Math.max(1, n);
/** Centre of slot i (0-based) of n slots. */
export const cxOf = (g: Geom, i: number, n: number) => g.X0 + (i + 0.5) * slotOf(g, n);

/** Tier tops (Δ%, Δ, base) and total height. */
export function layoutOf(g: Geom) {
  const t1 = 0;
  const t2 = t1 + g.CAP + g.hRel + g.GAP;
  const t3 = t2 + g.CAP + g.hWf + g.GAP;
  return { t1, t2, t3, H: t3 + g.CAP + g.hBase + g.CAT };
}

// ---------- series ----------

export interface VRow {
  /** Month index 0..11. */
  i: number;
  label: string;
  sel: boolean;
  op: number;
  a: number;
  r: number;
  d: number;
  rel: number;
  good: boolean;
}

export interface BandData {
  tot: number;
  refTot: number;
  label: string;
}

/** One row per month from byMonth(); months = view.months (empty = all selected). */
export function buildRows(kpi: KpiDef, values: GroupValue[], months: number[]): VRow[] {
  const sel = new Set(months);
  return values.map((v, i) => {
    const a = v.ac;
    const r = v.ref;
    const d = fin(a) && fin(r) ? a - r : NaN;
    const selected = !months.length || sel.has(i + 1);
    return { i, label: MONTHS[i], sel: selected, op: selected ? 1 : OUT_OPACITY, a, r, d, rel: relDelta(a, r), good: goodFor(kpi, d) };
  });
}

// ---------- scale extents ----------

export interface Extent {
  rel: [number, number];
  wf: [number, number];
  base: [number, number];
  band: [number, number];
}

export const span = (vals: number[]): [number, number] => {
  const f = vals.filter(fin);
  return [Math.min(0, ...f), Math.max(0, ...f)];
};

export function extentOf(rows: VRow[], band: BandData): Extent {
  const rels = [...rows.map((r) => r.rel), relDelta(band.tot, band.refTot)];
  const cap = relCap(rels);
  return {
    rel: span(rels.map((v) => (fin(v) ? Math.max(-cap, Math.min(cap, v)) : NaN))),
    wf: span([...rows.map((r) => r.d), band.tot - band.refTot]),
    base: span(rows.flatMap((r) => [r.a, r.r])),
    band: span([band.tot, band.refTot]),
  };
}

/** Short label of a month selection for the band ("Jahr", "Aug, Sep", "4 Monate"). */
export function monthsLabel(months: number[]): string {
  if (!months.length) return 'Jahr';
  if (months.length <= 2) return months.map((m) => MONTHS[m - 1]).join(', ');
  return `${months.length} Monate`;
}

/** Formatted value or "n. a." (the shared formatters fall back to a dash). */
export const orNa = (v: number, f: (v: number) => string) => (fin(v) ? f(v) : 'n. a.');

/** Line style per epoch in the season profile: oldest light grey, middle mid grey dashed, newest dark like AC. */
export const LINE_STYLE: Record<Epoch, { stroke: string; width: number; dash?: string }> = {
  'vor 1920': { stroke: C.py, width: 2.4 },
  '1920 bis 1995': { stroke: C.fcInk, width: 1.8, dash: '5,3' },
  'ab 1996': { stroke: C.ac, width: 2.8 },
};
