// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AnalysePage } from '@/pages/AnalysePage';
import { KPIS } from '@/lib/sales/kpis';
import type { View } from '@/lib/sales/view';
import { SalesTestProvider } from '@/test/sales-fixture';

const BAD = /NaN|undefined|Infinity|null/;

function renderPage(view?: Partial<View>) {
  return render(
    <SalesTestProvider view={view}>
      <AnalysePage />
    </SalesTestProvider>
  );
}

function expectClean(container: HTMLElement) {
  expect(container.textContent ?? '').not.toMatch(BAD);
  for (const el of container.querySelectorAll('rect, line, circle, text, svg')) {
    for (const a of ['x', 'y', 'width', 'height', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'viewBox']) {
      const v = el.getAttribute(a);
      if (v !== null) expect(v, `${el.tagName}[${a}]`).not.toMatch(BAD);
    }
  }
}

afterEach(cleanup);

describe('AnalysePage', () => {
  it('renders overview, KPI chips and the formula tree without NaN', () => {
    const { container } = renderPage();
    expect(screen.getByRole('radiogroup', { name: 'Kennzahl' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio', { checked: true }).length).toBeGreaterThan(0);
    expect(screen.getByText('Zeitanalyse')).toBeInTheDocument();
    expect(screen.getByText('Werttreiberbaum')).toBeInTheDocument();
    expect(container.textContent).toMatch(/über PY|unter PY|Höhe des Vorjahres/);
    expect(container.textContent).toContain('Aufträge je Kunde');
    expectClean(container);
  });

  it('renders every KPI in both time modes without NaN', () => {
    for (const k of KPIS) {
      for (const multiples of [false, true]) {
        const { container } = renderPage({ kpi: k.id, multiples });
        expectClean(container);
        cleanup();
      }
    }
  }, 90_000); // 20 full page renders; slow under parallel test load

  it('renders small multiples for every dimension and scale', () => {
    for (const multDim of ['vertriebler', 'bundesland', 'gruppe', 'typ', 'kunde'] as const) {
      for (const multScale of ['shared', 'own'] as const) {
        const { container } = renderPage({ multiples: true, multDim, multScale });
        expect(container.querySelectorAll('button[aria-pressed]').length).toBeGreaterThan(0);
        if (multScale === 'own') expect(container.textContent).toContain('eigene Skala');
        expectClean(container);
        cleanup();
      }
    }
  });

  it('zooms into a card and back via the breadcrumb', () => {
    const { container } = renderPage({ multiples: true, multDim: 'vertriebler' });
    fireEvent.click(screen.getByRole('button', { name: /^Anna/ }));
    const nav = screen.getByRole('navigation', { name: 'Zoom-Pfad' });
    expect(within(nav).getByText(/Vertriebler: Anna/)).toBeInTheDocument();
    expectClean(container);
    fireEvent.click(within(nav).getByRole('button', { name: /Gesamt/ }));
    expect(screen.queryByRole('navigation', { name: 'Zoom-Pfad' })).toBeNull();
  });

  it('renders all tree modes fully expanded without NaN', () => {
    for (const treeMode of ['formula', 'region', 'product', 'sales'] as const) {
      for (const kpi of ['won', 'cycle', 'openV'] as const) {
        const { container } = renderPage({ treeMode, kpi });
        fireEvent.click(screen.getByRole('radio', { name: 'Alle' }));
        expectClean(container);
        if (treeMode !== 'formula' && kpi === 'cycle') expect(container.textContent).toContain('nicht summierbar');
        cleanup();
      }
    }
  });

  it('expands, re-roots and filters in the region tree', () => {
    const { container } = renderPage({ treeMode: 'region' });
    const expand = screen.getAllByRole('button', { name: /Bayern aufklappen/ })[0];
    fireEvent.click(expand);
    expect(container.textContent).toContain('München');
    fireEvent.click(screen.getByRole('button', { name: 'Bayern als Wurzel anzeigen' }));
    expect(screen.getByRole('button', { name: /Zurück zum Gesamtbaum/ })).toBeInTheDocument();
    expectClean(container);
    fireEvent.click(screen.getByRole('button', { name: /Zurück zum Gesamtbaum/ }));
    const card = screen.getByRole('button', { name: /^Bayern:.*Als Filter umschalten/ });
    fireEvent.click(card);
    expect(screen.getByRole('button', { name: /^Bayern:.*Als Filter umschalten/ })).toHaveAttribute('aria-pressed', 'true');
    expectClean(container);
  });
});
