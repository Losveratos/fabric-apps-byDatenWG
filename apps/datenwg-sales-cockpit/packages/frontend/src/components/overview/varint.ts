// Pure data and geometry helpers of the integrated variance chart
// (ChartKitchen renderVarInt / renderTimeWf / renderRelVar / renderColumns).
// Kept free of React so the big chart, the small multiples and the specs
// share one implementation.

import { relCap } from '@/lib/ibcs/notation';
import { relDelta } from '@/lib/sales/format';
import { favourable, type KpiDef } from '@/lib/sales/kpis';

export const fin = (v: number) => Number.isFinite(v);

export const OPEN_OPACITY = 0.35;
export const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

// ---------- geometry ----------

/** Geometry of one chart size (fixed internal width, scaled by the viewBox). */
export interface Geom {
  compact: boolean;
  W: number;
  X0: number;
  X1: number;
  BAND_X: number;
  BAND_W: number;
  /** Caption band above each tier. */
  CAP: number;
  /** Category label row. */
  CAT: number;
  /** Gap between tiers. */
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
  compact: false,
  W: 760,
  X0: 8,
  X1: 680,
  BAND_X: 696,
  BAND_W: 64,
  CAP: 14,
  CAT: 18,
  GAP: 14,
  hRel: 78,
  hWf: 110,
  hBase: 150,
  fCap: 10.5,
  fLab: 10,
  fVal: 11,
  fCat: 11,
  pinR: 4.2,
  stem: 2,
};

export const COMPACT: Geom = {
  compact: true,
  W: 320,
  X0: 2,
  X1: 266,
  BAND_X: 274,
  BAND_W: 46,
  CAP: 11,
  CAT: 11,
  GAP: 8,
  hRel: 36,
  hWf: 50,
  hBase: 70,
  fCap: 8,
  fLab: 8,
  fVal: 8.5,
  fCat: 7.5,
  pinR: 2.6,
  stem: 1.4,
};

export const slotOf = (g: Geom) => (g.X1 - g.X0) / 12;
export const cxOf = (g: Geom, m: number) => g.X0 + (m - 0.5) * slotOf(g);

/** Tier tops (ΔPY%, ΔPY bridge, base) and total height, 14 px gaps in the big chart. */
export function layoutOf(g: Geom) {
  const t1 = 0;
  const t2 = t1 + g.CAP + g.hRel + g.GAP;
  const t3 = t2 + g.CAP + g.hWf + g.GAP;
  return { t1, t2, t3, H: t3 + g.CAP + g.hBase + g.CAT };
}

// ---------- series ----------

export interface VRow {
  m: number;
  open: boolean;
  /** Month belongs to the selected period. */
  sel: boolean;
  /** Mark opacity: selection and open-month fading combined. */
  op: number;
  a: number;
  r: number;
  /** AC − PY of a closed month (NaN for open months). */
  d: number;
  rel: number;
  good: boolean;
}

export interface BandData {
  tot: number;
  refTot: number;
  label: string;
}

/** One row per month from 12 monthly AC and PY values. */
export function buildRows(kpi: KpiDef, acM: number[], pyM: number[], lastClosed: number, months: number[]): VRow[] {
  const sel = new Set(months);
  return ALL_MONTHS.map((m) => {
    const a = acM[m - 1];
    const r = pyM[m - 1];
    const open = m > lastClosed;
    const d = !open && fin(a) && fin(r) ? a - r : NaN;
    const selected = sel.has(m);
    return {
      m,
      open,
      sel: selected,
      op: Math.min(selected ? 1 : 0.35, open ? OPEN_OPACITY : 1),
      a,
      r,
      d,
      rel: open ? NaN : relDelta(a, r),
      good: !fin(d) || favourable(kpi, d) >= 0,
    };
  });
}

export interface BridgeSeg {
  m: number;
  from: number;
  to: number;
  d: number;
  good: boolean;
  op: number;
}

export interface Bridge {
  segs: BridgeSeg[];
  /** Σ of the contributions = Σ AC − Σ PY of the period. */
  total: number;
  good: boolean;
}

/**
 * Δ bridge (horizontal-time waterfall): every month of the selected period
 * contributes AC − PY, running from the cumulative variance before it. Only
 * meaningful for additive KPIs. Open months contribute too (drawn faded), so
 * Σ equals the period variance of the total band.
 */
export function bridgeOf(kpi: KpiDef, rows: VRow[]): Bridge {
  let run = 0;
  const segs: BridgeSeg[] = [];
  for (const r of rows) {
    if (!r.sel) continue;
    const d = fin(r.a) && fin(r.r) ? r.a - r.r : 0;
    segs.push({ m: r.m, from: run, to: run + d, d, good: favourable(kpi, d) >= 0, op: r.open ? OPEN_OPACITY : 1 });
    run += d;
  }
  return { segs, total: run, good: favourable(kpi, run) >= 0 };
}

// ---------- scale extents (shared or own scale in small multiples) ----------

export interface Extent {
  /** ΔPY% domain after outlier capping. */
  rel: [number, number];
  /** ΔPY tier (bridge levels or plain variances). */
  wf: [number, number];
  /** Monthly AC / PY values. */
  base: [number, number];
  /** Period totals in the band. */
  band: [number, number];
}

const span = (vals: number[]): [number, number] => {
  const f = vals.filter(fin);
  return [Math.min(0, ...f), Math.max(0, ...f)];
};

export function extentOf(kpi: KpiDef, rows: VRow[], band: BandData): Extent {
  const rels = [...rows.map((r) => r.rel), relDelta(band.tot, band.refTot)];
  const cap = relCap(rels);
  const rel = span(rels.map((v) => (fin(v) ? Math.max(-cap, Math.min(cap, v)) : NaN)));
  let wf: [number, number];
  if (kpi.additive) {
    const br = bridgeOf(kpi, rows);
    wf = span([...br.segs.flatMap((s) => [s.from, s.to]), br.total]);
  } else {
    wf = span([...rows.map((r) => r.d), band.tot - band.refTot]);
  }
  return {
    rel,
    wf,
    base: span(rows.flatMap((r) => [r.a, r.r])),
    band: span([band.tot, band.refTot]),
  };
}

/** Union of extents: one common scale per tier for all cards. */
export function mergeExtents(list: Extent[]): Extent {
  const m = (k: keyof Extent): [number, number] => [Math.min(0, ...list.map((e) => e[k][0])), Math.max(0, ...list.map((e) => e[k][1]))];
  return { rel: m('rel'), wf: m('wf'), base: m('base'), band: m('band') };
}
