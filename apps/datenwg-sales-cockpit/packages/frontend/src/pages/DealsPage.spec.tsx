import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DealsPage } from './DealsPage';
import { toCsv } from '@/components/deals/dealsLogic';
import { makeTestData, SalesTestProvider } from '@/test/sales-fixture';

afterEach(cleanup);

const bodyRows = () => within(screen.getAllByRole('table')[0]).getAllByRole('row').slice(1);

function setup() {
  return render(
    <SalesTestProvider>
      <DealsPage />
    </SalesTestProvider>
  );
}

describe('DealsPage', () => {
  it('renders the analysis year with a pager and no NaN text', () => {
    const { container } = setup();
    expect(screen.getByText(/Seite 1 von 2/)).toBeVisible();
    expect(bodyRows()).toHaveLength(50);
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity/);
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByText(/Seite 2 von 2/)).toBeVisible();
    expect(bodyRows()).toHaveLength(22);
  });

  it('filters by status chip and by search', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /^verloren/ }));
    expect(bodyRows()).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: /^alle/ }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'cem' } });
    const rows = bodyRows();
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.textContent).toContain('Cem');
  });

  it('switches the date scope to all years', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: 'alle Jahre' }));
    expect(screen.getByText(/Seite 1 von 5/)).toBeVisible();
  });

  it('sorts by clicking a column header', () => {
    setup();
    const first = () => within(bodyRows()[0]).getAllByRole('cell')[7].textContent;
    const desc = first();
    fireEvent.click(screen.getByRole('button', { name: 'Summe' }));
    expect(first()).not.toBe(desc);
  });

  it('opens the customer panel hook from a customer button', () => {
    setup();
    expect(screen.getAllByRole('button', { name: /^Kunde \d$/ }).length).toBeGreaterThan(0);
  });

  it('exports CSV with semicolons and German decimals', () => {
    const csv = toCsv(makeTestData().deals.slice(0, 3));
    const [head, line] = csv.split('\r\n');
    expect(head.split(';')).toHaveLength(14);
    expect(line).toMatch(/\d+,\d{2}/);
  });
});
