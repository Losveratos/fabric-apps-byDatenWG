import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CustomerPanel } from './CustomerPanel';
import { useSales } from '@/hooks/sales.context';
import { SalesTestProvider } from '@/test/sales-fixture';

afterEach(cleanup);

function Opener() {
  const { openCustomer, view } = useSales();
  return (
    <>
      <button onClick={() => openCustomer('Kunde 1')}>open</button>
      <output data-testid="filter">{(view.filter.kunde ?? []).join(',')}</output>
      <CustomerPanel />
    </>
  );
}

describe('CustomerPanel', () => {
  it('renders nothing without a customer', () => {
    render(
      <SalesTestProvider>
        <Opener />
      </SalesTestProvider>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens, shows the profile without NaN, and closes with Escape', () => {
    render(
      <SalesTestProvider view={{ customer: 'Kunde 1' }}>
        <Opener />
      </SalesTestProvider>
    );
    const dlg = screen.getByRole('dialog');
    expect(dlg).toHaveTextContent('Kunde 1');
    expect(dlg).toHaveTextContent('Abschlussquote');
    expect(dlg.textContent).not.toMatch(/NaN|undefined|Infinity/);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('filters to the customer and closes', () => {
    render(
      <SalesTestProvider view={{ customer: 'Kunde 1' }}>
        <Opener />
      </SalesTestProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Nur diesen Kunden filtern' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('filter')).toHaveTextContent('Kunde 1');
  });
});
