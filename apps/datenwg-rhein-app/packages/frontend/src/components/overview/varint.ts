// Pure data and geometry helpers of the integrated variance chart of the
// Rhine overview (ChartKitchen renderVarInt). AC per decade or year against
// REF = the same months 1817..1920. The KPIs are not additive (means, minima,
// maxima, shares), so the Δ tier shows plain columns per bucket, never a bridge.

import type { KeyboardEvent } from 'react';

import { relCap } from '@/lib/ibcs/notation';
import type { Grain, Point } from '@/lib/rhein/compute';
import { relDelta } from '@/lib/rhein/format';
import { favourable, type KpiDef } from '@/lib/rhein/kpis';
import type { Epoch } from '@/lib/rhein/model';

export const fin = (v: number) => Number.isFinite(v);

/** Opacity of buckets outside the epoch selection. */
export const OUT_OPACITY = 0.32;

export const onKey = (e: KeyboardEvent, act: () => void) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    act();
  }
};

// ---------- geometry ----------

export interface Geom {
  compact: boolean;
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
  compact: false,
  W: 780,
  X0: 8,
  X1: 690,
  BAND_X: 702,
  BAND_W: 78,
  CAP: 14,
  CAT: 18,
  GAP: 14,
  hRel: 78,
  hWf: 96,
  hBase: 150,
  fCap: 10.5,
  fLab: 9.5,
  fVal: 11,
  fCat: 10,
  pinR: 4,
  stem: 2,
};

export const COMPACT: Geom = {
  compact: true,
  W: 340,
  X0: 2,
  X1: 282,
  BAND_X: 290,
  BAND_W: 50,
  CAP: 11,
  CAT: 11,
  GAP: 8,
  hRel: 36,
  hWf: 44,
  hBase: 70,
  fCap: 8,
  fLab: 8,
  fVal: 8.5,
  fCat: 7.5,
  pinR: 2.4,
  stem: 1.2,
};

export const slotOf = (g: Geom, n: number) => (g.X1 - g.X0) / Math.max(1, n);
export const cxOf = (g: Geom, i: number, n: number) => g.X0 + (i + 0.5) * slotOf(g, n);

/** Tier tops (Δ%, Δ, base) and total height. */
export function layoutOf(g: Geom) {
  const t1 = 0;
  const t2 = t1 + g.CAP + g.hRel + g.GAP;
  const t3 = t2 + g.CAP + g.hWf + g.GAP;
  return { t1, t2, t3, H: t3 + g.CAP + g.hBase + g.CAT };
}

// ---------- rows ----------

export interface VRow {
  i: number;
  key: number;
  label: string;
  /** Category label under the axis (null = none, too dense). */
  tick: string | null;
  epoch: Epoch;
  active: boolean;
  op: number;
  a: number;
  r: number;
  d: number;
  rel: number;
  good: boolean;
  years: number;
}

export interface BandData {
  tot: number;
  refTot: number;
  label: string;
}

/** Which buckets get a category label (decades: all, years: every 10th / 20th / 50th). */
export function tickOf(grain: Grain, key: number, n: number, compact: boolean): string | null {
  if (grain === 'decade') return compact ? (key % 50 === 0 ? String(key) : null) : String(key);
  const every = compact ? (n > 60 ? 25 : 10) : n > 120 ? 20 : 10;
  return key % every === 0 ? String(key) : null;
}

export function buildRows(kpi: KpiDef, points: Point[], grain: Grain, compact: boolean): VRow[] {
  return points.map((p, i) => {
    const d = fin(p.ac) && fin(p.ref) ? p.ac - p.ref : NaN;
    return {
      i,
      key: p.key,
      label: p.label,
      tick: tickOf(grain, p.key, points.length, compact),
      epoch: p.epoch,
      active: p.active,
      op: p.active ? 1 : OUT_OPACITY,
      a: p.ac,
      r: p.ref,
      d,
      rel: relDelta(p.ac, p.ref),
      good: !fin(d) || favourable(kpi, d) >= 0,
      years: p.years,
    };
  });
}

// ---------- extents ----------

export interface Extent {
  rel: [number, number];
  wf: [number, number];
  base: [number, number];
  band: [number, number];
}

const span = (vals: number[]): [number, number] => {
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

export function mergeExtents(list: Extent[]): Extent {
  const m = (k: keyof Extent): [number, number] => [Math.min(0, ...list.map((e) => e[k][0])), Math.max(0, ...list.map((e) => e[k][1]))];
  return { rel: m('rel'), wf: m('wf'), base: m('base'), band: m('band') };
}
