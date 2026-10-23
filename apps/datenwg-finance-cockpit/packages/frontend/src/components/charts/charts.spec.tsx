import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ProfitBridge } from './ProfitBridge';
import { StructureChart } from './StructureChart';

import { CockpitContext, type CockpitContextValue } from '@/hooks/cockpit.context';
import { cubeIndex, emptyCube, STORED, type BaseKpi, type MemberFilter, type Scen } from '@/lib/cockpit/cube';
import { buildCatalogue, kpiValue, type KpiDef } from '@/lib/cockpit/kpis';
import { choiceOf, DEFAULT_VIEW, filterOf, monthsOf, primaryCode, type View } from '@/lib/cockpit/view';

const KPIS: BaseKpi[] = [
  { id: 'Revenue', group: 'Ergebnis', unit: 'EUR', higherBetter: true, sort: 1 },
  { id: 'COGS', group: 'Kosten', unit: 'EUR', higherBetter: false, sort: 2 },
  { id: 'Discount', group: 'Kosten', unit: 'EUR', higherBetter: false, sort: 3 },
  { id: 'Marketing Spend', group: 'Kosten', unit: 'EUR', higherBetter: false, sort: 4 },
  { id: 'Profit', group: 'Ergebnis', unit: 'EUR', higherBetter: true, sort: 5 },
];

function makeCube() {
  const markets = [
    { land: 'Germany', region: 'Europe', reife: 'reif' },
    { land: 'France', region: 'Europe', reife: 'reif' },
    { land: 'Argentina', region: 'LatAm', reife: 'jung' },
  ];
  const products = [
    { produkt: 'Alpha', kategorie: 'A', linie: 'x' },
    { produkt: 'Beta', kategorie: 'B', linie: 'x' },
  ];
  const cube = emptyCube(2026, 8, KPIS, markets, products);
  for (const s of STORED)
    for (let c = 0; c < 3; c++)
      for (let p = 0; p < 2; p++)
        for (let m = 0; m < 12; m++) {
          const f = s === 'AC' ? (c === 2 ? 0.95 : 1.15) : s === 'PY' ? 0.9 : 1;
          const rev = 1e6 * (c + 1) * (p + 1) * f;
          const cogs = 0.5e6 * (c + 1) * (p + 1);
          const disc = 0.05e6;
          const mkt = 0.1e6;
          const vals = [rev, cogs, disc, mkt, rev - cogs - disc - mkt];
          vals.forEach((v, k) => (cube.values[s][cubeIndex(cube, c, p, m, k)] = v));
        }
  return cube;
}

function ctxFor(view: View, setView = vi.fn()): CockpitContextValue {
  const cube = makeCube();
  const catalogue = buildCatalogue(cube);
  const months = monthsOf(view, cube);
  const choice = choiceOf(view);
  const filter = filterOf(view, cube);
  return {
    cube,
    catalogue,
    view,
    setView,
    months,
    choice,
    filter,
    kpi: catalogue.find((k) => k.id === view.kpi) ?? catalogue[0],
    primary: primaryCode(view, cube),
    value: (kpi: KpiDef, scen: Scen, ms = months, f: MemberFilter = filter) => kpiValue(cube, kpi, scen, ms, f, choice),
    refCode: (r) => r,
    scenName: (s) => s,
  };
}

const renderWith = (node: ReactNode, ctx: CockpitContextValue) =>
  render(<CockpitContext.Provider value={ctx}>{node}</CockpitContext.Provider>);

describe('StructureChart', () => {
  it('renders all lands with messages and no NaN text', () => {
    const { container } = renderWith(<StructureChart />, ctxFor(DEFAULT_VIEW));
    expect(screen.getByText('Umsatz nach Land')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Filter umschalten/ })).toHaveLength(3);
    expect(container.textContent).toMatch(/Größter Beitrag: France \+7,2/);
    expect(container.textContent).toMatch(/größte Lücke: Argentina/);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it('toggles all lands of a region on click', () => {
    const setView = vi.fn();
    renderWith(<StructureChart />, ctxFor({ ...DEFAULT_VIEW, structDim: 'region' }, setView));
    fireEvent.click(screen.getByRole('button', { name: /^Europe/ }));
    expect(setView).toHaveBeenCalledWith({ markets: ['Germany', 'France'] });
  });

  it('removes a selected product category with Enter and offers Filter aufheben', () => {
    const setView = vi.fn();
    renderWith(<StructureChart />, ctxFor({ ...DEFAULT_VIEW, structDim: 'kategorie', products: ['Alpha'] }, setView));
    expect(screen.getByText('Filter aufheben')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('button', { name: /^A:/ }), { key: 'Enter' });
    expect(setView).toHaveBeenCalledWith({ products: [] });
  });
});

describe('ProfitBridge', () => {
  it('closes from PL to AC and selects a driver on click', () => {
    const setView = vi.fn();
    const { container } = renderWith(<ProfitBridge />, ctxFor(DEFAULT_VIEW, setView));
    expect(screen.getByText('Ergebnis PL')).toBeTruthy();
    expect(screen.getByText('Ergebnis AC')).toBeTruthy();
    expect(screen.queryByText('Sonstiges')).toBeNull();
    expect(container.textContent).toMatch(/über PL, vor allem durch Umsatz/);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
    fireEvent.click(screen.getByRole('button', { name: /^Herstellkosten/ }));
    expect(setView).toHaveBeenCalledWith({ kpi: 'COGS' });
  });

  it('handles a full-year AC&FC period', () => {
    const { container } = renderWith(<ProfitBridge />, ctxFor({ ...DEFAULT_VIEW, period: 'fy', ref: 'PY' }));
    expect(screen.getByText('Ergebnis AC&FC')).toBeTruthy();
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });
});
