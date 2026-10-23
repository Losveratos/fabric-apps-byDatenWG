import { describe, expect, it } from 'vitest';

import { makeCompute } from '@/lib/sales/compute';
import { KPI_BY_ID } from '@/lib/sales/kpis';
import { lastClosedMonth } from '@/lib/sales/model';
import { makeTestData } from '@/test/sales-fixture';

import type { DataCtx } from './analyse-data';
import { buildRoot, CARD_W, findNode, initTree, layoutTree, SEP, toggleNode, type VNode } from './tree';

function ctx(): DataCtx {
  const data = makeTestData();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const c = makeCompute(data, { year: 2022, months, filter: {} });
  return { agg: c.agg, year: 2022, pyYear: 2021, months, filter: {}, lastClosed: lastClosedMonth(data, 2022) };
}

const overlaps = (a: VNode, b: VNode) => a.x < b.x + CARD_W && b.x < a.x + CARD_W && a.y < b.y + b.h && b.y < a.y + a.h;

describe('driver tree', () => {
  it('formula tree multiplies out', () => {
    const root = buildRoot(ctx(), 'formula', KPI_BY_ID.won);
    const [n, avg] = root.kids!();
    expect(n.ac * avg.ac).toBeCloseTo(root.ac, 3);
    const [k, q] = n.kids!();
    expect(k.ac * q.ac).toBeCloseTo(n.ac, 6);
  });

  it('structure children sum to the parent', () => {
    for (const mode of ['region', 'product', 'sales'] as const) {
      const root = buildRoot(ctx(), mode, KPI_BY_ID.won);
      const kids = root.kids!();
      expect(kids.reduce((s, x) => s + x.ac, 0)).toBeCloseTo(root.ac, 3);
      expect(kids.every((x) => x.op === '+')).toBe(true);
    }
  });

  it('lays out without overlapping cards and with parents centred', () => {
    for (const mode of ['formula', 'region', 'product', 'sales'] as const) {
      const root = buildRoot(ctx(), mode, KPI_BY_ID.won);
      const l = layoutTree(root, { ...initTree(mode), base: Infinity });
      for (let i = 0; i < l.all.length; i++)
        for (let j = i + 1; j < l.all.length; j++) expect(overlaps(l.all[i], l.all[j])).toBe(false);
      for (const v of l.all) {
        expect(Number.isFinite(v.x) && Number.isFinite(v.y)).toBe(true);
        expect(v.y + v.h).toBeLessThanOrEqual(l.height);
      }
    }
  });

  it('toggles, expands a limb and finds re-rooted nodes', () => {
    const c = ctx();
    const root = buildRoot(c, 'region', KPI_BY_ID.won);
    let s = initTree('region');
    let l = layoutTree(root, s);
    const bl = l.root.children[0];
    expect(bl.open).toBe(false);
    s = toggleNode(s, bl.node.id, false, false);
    l = layoutTree(root, s);
    expect(l.root.children[0].open).toBe(true);
    s = toggleNode(s, 'root', true, false);
    expect(layoutTree(root, s).all.length).toBe(1);
    s = toggleNode(s, 'root', false, true);
    expect(layoutTree(root, s).all.every((v) => !v.hasKids || v.open)).toBe(true);
    expect(findNode(root, bl.node.id)?.label).toBe(bl.node.label);
    expect(findNode(root, 'root' + SEP + 'gibt es nicht')).toBeNull();
  });
});
