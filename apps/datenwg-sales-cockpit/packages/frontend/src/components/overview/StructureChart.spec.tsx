import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { makeCompute } from '@/lib/sales/compute';
import { KPI_BY_ID, KPIS, type KpiId } from '@/lib/sales/kpis';
import type { Dim } from '@/lib/sales/model';
import type { View } from '@/lib/sales/view';
import { makeTestData, SalesTestProvider } from '@/test/sales-fixture';

import { StructureChart } from './StructureChart';
import { bridgeDomain, buildBridge, type BridgeData, type StructSort } from './StructureBridgeModel';

const DIMS: Dim[] = ['vertriebler', 'bundesland', 'gruppe', 'typ', 'kunde'];
const SORTS: StructSort[] = ['value', 'delta'];
const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const BAD_TEXT = /NaN|Infinity|undefined/;

function setup(view?: Partial<View>) {
  return render(
    <SalesTestProvider view={view}>
      <StructureChart />
    </SalesTestProvider>
  );
}

function compute() {
  const data = makeTestData();
  return { data, ...makeCompute(data, { year: 2022, months: ALL_MONTHS, filter: {} }), pyYear: 2021 };
}

/** PY Σ + Σ Δ = AC Σ, and every segment starts where the previous one ended. */
function expectCloses(b: BridgeData) {
  expect(b.bridge).toBe(true);
  expect(b.pySum + b.deltaSum).toBeCloseTo(b.acSum, 6);
  const body = b.rows.filter((r) => r.kind === 'member' || r.kind === 'rest');
  let run = b.pySum;
  for (const r of body) {
    expect(r.from).toBeCloseTo(run, 6);
    expect(r.to).toBeCloseTo(r.from + r.delta, 6);
    run = r.to;
  }
  expect(run).toBeCloseTo(b.acSum, 6);
  expect(b.rows[0].kind).toBe('start');
  expect(b.rows[b.rows.length - 1].kind).toBe('end');
}

function zoom() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Vergrößern' })[0]);
  return within(screen.getByRole('dialog'));
}

describe('StructureChart', () => {
  afterEach(cleanup);

  for (const structDim of DIMS)
    for (const kpi of KPIS.map((k) => k.id as KpiId))
      it(`renders ${kpi} by ${structDim} without NaN`, () => {
        const { container } = setup({ structDim, kpi });
        expect(container.innerHTML).not.toMatch(BAD_TEXT);
        expect(screen.getAllByRole('button', { name: /Filter umschalten/ }).length).toBeGreaterThan(0);
        expect(screen.getByText('PY Σ')).toBeInTheDocument();
        expect(screen.getByText('AC Σ')).toBeInTheDocument();
      });

  it('shows title, subtitle and the bridge header', () => {
    const { container } = setup();
    expect(screen.getByRole('heading', { name: 'Auftragseingang nach Vertriebler' })).toBeVisible();
    expect(screen.getByText('Mio. € · AC vs PY · Jan..Dez 2022')).toBeVisible();
    expect(screen.getByText('ΔPY Brücke')).toBeInTheDocument();
    expect(container.querySelector('svg[data-bridge="closed"]')).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'Δ' })).toHaveAttribute('aria-checked', 'true');
  });

  describe('bridge model', () => {
    for (const dim of DIMS)
      for (const sort of SORTS)
        for (const kpiId of KPIS.filter((k) => k.additive).map((k) => k.id))
          it(`closes for ${kpiId} by ${dim}, sort ${sort}, incl. übrige`, () => {
            const ctx = compute();
            const kpi = KPI_BY_ID[kpiId];
            const full = buildBridge(ctx, kpi, dim, { months: ALL_MONTHS, filter: {}, sort, topN: 15 });
            expectCloses(full);
            expect(full.acSum).toBeCloseTo(ctx.total(kpi), 6);
            expect(full.pySum).toBeCloseTo(ctx.total(kpi, { year: 2021 }), 6);

            // topN = 1 forces an "übrige" row that must keep the bridge closed
            const top1 = buildBridge(ctx, kpi, dim, { months: ALL_MONTHS, filter: {}, sort, topN: 1 });
            expectCloses(top1);
            const rest = top1.rows.find((r) => r.kind === 'rest');
            expect(rest).toBeDefined();
            expect(rest?.label).toMatch(/^übrige \(\d+\)$/);
            expect(top1.acSum).toBeCloseTo(full.acSum, 6);
            expect(top1.pySum).toBeCloseTo(full.pySum, 6);
            expect(top1.rows[top1.rows.length - 2].kind).toBe('rest');
          });

    it('sorts members by Δ (favourable first) or by value', () => {
      const ctx = compute();
      const kpi = KPI_BY_ID.won;
      const members = (sort: StructSort) =>
        buildBridge(ctx, kpi, 'kunde', { months: ALL_MONTHS, filter: {}, sort, topN: 15 }).rows.filter((r) => r.kind === 'member');
      const byDelta = members('delta');
      for (let i = 1; i < byDelta.length; i++) expect(byDelta[i - 1].good).toBeGreaterThanOrEqual(byDelta[i].good);
      const byValue = members('value');
      for (let i = 1; i < byValue.length; i++) expect(byValue[i - 1].ac).toBeGreaterThanOrEqual(byValue[i].ac);
    });

    it('falls back to plain ΔPY bars for non-additive KPIs', () => {
      const ctx = compute();
      const kpi = KPI_BY_ID.avgDeal;
      const b = buildBridge(ctx, kpi, 'bundesland', { months: ALL_MONTHS, filter: {}, sort: 'delta', topN: 1 });
      expect(b.bridge).toBe(false);
      expect(b.acSum).toBeCloseTo(ctx.total(kpi), 6);
      for (const r of b.rows.filter((x) => x.kind === 'member' || x.kind === 'rest')) {
        expect(r.from).toBe(0);
        expect(r.to).toBeCloseTo(r.delta, 6);
      }
      expect(bridgeDomain([b]).cut).toBe(false);
    });

    it('cuts the axis only for positive bridges with a small Δ span', () => {
      const ctx = compute();
      const b = buildBridge(ctx, KPI_BY_ID.won, 'vertriebler', { months: ALL_MONTHS, filter: {}, sort: 'delta', topN: 15 });
      const d = bridgeDomain([b]);
      const levels = b.rows.flatMap((r) => (r.kind === 'start' || r.kind === 'end' ? [r.to] : [r.from, r.to]));
      const lo = Math.min(...levels);
      const hi = Math.max(...levels);
      expect(d.cut).toBe(lo > 0 && hi - lo < 0.6 * hi);
      if (d.cut) expect(d.base).toBeLessThan(lo);
      expect(Number.isFinite(d.lo) && Number.isFinite(d.hi) && d.hi > d.lo).toBe(true);
    });
  });

  it('shows the non-additive note', () => {
    const { container } = setup({ kpi: 'avgDeal', structDim: 'bundesland' });
    expect(screen.getByText(/ist nicht additiv/)).toBeInTheDocument();
    expect(container.querySelector('svg[data-bridge="none"]')).not.toBeNull();
    expect(container.innerHTML).not.toMatch(BAD_TEXT);
  });

  it('switches the dimension and the sort order', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Bundesland' }));
    expect(screen.getByRole('heading', { name: 'Auftragseingang nach Bundesland' })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Bayern:/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Wert' }));
    expect(screen.getByRole('radio', { name: 'Wert' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Δ' }));
    expect(screen.getByRole('radio', { name: 'Δ' })).toHaveAttribute('aria-checked', 'true');
  });

  it('cross-filters by click and keyboard and clears the filter', () => {
    setup({ structDim: 'bundesland' });
    expect(screen.queryByRole('button', { name: 'Filter aufheben' })).toBeNull();
    const bayern = screen.getByRole('button', { name: /^Bayern:/ });
    fireEvent.click(bayern);
    expect(screen.getByRole('button', { name: /^Bayern:/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Hessen:/ })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(screen.getByRole('button', { name: /^Hessen:/ }), { key: 'Enter' });
    expect(screen.getByRole('button', { name: /^Hessen:/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Filter aufheben' }));
    expect(screen.getByRole('button', { name: /^Bayern:/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'Filter aufheben' })).toBeNull();
  });

  describe('zoom mode', () => {
    const MEMBERS: Record<Dim, number> = { vertriebler: 3, bundesland: 2, stadt: 2, gruppe: 2, typ: 2, kunde: 4 };
    const LABEL: Record<Dim, string> = {
      vertriebler: 'Vertriebler',
      bundesland: 'Bundesland',
      stadt: 'Stadt',
      gruppe: 'Produktgruppe',
      typ: 'Produkttyp',
      kunde: 'Top 12 Kunden',
    };

    it('offers small multiples only when zoomed', () => {
      setup();
      expect(screen.queryByRole('radio', { name: 'Small Multiples' })).toBeNull();
      const dlg = zoom();
      expect(dlg.getByRole('radio', { name: 'Einzeln' })).toHaveAttribute('aria-checked', 'true');
      expect(dlg.queryByRole('radiogroup', { name: 'aufgeteilt nach' })).toBeNull();
    });

    for (const structDim of ['vertriebler', 'kunde'] as Dim[])
      for (const splitDim of DIMS.filter((d) => d !== structDim))
        it(`renders multiples of ${structDim} split by ${splitDim}`, () => {
          setup({ structDim });
          const dlg = zoom();
          fireEvent.click(dlg.getByRole('radio', { name: 'Small Multiples' }));
          const split = within(dlg.getByRole('radiogroup', { name: 'aufgeteilt nach' }));
          expect(split.queryByRole('radio', { name: LABEL[structDim] })).toBeNull();
          fireEvent.click(split.getByRole('radio', { name: LABEL[splitDim] }));
          expect(split.getByRole('radio', { name: LABEL[splitDim] })).toHaveAttribute('aria-checked', 'true');
          expect(dlg.getAllByRole('button', { name: /Einzelansicht öffnen/ })).toHaveLength(MEMBERS[splitDim]);
          expect(document.body.innerHTML).not.toMatch(BAD_TEXT);
        });

    it('renders multiples of non-additive KPIs without NaN', () => {
      setup({ kpi: 'cycle' });
      const dlg = zoom();
      fireEvent.click(dlg.getByRole('radio', { name: 'Small Multiples' }));
      expect(dlg.getAllByRole('button', { name: /Einzelansicht öffnen/ }).length).toBeGreaterThan(0);
      expect(dlg.getByText(/nicht additiv/)).toBeInTheDocument();
      expect(document.body.innerHTML).not.toMatch(BAD_TEXT);
    });

    it('switches between a shared scale and one scale per card', () => {
      setup();
      const dlg = zoom();
      fireEvent.click(dlg.getByRole('radio', { name: 'Small Multiples' }));
      expect(dlg.getByText(/gemeinsame Skala über alle Kacheln/)).toBeInTheDocument();
      fireEvent.click(dlg.getByRole('radio', { name: 'je Kachel' }));
      expect(dlg.getByText(/Skala je Kachel/)).toBeInTheDocument();
    });

    it('zooms into a card: filters, shows the single bridge with breadcrumb, back clears the filter', () => {
      setup();
      const dlg = zoom();
      fireEvent.click(dlg.getByRole('radio', { name: 'Small Multiples' }));
      fireEvent.click(within(dlg.getByRole('radiogroup', { name: 'aufgeteilt nach' })).getByRole('radio', { name: 'Bundesland' }));
      fireEvent.click(dlg.getByRole('button', { name: /^Bayern:.*Einzelansicht öffnen/ }));

      // back in the single view, zoom still open, filtered to Bayern
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(dlg.getByRole('radio', { name: 'Einzeln' })).toHaveAttribute('aria-checked', 'true');
      const crumb = within(dlg.getByRole('navigation', { name: 'Pfad' }));
      expect(crumb.getByText('Bayern')).toBeInTheDocument();
      expect(dlg.getAllByRole('button', { name: /Filter umschalten/ }).length).toBeGreaterThan(0);

      fireEvent.click(crumb.getByRole('button', { name: /Zurück zu Small Multiples/ }));
      expect(dlg.queryByRole('navigation', { name: 'Pfad' })).toBeNull();
      expect(dlg.getByRole('radio', { name: 'Small Multiples' })).toHaveAttribute('aria-checked', 'true');
      expect(dlg.getAllByRole('button', { name: /Einzelansicht öffnen/ })).toHaveLength(2);
    });
  });
});
