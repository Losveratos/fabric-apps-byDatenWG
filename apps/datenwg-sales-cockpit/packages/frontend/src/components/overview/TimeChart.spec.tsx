import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SalesTestProvider, makeTestData } from '@/test/sales-fixture';
import { makeCompute } from '@/lib/sales/compute';
import { KPI_BY_ID, KPIS, type KpiId } from '@/lib/sales/kpis';
import type { TimeVariant, View } from '@/lib/sales/view';

import { TimeChart } from './TimeChart';
import { bridgeOf, buildRows } from './varint';

const VARIANTS: TimeVariant[] = ['integrated', 'cumulative'];
const BAD = /NaN|Infinity|undefined/;

function setup(view?: Partial<View>) {
  return render(
    <SalesTestProvider view={view}>
      <TimeChart />
    </SalesTestProvider>
  );
}

function zoom() {
  fireEvent.click(screen.getByRole('button', { name: 'Vergrößern' }));
  return screen.getByRole('dialog');
}

function bridgeOfDom(root: Element) {
  const total = root.querySelector('[data-bridge-total]');
  const parts = [...root.querySelectorAll('[data-bridge-d]')].map((e) => Number(e.getAttribute('data-bridge-d')));
  return { total: Number(total?.getAttribute('data-bridge-total')), parts };
}

describe('TimeChart', () => {
  afterEach(cleanup);

  for (const kpi of KPIS.map((k) => k.id as KpiId))
    for (const timeVariant of VARIANTS)
      it(`renders ${kpi} / ${timeVariant} without NaN`, () => {
        const { container } = setup({ kpi, timeVariant });
        expect(container.innerHTML).not.toMatch(BAD);
        expect(screen.getAllByRole('button', { name: /2022:/ })).toHaveLength(12);
      });

  it('offers only Integriert and Kumuliert, old variants fall back to integrated', () => {
    const { container } = setup({ timeVariant: 'columns' });
    const sw = screen.getByRole('radiogroup', { name: 'Darstellung Zeitreihe' });
    expect(within(sw).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Integriert', 'Kumuliert']);
    expect(within(sw).getByRole('radio', { name: 'Integriert' })).toHaveAttribute('aria-checked', 'true');
    expect(container.textContent).toContain('ΔPY%');
    cleanup();
    setup({ timeVariant: 'line' });
    expect(screen.getByRole('radio', { name: 'Integriert' })).toHaveAttribute('aria-checked', 'true');
  });

  it('draws the three integrated tiers with the Δ bridge for additive KPIs', () => {
    const { container } = setup();
    for (const cap of ['ΔPY%', 'ΔPY', 'AC und PY']) expect([...container.querySelectorAll('text')].some((t) => t.textContent === cap)).toBe(true);
    const { parts, total } = bridgeOfDom(container);
    expect(parts).toHaveLength(12);
    expect(Number.isFinite(total)).toBe(true);
  });

  it('closes the bridge: Σ equals Σ AC − Σ PY of the period', () => {
    const data = makeTestData();
    const fy = Array.from({ length: 12 }, (_, i) => i + 1);
    const cases: { view: Partial<View>; year: number; months: number[] }[] = [
      { view: {}, year: 2022, months: fy },
      { view: { period: 'month', month: 5 }, year: 2022, months: [5] },
      { view: { year: 2023 }, year: 2023, months: fy },
    ];
    for (const { view, year, months } of cases) {
      const { container } = setup(view);
      const c = makeCompute(data, { year, months, filter: {} });
      const k = KPI_BY_ID.won;
      const expected = c.total(k) - c.total(k, { year: year - 1 });
      const { parts, total } = bridgeOfDom(container);
      expect(parts).toHaveLength(months.length);
      expect(total).toBeCloseTo(expected, 6);
      expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(total, 6);
      cleanup();
    }
  });

  it('bridgeOf runs from the cumulative level and sums to the total', () => {
    const k = KPI_BY_ID.won;
    const ac = [5, 3, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0];
    const py = [4, 6, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0];
    const b = bridgeOf(k, buildRows(k, ac, py, 12, [1, 2, 3, 4]));
    expect(b.segs.map((s) => [s.from, s.to])).toEqual([
      [0, 1],
      [1, -2],
      [-2, 4],
      [4, 4],
    ]);
    expect(b.total).toBe(4);
    expect(b.segs[1].good).toBe(false);
  });

  it('shows plain ΔPY columns instead of a bridge for non-additive KPIs', () => {
    const { container } = setup({ kpi: 'avgDeal' });
    expect(container.textContent).toContain('ΔPY (nicht additiv)');
    expect(container.querySelector('[data-bridge-total]')).toBeNull();
  });

  it('renders the open months of the snapshot year faded without NaN', () => {
    const { container } = setup({ year: 2023, timeVariant: 'integrated' });
    expect(container.innerHTML).not.toMatch(BAD);
    expect(container.textContent).toContain('noch offen');
    expect(screen.getByRole('button', { name: /^Dez 2023:.*noch offen$/ })).toBeInTheDocument();
  });

  it('shows title, IBCS subtitle and key message', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Auftragseingang je Monat' })).toBeVisible();
    expect(screen.getByText('Mio. € · AC vs PY · 2022')).toBeVisible();
    expect(screen.getByText(/Auftragseingang Jan\.\.Dez 2022 liegt/)).toBeVisible();
  });

  it('shows the data-quality warning of a KPI', () => {
    setup({ kpi: 'winRate' });
    expect(screen.getByText(/Quote ist dort zu hoch/)).toBeVisible();
  });

  it('selects a month by click and keyboard, resets via Alle and Escape', () => {
    setup();
    const may = screen.getByRole('button', { name: /^Mai 2022:/ });
    fireEvent.click(may);
    expect(may).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Auftragseingang Mai 2022 liegt/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Alle' }));
    expect(screen.getByText(/Auftragseingang Jan\.\.Dez 2022 liegt/)).toBeVisible();

    const jun = screen.getByRole('button', { name: /^Jun 2022/ });
    fireEvent.keyDown(jun, { key: 'Enter' });
    expect(jun).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(jun, { key: 'Escape' });
    expect(jun).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to the cumulative variant through the header switch', () => {
    const { container } = setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Kumuliert' }));
    expect(screen.getByRole('radio', { name: 'Kumuliert' })).toHaveAttribute('aria-checked', 'true');
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(12);
    expect(container.querySelector('[data-bridge-total]')).toBeNull();
  });

  it('draws negative bridge contributions below their running level', () => {
    const { container } = setup();
    expect(container.innerHTML).not.toMatch(BAD);
    // At least one month of the fixture is below PY: its bar has a red (bad) fill.
    const bad = [...container.querySelectorAll('[data-bridge-d]')].filter((e) => Number(e.getAttribute('data-bridge-d')) < 0);
    for (const e of bad) expect(e.getAttribute('fill')).toBe('var(--ibcs-bad)');
  });

  it('renders the zoomed single chart with the zoom-only switch', () => {
    setup();
    const dlg = zoom();
    expect(within(dlg).getByRole('radiogroup', { name: 'Ansicht im Zoom' })).toBeVisible();
    expect(within(dlg).getByRole('radio', { name: 'Einzeln' })).toHaveAttribute('aria-checked', 'true');
    expect(within(dlg).getAllByRole('button', { name: /2022:/ })).toHaveLength(12);
    expect(within(dlg).queryByRole('radiogroup', { name: 'Dimension der Small Multiples' })).toBeNull();
    expect(dlg.innerHTML).not.toMatch(BAD);
  });

  const DIMS: { label: string; members: number }[] = [
    { label: 'Vertriebler', members: 3 },
    { label: 'Bundesland', members: 2 },
    { label: 'Produktgruppe', members: 2 },
    { label: 'Produkttyp', members: 2 },
    { label: 'Top 12 Kunden', members: 4 },
  ];
  for (const kpi of ['won', 'avgDeal'] as KpiId[])
    for (const d of DIMS)
      it(`renders small multiples per ${d.label} (${kpi})`, () => {
        setup({ kpi });
        const dlg = zoom();
        fireEvent.click(within(dlg).getByRole('radio', { name: 'Small Multiples' }));
        fireEvent.click(within(dlg).getByRole('radio', { name: d.label }));
        const list = within(dlg).getByRole('list', { name: /^Small Multiples je/ });
        const cards = within(list).getAllByRole('button', { name: /Einzeln anzeigen$/ });
        expect(cards).toHaveLength(d.members);
        expect(dlg.innerHTML).not.toMatch(BAD);
        expect(dlg.textContent).toContain('gemeinsamer Maßstab');
        // sorted by AC desc
        const ac = cards.map((c) => Number((c.getAttribute('aria-label') ?? '').match(/AC (−?[\d.,]+)/)?.[1].replace(/\./g, '').replace(',', '.').replace('−', '-')));
        expect([...ac].sort((a, b) => b - a)).toEqual(ac);
        // own scale
        fireEvent.click(within(dlg).getByRole('radio', { name: 'je Kachel' }));
        expect(dlg.textContent).toContain('eigener Maßstab');
        expect(dlg.innerHTML).not.toMatch(BAD);
      });

  it('each multiple closes its own bridge', () => {
    setup();
    const dlg = zoom();
    fireEvent.click(within(dlg).getByRole('radio', { name: 'Small Multiples' }));
    const list = within(dlg).getByRole('list', { name: /^Small Multiples je/ });
    const cards = within(list).getAllByRole('button');
    let sum = 0;
    for (const c of cards) {
      const { parts, total } = bridgeOfDom(c);
      expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(total, 6);
      sum += total;
    }
    // members of a dimension add up to the unfiltered total variance
    const c = makeCompute(makeTestData(), { year: 2022, months: Array.from({ length: 12 }, (_, i) => i + 1), filter: {} });
    expect(sum).toBeCloseTo(c.total(KPI_BY_ID.won) - c.total(KPI_BY_ID.won, { year: 2021 }), 6);
  });

  it('zooms into a multiple, shows a breadcrumb and goes back', () => {
    setup();
    const dlg = zoom();
    fireEvent.click(within(dlg).getByRole('radio', { name: 'Small Multiples' }));
    fireEvent.click(within(dlg).getByRole('button', { name: /^Ben: .*Einzeln anzeigen$/ }));
    expect(within(dlg).getByRole('radio', { name: 'Einzeln' })).toHaveAttribute('aria-checked', 'true');
    const nav = within(dlg).getByRole('navigation', { name: 'Pfad' });
    expect(nav.textContent).toContain('Vertriebler › Ben');
    expect(within(dlg).getAllByRole('button', { name: /2022:/ })).toHaveLength(12);

    // the big chart now shows Ben only
    const data = makeTestData();
    const c = makeCompute(data, { year: 2022, months: Array.from({ length: 12 }, (_, i) => i + 1), filter: { vertriebler: ['Ben'] } });
    expect(bridgeOfDom(dlg).total).toBeCloseTo(c.total(KPI_BY_ID.won) - c.total(KPI_BY_ID.won, { year: 2021 }), 6);

    fireEvent.click(within(nav).getByRole('button', { name: /Zurück zu Small Multiples/ }));
    expect(within(dlg).getByRole('radio', { name: 'Small Multiples' })).toHaveAttribute('aria-checked', 'true');
    expect(within(dlg).queryByRole('navigation', { name: 'Pfad' })).toBeNull();
    // filter cleared: no card is pressed
    for (const b of within(dlg).getAllByRole('button', { name: /Einzeln anzeigen$/ })) expect(b).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the zoom mode while the zoom closes and reopens', () => {
    setup();
    let dlg = zoom();
    fireEvent.click(within(dlg).getByRole('radio', { name: 'Small Multiples' }));
    fireEvent.click(within(dlg).getByRole('radio', { name: 'Produktgruppe' }));
    fireEvent.click(within(dlg).getByRole('button', { name: 'Schließen' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    dlg = zoom();
    expect(within(dlg).getByRole('radio', { name: 'Produktgruppe' })).toHaveAttribute('aria-checked', 'true');
  });
});
