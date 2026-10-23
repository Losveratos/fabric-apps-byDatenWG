import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { CockpitContext, type CockpitContextValue } from '@/hooks/cockpit.context';
import { cubeIndex, emptyCube, NO_FILTER, type BaseKpi, type BaseScenario, type Cube } from '@/lib/cockpit/cube';
import { buildCatalogue, kpiValue } from '@/lib/cockpit/kpis';
import { choiceOf, DEFAULT_VIEW, monthsOf, primaryCode, type TimeVariant, type View } from '@/lib/cockpit/view';

import { TimeChart } from './TimeChart';

const KPIS: BaseKpi[] = [
  { id: 'Revenue', group: 'Ergebnis', unit: 'EUR', higherBetter: true, sort: 1 },
  { id: 'Profit', group: 'Ergebnis', unit: 'EUR', higherBetter: true, sort: 2 },
  { id: 'Customer Satisfaction', group: 'Kunde', unit: 'Punkte', higherBetter: true, sort: 3 },
];

function makeCube(): Cube {
  const cube = emptyCube(2026, 8, KPIS, [{ land: 'DE', region: 'EU', reife: 'x' }], [{ produkt: 'A', kategorie: 'K', linie: 'L' }]);
  const set = (s: BaseScenario, k: number, m: number, v: number) => {
    cube.values[s][cubeIndex(cube, 0, 0, m - 1, k)] = v;
  };
  for (let m = 1; m <= 12; m++) {
    const rev = 10e6 + m * 1e6;
    for (const s of ['PL1', 'PL2', 'FC1', 'FC2', 'FC3', 'PY'] as BaseScenario[]) set(s, 0, m, rev * (s === 'PY' ? 0.9 : 1));
    if (m <= 8) set('AC', 0, m, rev * (m % 2 ? 1.1 : 0.95));
    // Profit negative in some months
    for (const s of ['PL1', 'PL2', 'FC1', 'FC2', 'FC3', 'PY'] as BaseScenario[]) set(s, 1, m, 1e6);
    if (m <= 8) set('AC', 1, m, m === 3 ? -2e6 : 1.2e6);
    // Satisfaction with blanks
    for (const s of ['PL1', 'PL2', 'FC1', 'FC2', 'FC3', 'PY'] as BaseScenario[]) if (m !== 5) set(s, 2, m, 7.5);
    if (m <= 8 && m !== 4) set('AC', 2, m, 7.8);
  }
  // Outlier for capping
  set('AC', 0, 2, 60e6);
  return cube;
}

function Harness({ initial }: { initial?: Partial<View> }) {
  const [view, setV] = useState<View>({ ...DEFAULT_VIEW, ...initial });
  const [cube] = useState(makeCube);
  const catalogue = buildCatalogue(cube);
  const kpi = catalogue.find((k) => k.id === view.kpi) ?? catalogue[0];
  const months = monthsOf(view, cube);
  const choice = choiceOf(view);
  const ctx: CockpitContextValue = {
    cube,
    catalogue,
    view,
    setView: (p) => setV((v) => ({ ...v, ...p })),
    months,
    choice,
    filter: NO_FILTER,
    kpi,
    primary: primaryCode(view, cube),
    value: (k, s, ms = months, f = NO_FILTER) => kpiValue(cube, k, s, ms, f, choice),
    refCode: (r) => r,
    scenName: (s) => s,
  };
  return (
    <CockpitContext.Provider value={ctx}>
      <TimeChart />
    </CockpitContext.Provider>
  );
}

const VARIANTS: TimeVariant[] = ['integrated', 'columns', 'line', 'cumulative'];

describe('TimeChart', () => {
  afterEach(cleanup);

  for (const kpi of ['Revenue', 'Profit', 'Customer Satisfaction', 'margin'])
    for (const timeVariant of VARIANTS)
      for (const ref of ['PY', 'PL', 'FC'] as const)
        it(`renders ${kpi} / ${timeVariant} / ${ref} without NaN`, () => {
          const { container } = render(<Harness initial={{ kpi, timeVariant, ref }} />);
          expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
          expect(screen.getAllByRole('button', { name: /2026:/ })).toHaveLength(12);
        });

  it('shows title, IBCS subtitle and key message', () => {
    render(<Harness />);
    expect(screen.getByRole('heading', { name: 'Umsatz je Monat' })).toBeVisible();
    expect(screen.getByText('Mio. € · AC/FC vs PL · 2026')).toBeVisible();
    expect(screen.getByText(/Umsatz Jan..Aug 2026 liegt/)).toBeVisible();
  });

  it('selects a month by click and keyboard, resets via Alle and Escape', () => {
    render(<Harness />);
    const may = screen.getByRole('button', { name: /^Mai 2026: AC 16,5; PL 15,0$/ });
    fireEvent.click(may);
    expect(may).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Umsatz Mai 2026 liegt/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Alle' }));
    expect(screen.getByText(/Umsatz Jan..Aug 2026 liegt/)).toBeVisible();

    const jun = screen.getByRole('button', { name: /^Jun 2026/ });
    fireEvent.keyDown(jun, { key: 'Enter' });
    expect(jun).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(jun, { key: 'Escape' });
    expect(jun).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches variants through the header switch', () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole('radio', { name: 'Linie' }));
    expect(screen.getByRole('radio', { name: 'Linie' })).toHaveAttribute('aria-checked', 'true');
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(12);
  });

  it('draws negative profit months below the zero line', () => {
    const { container } = render(<Harness initial={{ kpi: 'Profit', timeVariant: 'columns' }} />);
    expect(container.textContent).toContain('−2,0');
  });
});
