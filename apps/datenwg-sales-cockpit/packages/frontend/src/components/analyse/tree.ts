// Value driver tree of the Analyse page: node model per mode (formula,
// region, product, sales), lazy children, expansion state and the layout of
// the PnL custom visual tree (left → right, simplified Reingold–Tilford).

import { fmt, unitLabel } from '@/lib/sales/format';
import { KPI_BY_ID, type KpiDef } from '@/lib/sales/kpis';
import type { Acc, Dim, Filter } from '@/lib/sales/model';
import type { TreeMode } from '@/lib/sales/view';

import { byAcDesc, emptyYear, isForward, mergeYears, seriesOf, type DataCtx, type Series } from './analyse-data';

// ---------------------------------------------------------------------------
// Metrics and nodes
// ---------------------------------------------------------------------------

export type Op = '+' | '×' | '÷';

export interface Metric {
  label: string;
  unit: string;
  higherBetter: boolean;
  forward: boolean;
  value: (a: Acc) => number;
  format: (v: number) => string;
}

export const metricOf = (k: KpiDef): Metric => ({
  label: k.label,
  unit: unitLabel(k),
  higherBetter: k.higherBetter,
  forward: isForward(k),
  value: k.value,
  format: (v) => fmt(k, v),
});

const perCustomer: Metric = {
  label: 'Aufträge je Kunde',
  unit: 'je Kunde',
  higherBetter: true,
  forward: false,
  value: (a) => (a.customers.size ? a.wonN / a.customers.size : NaN),
  format: (v) =>
    Number.isFinite(v) ? v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('-', '−') : '–',
};

export interface TNode extends Series {
  id: string;
  label: string;
  metric: Metric;
  op?: Op;
  /** Member behind the card (structure modes): click applies it as filter. */
  member?: { dim: Dim; member: string };
  /** Extra tooltip line, e.g. the members folded into "übrige". */
  note?: string;
  /** Lazy children; undefined = leaf. */
  kids?: () => TNode[];
}

/** Path separator of node ids (never part of a member name). */
export const SEP = '␟';

const childId = (parent: string, name: string) => parent + SEP + name;

function node(ctx: DataCtx, id: string, label: string, metric: Metric, ac: Acc[] | undefined, py: Acc[] | undefined, extra: Partial<TNode> = {}): TNode {
  return { id, label, metric, ...seriesOf(ctx, metric.value, metric.forward, ac, py), ...extra };
}

/** Members of `dim` under `filter` as child nodes, top-n plus "übrige". */
function groupNodes(
  ctx: DataCtx,
  metric: Metric,
  parentId: string,
  filter: Filter,
  dim: Dim,
  top: number | null,
  kidsOf?: (member: string, f: Filter, id: string) => (() => TNode[]) | undefined
): TNode[] {
  const acMap = ctx.agg(ctx.year, filter, dim);
  const pyMap = ctx.agg(ctx.pyYear, filter, dim);
  const names = [...new Set([...acMap.keys(), ...pyMap.keys()])];
  const rows = names.map((member) => {
    const s = seriesOf(ctx, metric.value, metric.forward, acMap.get(member), pyMap.get(member));
    return { member, ac: s.ac, s };
  });
  rows.sort(byAcDesc);
  const shown = top !== null && rows.length > top + 1 ? rows.slice(0, top) : rows;
  const rest = rows.slice(shown.length);
  const out: TNode[] = shown.map((r) => {
    const id = childId(parentId, r.member);
    const f: Filter = { ...filter, [dim]: [r.member] };
    return { id, label: r.member, metric, op: '+', member: { dim, member: r.member }, ...r.s, kids: kidsOf?.(r.member, f, id) };
  });
  if (rest.length) {
    const ac = mergeYears(rest.map((r) => acMap.get(r.member) ?? emptyYear()));
    const py = mergeYears(rest.map((r) => pyMap.get(r.member) ?? emptyYear()));
    const names = rest.map((r) => r.member);
    out.push(
      node(ctx, childId(parentId, '…übrige'), `übrige (${rest.length})`, metric, ac, py, {
        op: '+',
        note: names.slice(0, 12).join(', ') + (names.length > 12 ? ` … (+${names.length - 12})` : ''),
      })
    );
  }
  return out;
}

/** Root node of a mode under the current filter. */
export function buildRoot(ctx: DataCtx, mode: TreeMode, kpi: KpiDef): TNode {
  const won = metricOf(KPI_BY_ID.won);
  const acAll = ctx.agg(ctx.year, ctx.filter, null).get('');
  const pyAll = ctx.agg(ctx.pyYear, ctx.filter, null).get('');

  if (mode === 'formula') {
    return node(ctx, 'root', 'Auftragseingang', won, acAll, pyAll, {
      kids: () => [
        node(ctx, childId('root', 'n'), 'Gewonnene Aufträge', metricOf(KPI_BY_ID.wonN), acAll, pyAll, {
          op: '×',
          kids: () => [
            node(ctx, childId(childId('root', 'n'), 'k'), 'Kunden mit Auftrag', metricOf(KPI_BY_ID.customers), acAll, pyAll, { op: '×' }),
            node(ctx, childId(childId('root', 'n'), 'q'), 'Aufträge je Kunde', perCustomer, acAll, pyAll, { op: '×' }),
          ],
        }),
        node(ctx, childId('root', 'avg'), 'Ø Auftragswert', metricOf(KPI_BY_ID.avgDeal), acAll, pyAll, { op: '×' }),
      ],
    });
  }

  const metric = metricOf(kpi.additive ? kpi : KPI_BY_ID.won);
  const rootLabel = metric.label;
  const f = ctx.filter;
  if (mode === 'region') {
    return node(ctx, 'root', rootLabel, metric, acAll, pyAll, {
      kids: () => groupNodes(ctx, metric, 'root', f, 'bundesland', null, (_m, fm, id) => () => groupNodes(ctx, metric, id, fm, 'stadt', null)),
    });
  }
  if (mode === 'product') {
    return node(ctx, 'root', rootLabel, metric, acAll, pyAll, {
      kids: () => groupNodes(ctx, metric, 'root', f, 'gruppe', null, (_m, fm, id) => () => groupNodes(ctx, metric, id, fm, 'typ', null)),
    });
  }
  return node(ctx, 'root', rootLabel, metric, acAll, pyAll, {
    kids: () => groupNodes(ctx, metric, 'root', f, 'vertriebler', 10, (_m, fm, id) => () => groupNodes(ctx, metric, id, fm, 'kunde', 8)),
  });
}

/** Walks the id path from the root; null if the node no longer exists. */
export function findNode(root: TNode, id: string): TNode | null {
  if (id === root.id) return root;
  if (!id.startsWith(root.id + SEP)) return null;
  const parts = id.slice(root.id.length + SEP.length).split(SEP);
  let cur: TNode = root;
  let path = root.id;
  for (const p of parts) {
    path = childId(path, p);
    const next: TNode | undefined = cur.kids?.().find((k) => k.id === path);
    if (!next) return null;
    cur = next;
  }
  return cur;
}

/** Labels of the path from the root to a node (for the breadcrumb). */
export function pathLabels(root: TNode, id: string): string[] {
  if (!id.startsWith(root.id + SEP)) return [];
  const parts = id.slice(root.id.length + SEP.length).split(SEP);
  const out: string[] = [];
  let cur: TNode | undefined = root;
  let path = root.id;
  for (const p of parts) {
    path = childId(path, p);
    cur = cur?.kids?.().find((k) => k.id === path);
    if (!cur) break;
    out.push(cur.label);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Expansion state
// ---------------------------------------------------------------------------

export interface TreeState {
  mode: TreeMode;
  /** Nodes with relative depth < base are open by default (Infinity = all). */
  base: number;
  open: string[];
  closed: string[];
  /** Whole limb expanded (Shift+click). */
  deep: string[];
  /** Re-rooted node id, null = full tree. */
  rootId: string | null;
}

export const DEFAULT_BASE: Record<TreeMode, number> = { formula: Infinity, region: 1, product: 2, sales: 1 };

export const initTree = (mode: TreeMode): TreeState => ({ mode, base: DEFAULT_BASE[mode], open: [], closed: [], deep: [], rootId: null });

export function toggleNode(s: TreeState, id: string, isOpen: boolean, limb: boolean): TreeState {
  const without = (arr: string[]) => arr.filter((x) => x !== id);
  if (limb) {
    return {
      ...s,
      deep: [...without(s.deep), id],
      open: without(s.open),
      closed: s.closed.filter((x) => x !== id && !x.startsWith(id + SEP)),
    };
  }
  if (isOpen) return { ...s, open: without(s.open), deep: without(s.deep), closed: [...without(s.closed), id] };
  return { ...s, closed: without(s.closed), open: [...without(s.open), id] };
}

// ---------------------------------------------------------------------------
// Visible tree and layout
// ---------------------------------------------------------------------------

export const CARD_W = 152;
export const CARD_H = 104;
export const COMPACT_H = 44;
export const COL_GAP = 64;
export const LEAF_GAP = 10;
export const SUB_GAP = 18;
export const MARGIN = 12;
export const MAX_CARDS = 400;

export interface VNode {
  node: TNode;
  depth: number;
  open: boolean;
  hasKids: boolean;
  children: VNode[];
  compact: boolean;
  x: number;
  y: number;
  h: number;
}

export interface TreeLayout {
  root: VNode;
  all: VNode[];
  width: number;
  height: number;
  truncated: boolean;
}

export function layoutTree(start: TNode, s: TreeState): TreeLayout {
  const open = new Set(s.open);
  const closed = new Set(s.closed);
  const deep = new Set(s.deep);
  const all: VNode[] = [];
  let truncated = false;

  // 1) visible tree, breadth-first so the card cap cuts the deepest level first
  const mk = (n: TNode, depth: number): VNode => ({ node: n, depth, open: false, hasKids: !!n.kids, children: [], compact: false, x: 0, y: 0, h: CARD_H });
  const root = mk(start, 0);
  all.push(root);
  const queue: { v: VNode; inherited: boolean }[] = [{ v: root, inherited: false }];
  while (queue.length) {
    const { v, inherited } = queue.shift() as { v: VNode; inherited: boolean };
    const id = v.node.id;
    const isOpen = !!v.node.kids && !closed.has(id) && (open.has(id) || deep.has(id) || inherited || v.depth < s.base);
    if (!isOpen) continue;
    const kids = v.node.kids ? v.node.kids() : [];
    if (all.length + kids.length > MAX_CARDS) {
      truncated = true;
      continue;
    }
    v.open = true;
    v.children = kids.map((k) => mk(k, v.depth + 1));
    for (const c of v.children) {
      all.push(c);
      queue.push({ v: c, inherited: inherited || deep.has(id) });
    }
  }

  // 2) card sizes: compact from depth 3, or for leaves when the tree is tall
  const leaves = all.filter((v) => v.children.length === 0).length;
  const tall = leaves > 6;
  for (const v of all) {
    v.compact = v.depth >= 3 || (tall && v.depth >= 1 && v.children.length === 0);
    v.h = v.compact ? COMPACT_H : CARD_H;
  }

  // 3) positions: leaves consecutive, parents centred on their children block
  let cursor = MARGIN;
  const shift = (v: VNode, dy: number) => {
    v.y += dy;
    for (const c of v.children) shift(c, dy);
  };
  const place = (v: VNode) => {
    v.x = MARGIN + v.depth * (CARD_W + COL_GAP);
    if (v.children.length === 0) {
      v.y = cursor;
      cursor += v.h + LEAF_GAP;
      return;
    }
    const startY = cursor;
    v.children.forEach((c, i) => {
      if (i > 0 && (c.children.length > 0 || v.children[i - 1].children.length > 0)) cursor += SUB_GAP - LEAF_GAP;
      place(c);
    });
    const first = v.children[0];
    const last = v.children[v.children.length - 1];
    const mid = (first.y + first.h / 2 + last.y + last.h / 2) / 2;
    let top = mid - v.h / 2;
    if (top < startY) {
      const dy = startY - top;
      for (const c of v.children) shift(c, dy);
      cursor += dy;
      top = startY;
    }
    v.y = top;
    cursor = Math.max(cursor, top + v.h + LEAF_GAP);
  };
  place(root);

  const maxDepth = Math.max(...all.map((v) => v.depth));
  return {
    root,
    all,
    truncated,
    width: 2 * MARGIN + (maxDepth + 1) * CARD_W + maxDepth * COL_GAP,
    height: cursor - LEAF_GAP + MARGIN,
  };
}
