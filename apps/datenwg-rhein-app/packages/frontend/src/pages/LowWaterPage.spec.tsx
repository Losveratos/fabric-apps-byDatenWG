// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { KpiPicker } from '@/components/KpiPicker';
import { useRhein } from '@/hooks/rhein.context';
import type { View } from '@/lib/rhein/view';
import { LowWaterPage } from '@/pages/LowWaterPage';
import { RheinTestProvider } from '@/test/rhein-fixture';

const BAD = /NaN|undefined|Infinity/;

function Probe() {
  const { view } = useRhein();
  return <output data-testid="probe">{`${view.year}|${view.kpi}`}</output>;
}

function setup(view?: Partial<View>) {
  return render(
    <RheinTestProvider view={{ page: 'lowwater', ...view }}>
      <LowWaterPage />
      <KpiPicker />
      <Probe />
    </RheinTestProvider>
  );
}

describe('LowWaterPage', () => {
  afterEach(cleanup);

  for (const v of [{}, { months: [8, 9] }, { epochs: ['ab 1996' as const] }, { months: [1], epochs: ['vor 1920' as const] }])
    it(`renders without NaN for ${JSON.stringify(v)}`, () => {
      const { container } = setup(v);
      expect(container.textContent).not.toMatch(BAD);
      expect(container.innerHTML).not.toMatch(BAD);
    });

  it('shows the P05 threshold of about 1.090 and about 5 % in REF for August and September', () => {
    setup({ months: [8, 9] });
    const strip = screen.getByTestId('p05-strip');
    expect(strip.textContent).toMatch(/1\.0\d\d m³\/s/);
    expect(strip.textContent).toMatch(/REF 1817 bis 1920\s*[45],\d %/);
  });

  it('lists exactly 25 driest years and the epoch tally adds up to 25', () => {
    setup();
    expect(screen.getAllByTestId('dry-row')).toHaveLength(25);
    const counted = screen.getAllByTestId('tally-row').map((r) => Number(r.querySelectorAll('td')[3].textContent));
    expect(counted.reduce((a, b) => a + b, 0)).toBe(25);
  });

  it('opens a year from the ranking and from the NM7Q chart', () => {
    setup();
    const first = within(screen.getAllByTestId('dry-row')[0]).getByRole('button');
    const year = first.textContent!;
    fireEvent.click(first);
    expect(screen.getByTestId('probe').textContent).toBe(`${year}|mq`);
    fireEvent.click(screen.getByRole('button', { name: /^Jahr 1900, NM7Q .* öffnen$/ }));
    expect(screen.getByTestId('probe').textContent).toBe('1900|mq');
  });

  it('shows the years of a clicked decade', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /^1940er:/ }));
    expect(screen.getByLabelText('Jahre der 1940er')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Jahr 194\d öffnen, / })).toHaveLength(10);
  });

  it('KpiPicker sets view.kpi', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: /NM7Q/ }));
    expect(screen.getByTestId('probe').textContent).toBe('0|nm7q');
  });
});
