// Data model of the integrated variance bridge (ChartKitchen "wfkombi" /
// bridgeSegs): PY Σ → one Δ per member (top N + "übrige") → AC Σ. Pure
// functions over the sales context so the big chart and the small multiples
// share exactly the same arithmetic.

import type { SalesContextValue } from '@/hooks/sales.context';
import { relDelta } from '@/lib/sales/format';
import { favourable, type KpiDef } from '@/lib/sales/kpis';
import type { Dim, Filter } from '@/lib/sales/model';

export type StructSort = 'value' | 'delta';
export type BridgeKind = 'start' | 'member' | 'rest' | 'end';

export interface BridgeRow {
  key: string;
  label: string;
  kind: BridgeKind;
  /** Member is part of the active cross-filter. */
  selected: boolean;
  ac: number;
  py: number;
  delta: number;
  rel: number;
  /** Signed goodness of delta (positive = favourable). */
  good: number;
  /** Tier-2 segment: start/end from 0, members float on the running level. */
  from: number;
  to: number;
}

export interface BridgeData {
  rows: BridgeRow[];
  /** True when the KPI is additive and the bridge closes (PY Σ + Σ Δ = AC Σ). */
  bridge: boolean;
  pySum: number;
  acSum: number;
  /** Sum of all member and rest deltas. */
  deltaSum: number;
}

export interface BridgeDomain {
  /** Value at the axis (0, or the cut base). */
  base: number;
  cut: boolean;
  /** Domain relative to base (padded). */
  lo: number;
  hi: number;
}

type Ctx = Pick<SalesContextValue, 'byMember' | 'total' | 'pyYear'>;

const fin = (v: number) => Number.isFinite(v);

export const SUM_PY = 'PY Σ';
export const SUM_AC = 'AC Σ';

function memberRow(kpi: KpiDef, name: string, ac: number, py: number, kind: 'member' | 'rest', selected: boolean): BridgeRow {
  const delta = fin(ac) && fin(py) ? ac - py : NaN;
  return {
    key: kind === 'rest' ? '__rest' : `m:${name}`,
    label: name,
    kind,
    selected,
    ac,
    py,
    delta,
    rel: relDelta(ac, py),
    good: fin(delta) ? favourable(kpi, delta) : NaN,
    from: 0,
    to: 0,
  };
}

/** Descending by key, non-finite values last. */
const desc = (key: (r: BridgeRow) => number) => (a: BridgeRow, b: BridgeRow) => {
  const ka = key(a);
  const kb = key(b);
  if (!fin(ka)) return fin(kb) ? 1 : 0;
  if (!fin(kb)) return -1;
  return kb - ka;
};

/**
 * Bridge rows for `dim` under `filter` (the filter of `dim` itself is ignored,
 * like byMember). The top `topN` members by AC are kept, the rest becomes one
 * "übrige (n)" row so the bridge still closes.
 */
export function buildBridge(
  ctx: Ctx,
  kpi: KpiDef,
  dim: Dim,
  opts: { months: number[]; filter: Filter; picked?: string[]; sort: StructSort; topN: number }
): BridgeData {
  const { months, filter, sort, topN } = opts;
  const picked = opts.picked ?? [];
  const all = ctx.byMember(kpi, dim, { months, filter }).map((m) => memberRow(kpi, m.member, m.ac, m.py, 'member', picked.includes(m.member)));
  if (all.length === 0) return { rows: [], bridge: kpi.additive, pySum: NaN, acSum: NaN, deltaSum: NaN };

  let members = all;
  let rest: BridgeRow | null = null;
  if (all.length > topN) {
    const top = [...all].sort(desc((r) => r.ac)).slice(0, topN);
    const keep = new Set(top.map((r) => r.label));
    const restRows = all.filter((r) => !keep.has(r.label));
    const restNames = restRows.map((r) => r.label);
    members = top;
    const label = `übrige (${restRows.length})`;
    if (kpi.additive) {
      // Exact partition: the rest is the sum of the members it replaces.
      const ac = restRows.reduce((s, r) => s + (fin(r.ac) ? r.ac : 0), 0);
      const py = restRows.reduce((s, r) => s + (fin(r.py) ? r.py : 0), 0);
      rest = memberRow(kpi, label, ac, py, 'rest', false);
    } else {
      const f = { ...filter, [dim]: restNames };
      rest = memberRow(kpi, label, ctx.total(kpi, { months, filter: f }), ctx.total(kpi, { year: ctx.pyYear, months, filter: f }), 'rest', false);
    }
  }
  const sorted = [...members].sort(desc(sort === 'delta' ? (r) => r.good : (r) => r.ac));
  const body = rest ? [...sorted, rest] : sorted;

  const bridge = kpi.additive;
  let pySum: number;
  let acSum: number;
  if (bridge) {
    pySum = body.reduce((s, r) => s + (fin(r.py) ? r.py : 0), 0);
    acSum = body.reduce((s, r) => s + (fin(r.ac) ? r.ac : 0), 0);
  } else {
    const f: Filter = { ...filter };
    delete f[dim];
    acSum = ctx.total(kpi, { months, filter: f });
    pySum = ctx.total(kpi, { year: ctx.pyYear, months, filter: f });
  }

  let run = pySum;
  let deltaSum = 0;
  for (const r of body) {
    const d = fin(r.delta) ? r.delta : 0;
    deltaSum += d;
    if (bridge) {
      r.from = run;
      r.to = run + d;
      run = r.to;
    } else {
      r.from = 0;
      r.to = d;
    }
  }

  const totDelta = fin(acSum) && fin(pySum) ? acSum - pySum : NaN;
  const start: BridgeRow = {
    key: '__py',
    label: SUM_PY,
    kind: 'start',
    selected: false,
    ac: NaN,
    py: pySum,
    delta: NaN,
    rel: NaN,
    good: NaN,
    from: 0,
    to: pySum,
  };
  const end: BridgeRow = {
    key: '__ac',
    label: SUM_AC,
    kind: 'end',
    selected: false,
    ac: acSum,
    py: pySum,
    delta: totDelta,
    rel: relDelta(acSum, pySum),
    good: fin(totDelta) ? favourable(kpi, totDelta) : NaN,
    from: 0,
    to: bridge ? acSum : totDelta,
  };
  return { rows: [start, ...body, end], bridge, pySum, acSum, deltaSum };
}

/**
 * Value domain of tier 2 over one or more bridges (shared scale for small
 * multiples). Cuts the axis (ChartKitchen cutMark) when every level is
 * positive and the Δ span is small against the totals, so deltas stay legible.
 */
export function bridgeDomain(list: BridgeData[], pad = 0.08): BridgeDomain {
  const pv: number[] = [];
  let allBridge = list.length > 0;
  for (const d of list) {
    if (!d.bridge) allBridge = false;
    for (const r of d.rows) {
      if (d.bridge) {
        if (r.kind === 'start' || r.kind === 'end') pv.push(r.to);
        else pv.push(r.from, r.to);
      } else if (r.kind !== 'start') pv.push(r.to);
    }
  }
  const vals = pv.filter(fin);
  if (vals.length === 0) return { base: 0, cut: false, lo: 0, hi: 1 };
  const pmin = Math.min(...vals);
  const pmax = Math.max(...vals);
  let base = 0;
  let cut = false;
  if (allBridge && pmin > 0 && pmax - pmin < 0.6 * pmax) {
    const span = pmax - pmin || pmax * 0.1;
    base = Math.max(0, pmin - span * 0.5);
    cut = base > 0;
  }
  const rel = vals.map((v) => v - base);
  const max = Math.max(0, ...rel);
  const min = Math.min(0, ...rel);
  const span = max - min || 1;
  const lo = min < 0 ? min - span * pad : 0;
  let hi = max > 0 ? max + span * pad : 0;
  if (hi === lo) hi = lo + 1;
  return { base, cut, lo, hi };
}

/** Largest favourable and unfavourable contributor (members only). */
export function bridgeMessage(kpi: KpiDef, data: BridgeData, fmtDelta: (k: KpiDef, d: number) => string): string | undefined {
  const finite = data.rows.filter((r) => r.kind === 'member' && fin(r.good));
  if (finite.length === 0) return undefined;
  const best = finite.reduce((a, b) => (b.good > a.good ? b : a));
  const worst = finite.reduce((a, b) => (b.good < a.good ? b : a));
  const parts: string[] = [];
  if (best.good > 0) parts.push(`größter Beitrag: ${best.label} ${fmtDelta(kpi, best.delta)}`);
  if (worst.good < 0) parts.push(`größte Lücke: ${worst.label} ${fmtDelta(kpi, worst.delta)}`);
  const txt = parts.length ? parts.join(' · ') : 'Keine Abweichung zu PY';
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
