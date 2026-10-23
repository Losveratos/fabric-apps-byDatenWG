import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useRhein } from '@/hooks/rhein.context';
import { KPIS } from '@/lib/rhein/kpis';
import type { View } from '@/lib/rhein/view';
import { RheinTestProvider } from '@/test/rhein-fixture';

import { SeasonPage } from './SeasonPage';

const BAD = /NaN|undefined|Infinity/;

function Probe() {
  const { view } = useRhein();
  return <output data-testid="view">{JSON.stringify({ months: view.months, epochs: view.epochs, multDim: view.multDim })}</output>;
}

function setup(view?: Partial<View>) {
  return render(
    <RheinTestProvider view={{ page: 'season', ...view }}>
      <SeasonPage />
      <Probe />
    </RheinTestProvider>
  );
}

const viewState = () => JSON.parse(screen.getByTestId('view').textContent ?? '{}') as Pick<View, 'months' | 'epochs' | 'multDim'>;
const tile = (name: RegExp) => screen.getByRole('heading', { name }).closest('section') as HTMLElement;

function svgAttrsOk(root: ParentNode) {
  for (const el of Array.from(root.querySelectorAll('svg *')))
    for (const a of Array.from(el.attributes)) expect(`${el.tagName} ${a.name}=${a.value}`).not.toMatch(BAD);
}

describe('SeasonPage', () => {
  afterEach(cleanup);

  for (const k of KPIS)
    for (const multDim of ['epoch', 'decade'] as const)
      it(`renders ${k.id} with ${multDim} multiples without NaN`, () => {
        const { container } = setup({ kpi: k.id, multDim, months: [8, 9], epochs: ['ab 1996'] });
        expect(container.textContent).not.toMatch(BAD);
        expect(container.textContent).not.toMatch(/[–—]/);
        svgAttrsOk(container);
        fireEvent.click(within(tile(/^Monatsprofil/)).getByRole('button', { name: 'Vergrößern' }));
        const dlg = screen.getByRole('dialog');
        expect(dlg.textContent).not.toMatch(BAD);
        svgAttrsOk(dlg);
        const cards = within(dlg).getAllByRole('button', { pressed: false }).concat(within(dlg).queryAllByRole('button', { pressed: true }));
        const titled = cards.filter((b) => b.tagName === 'BUTTON' && b.getAttribute('title'));
        expect(titled).toHaveLength(multDim === 'epoch' ? 3 : 22);
      });

  it('renders the default view (all months, all epochs) cleanly', () => {
    const { container } = setup();
    expect(container.innerHTML).not.toMatch(BAD);
    expect(screen.getByText(/^Über alle Jahre 1817 bis 2025 liegt Mittelwasser MQ im /)).toBeInTheDocument();
    expect(screen.getByText(/^Seit 1996 führt der Rhein im \w+ \d+ % (mehr|weniger) Wasser als vor 1920/)).toBeInTheDocument();
  });

  it('toggles a month on click in the monthly chart and in the season profile', () => {
    setup();
    const t = tile(/^Monatsprofil/);
    fireEvent.click(within(t).getByRole('button', { name: /^Aug:/ }));
    expect(viewState().months).toEqual([8]);
    fireEvent.click(within(t).getByRole('button', { name: /^Sep:/ }));
    expect(viewState().months).toEqual([8, 9]);
    fireEvent.click(within(t).getByRole('button', { name: /^Aug:/ }));
    expect(viewState().months).toEqual([9]);
    const p = tile(/^Verschiebung der Jahreszeiten/);
    fireEvent.click(within(p).getByRole('button', { name: /^Sep:/ }));
    expect(viewState().months).toEqual([]);
  });

  it('heat cell click sets month and epoch filter', () => {
    setup();
    const h = tile(/^Epochen × Monate/);
    expect(within(h).getAllByRole('button', { name: /^(vor 1920|1920 bis 1995|ab 1996), / })).toHaveLength(36);
    fireEvent.click(within(h).getByRole('button', { name: /^ab 1996, Aug:/ }));
    expect(viewState()).toMatchObject({ months: [8], epochs: ['ab 1996'] });
    expect(within(h).getByRole('button', { name: /^ab 1996, Aug:/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('epoch card in the zoomed small multiples toggles the epoch filter; decade cards highlight', () => {
    setup();
    fireEvent.click(within(tile(/^Monatsprofil/)).getByRole('button', { name: 'Vergrößern' }));
    const dlg = screen.getByRole('dialog');
    const card = within(dlg)
      .getAllByRole('button')
      .find((b) => b.getAttribute('title')?.startsWith('ab 1996')) as HTMLElement;
    fireEvent.click(card);
    expect(viewState().epochs).toEqual(['ab 1996']);
    fireEvent.click(within(dlg).getByRole('radio', { name: 'Jahrzehnte' }));
    expect(viewState().multDim).toBe('decade');
    const dec = within(dlg)
      .getAllByRole('button')
      .find((b) => b.getAttribute('title')?.startsWith('1990er')) as HTMLElement;
    fireEvent.click(dec);
    expect(dec).toHaveAttribute('aria-pressed', 'true');
  });
});
