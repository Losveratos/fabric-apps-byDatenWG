import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { KPIS, type KpiId } from '@/lib/rhein/kpis';
import type { View } from '@/lib/rhein/view';
import { RheinTestProvider } from '@/test/rhein-fixture';

import { OverviewPage } from './OverviewPage';

const BAD = /NaN|Infinity|undefined/;

function setup(view?: Partial<View>) {
  return render(
    <RheinTestProvider view={view}>
      <OverviewPage />
    </RheinTestProvider>
  );
}

const timeTile = () => screen.getByRole('heading', { name: / je (Dekade|Jahr)$/ }).closest('section') as HTMLElement;
const epochTile = () => screen.getByRole('heading', { name: / je Epoche$/ }).closest('section') as HTMLElement;

/** No NaN/undefined/Infinity in visible text nor in any SVG attribute. */
function expectClean(container: HTMLElement) {
  expect(container.textContent).not.toMatch(BAD);
  for (const el of container.querySelectorAll('svg, svg *'))
    for (const a of el.attributes) if (BAD.test(a.value)) throw new Error(`${el.tagName} ${a.name}="${a.value}"`);
  expect(container.innerHTML).not.toMatch(BAD);
}

const VIEWS: Partial<View>[] = [
  { grain: 'decade' },
  { grain: 'year' },
  { grain: 'decade', months: [8, 9], epochs: ['ab 1996'] },
  { grain: 'year', months: [1, 2, 12], epochs: ['vor 1920', '1920 bis 1995'], year: 1947 },
];

describe('OverviewPage', () => {
  afterEach(cleanup);

  for (const k of KPIS.map((x) => x.id as KpiId))
    for (const v of VIEWS)
      it(`renders ${k} ${v.grain} m=${v.months?.join(',') ?? ''} e=${v.epochs?.length ?? 0} y=${v.year ?? 0} without NaN`, () => {
        const { container } = setup({ ...v, kpi: k });
        expectClean(container);
        const n = v.grain === 'decade' ? 22 : 209;
        expect(container.querySelectorAll('[data-bucket]')).toHaveLength(n);
        expect(within(epochTile()).getAllByRole('button', { name: /^(vor 1920|1920 bis 1995|ab 1996):/ })).toHaveLength(3);
        expect(within(timeTile()).getByText(/Referenz/)).toBeInTheDocument();
      });

  it('shows five KPI cards and selects a KPI on click', () => {
    const { container } = setup();
    expect(container.querySelectorAll('[data-delta-row="REF"]')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: /^Hochwasser HQ: AC/ }));
    expect(screen.getByRole('button', { name: /^Hochwasser HQ: AC/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Hochwasser HQ je Dekade' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Hochwasser HQ je Epoche' })).toBeVisible();
  });

  it('clicking a decade switches to years and highlights the decade; clicking a year opens the detail', () => {
    const { container } = setup();
    fireEvent.click(within(timeTile()).getByRole('button', { name: /^1940er:/ }));
    expect(screen.getByRole('heading', { name: 'Mittelwasser MQ je Jahr' })).toBeVisible();
    expect(container.querySelector('[data-focus-decade="1940"]')).not.toBeNull();
    fireEvent.click(within(timeTile()).getByRole('button', { name: /^1947:/ }));
    const detail = screen.getByRole('heading', { name: 'Jahr 1947 im Detail' }).closest('section') as HTMLElement;
    expect(within(detail).getByRole('table', { name: 'Kennzahlen 1947' })).toBeVisible();
    expect(within(detail).getByText(/Rang \d+ von 209/)).toBeVisible();
    expect(within(detail).getByRole('img', { name: /Monatsprofil 1947/ })).toBeVisible();
    expectClean(container);
    fireEvent.click(within(detail).getByRole('button', { name: 'Jahresdetail schließen' }));
    expect(screen.queryByRole('heading', { name: 'Jahr 1947 im Detail' })).toBeNull();
  });

  it('toggles the epoch filter from the structure tile', () => {
    setup();
    const b = within(epochTile()).getByRole('button', { name: /^ab 1996:/ });
    fireEvent.click(b);
    expect(within(epochTile()).getByRole('button', { name: /^ab 1996:/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(timeTile()).getByText(/Seit 1996 liegt MQ/)).toBeVisible();
    fireEvent.click(within(epochTile()).getByRole('button', { name: /^ab 1996:/ }));
    expect(within(epochTile()).getByRole('button', { name: /^ab 1996:/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('zooms the time chart into small multiples per epoch', () => {
    setup({ kpi: 'nq' });
    fireEvent.click(within(timeTile()).getByRole('button', { name: 'Vergrößern' }));
    const dlg = screen.getByRole('dialog');
    fireEvent.click(within(within(dlg).getByRole('radiogroup', { name: 'Ansicht im Zoom' })).getByRole('radio', { name: 'Je Epoche' }));
    const list = within(dlg).getByRole('list', { name: 'Small Multiples je Epoche' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expectClean(dlg);
    fireEvent.click(within(within(dlg).getByRole('radiogroup', { name: 'Maßstab der Small Multiples' })).getByRole('radio', { name: 'je Kachel' }));
    expectClean(dlg);
    fireEvent.click(within(list).getByRole('button', { name: /^ab 1996:/ }));
    expect(within(dlg).queryByRole('list', { name: 'Small Multiples je Epoche' })).toBeNull();
    expect(within(dlg).getByText(/Seit 1996 liegt NQ/)).toBeVisible();
  });
});
