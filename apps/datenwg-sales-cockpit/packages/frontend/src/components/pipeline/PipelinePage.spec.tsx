import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SalesTestProvider } from '@/test/sales-fixture';

import { PipelinePage } from '@/pages/PipelinePage';

afterEach(cleanup);

const page = () =>
  render(
    <SalesTestProvider>
      <PipelinePage />
    </SalesTestProvider>
  );

describe('PipelinePage', () => {
  it('renders without NaN, undefined or Infinity text', () => {
    const { container } = page();
    expect(screen.getByRole('heading', { name: /Pipeline & Forecast/ })).toBeTruthy();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('shows the offers of a probability bucket on click', () => {
    page();
    expect(screen.queryByText(/Top \d+ von/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^21\u201350 %/ }));
    expect(screen.getByText(/Top \d+ von \d+ Angeboten/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Kunde \d$/ }).length).toBeGreaterThan(0);
  });

  it('switches the dimension and the outlook resolution', () => {
    const { container } = page();
    fireEvent.click(screen.getByRole('radio', { name: 'Bundesland' }));
    expect(screen.getByText('Pipeline nach Bundesland')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Quartal' }));
    expect(container.textContent ?? '').not.toMatch(/NaN|undefined|Infinity/);
  });
});

