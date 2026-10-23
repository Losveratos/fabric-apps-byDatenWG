import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RheinState } from '@/hooks/use-rhein-data';
import { makeTestData } from '@/test/rhein-fixture';

const BAD = /NaN|Infinity|undefined/;

let state: RheinState = { status: 'loading' };
const refetch = vi.fn(async () => []);

vi.mock('@/hooks/use-rhein-data', () => ({
  useRheinData: () => ({ state, progress: { done: state.status === 'ready' ? 2 : 1, total: 2 }, refetch }),
}));

import App from '@/App';

const bar = () => screen.getByTestId('active-filters');

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    state = { status: 'ready', data: makeTestData() };
  });
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  it('shows the loading state with progress and keeps the header', () => {
    state = { status: 'loading' };
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Rhein Köln', level: 1 })).toBeVisible();
    expect(screen.getByText(/1 von 2 Abfragen fertig/)).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('shows a friendly error with retry', () => {
    state = { status: 'error', message: 'Kein Zugriff' };
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('Kein Zugriff');
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders header, legend, footer and the overview without NaN', () => {
    const { container } = render(<App />);
    expect(screen.getByRole('heading', { name: 'Rhein Köln', level: 1 })).toBeVisible();
    expect(screen.getByText('Pegel Köln · Abfluss 1817 bis 2025 gegen REF 1817 bis 1920')).toBeVisible();
    expect(screen.getByTestId('legend')).toHaveTextContent('REF 1817 bis 1920');
    expect(screen.getByText(/Daten: GRDC \(BfG\), Rohdaten WSV · nur interne Nutzung · Stand \d\d\.\d\d\.\d{4}/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mittelwasser MQ je Dekade' })).toBeVisible();
    expect(bar()).toHaveTextContent('1817..2025 · ganzes Jahr');
    expect(container.innerHTML).not.toMatch(BAD);
    // no dashes in the app chrome (UI text rule)
    expect(container.querySelector('header[role="banner"]')?.textContent).not.toMatch(/[–—]/);
    expect(container.querySelector('footer')?.textContent).not.toMatch(/[–—]/);
  });

  it('switches pages through the navigation and mirrors them into the hash', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Seiten' });
    fireEvent.click(within(nav).getByRole('button', { name: /Saison & Epochen/ }));
    expect(within(nav).getByRole('button', { name: /Saison & Epochen/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('heading', { name: /je Dekade$/ })).toBeNull();
    expect(window.location.hash).toContain('page=season');
    fireEvent.click(within(nav).getByRole('button', { name: /Niedrigwasser/ }));
    expect(within(nav).getByRole('button', { name: /Niedrigwasser/ })).toHaveAttribute('aria-current', 'page');
    expect(window.location.hash).toContain('page=lowwater');
    fireEvent.click(within(nav).getByRole('button', { name: /Überblick/ }));
    expect(screen.getByRole('heading', { name: /je Dekade$/ })).toBeVisible();
  });

  it('reads filters from the hash and removes chips', () => {
    window.history.replaceState(null, '', '/#m=8,9&e=2');
    const { container } = render(<App />);
    expect(bar()).toHaveTextContent('ab 1996 · Aug, Sep');
    expect(bar()).toHaveTextContent('Gefiltert:');
    fireEvent.click(within(bar()).getByRole('button', { name: 'Monat: Aug entfernen' }));
    expect(within(bar()).queryByRole('button', { name: 'Monat: Aug entfernen' })).toBeNull();
    expect(within(bar()).getByRole('button', { name: 'Monat: Sep entfernen' })).toBeVisible();
    expect(within(bar()).getByRole('button', { name: 'Epoche: ab 1996 entfernen' })).toBeVisible();
    expect(container.innerHTML).not.toMatch(BAD);
    fireEvent.click(within(bar()).getByRole('button', { name: 'alle aufheben' }));
    expect(bar()).not.toHaveTextContent('Gefiltert:');
    expect(window.location.hash).toBe('');
  });

  it('selects a KPI by clicking its card', () => {
    const { container } = render(<App />);
    const card = screen.getByRole('button', { name: /^Tage unter der alten P05-Schwelle: AC/ });
    fireEvent.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Tage unter der alten P05-Schwelle je Dekade' })).toBeVisible();
    expect(window.location.hash).toContain('kpi=below');
    expect(container.innerHTML).not.toMatch(BAD);
  });

  it('applies a month quick pick, epoch toggles and the time axis from the filter panel', () => {
    const { container } = render(<App />);
    const panel = screen.getByRole('complementary', { name: 'Filter' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Spätsommer Aug, Sep' }));
    expect(within(panel).getByRole('button', { name: 'Spätsommer Aug, Sep' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(panel).getByRole('button', { name: 'Aug' })).toHaveAttribute('aria-pressed', 'true');
    expect(bar()).toHaveTextContent('1817..2025 · Aug, Sep');
    fireEvent.click(within(panel).getByRole('button', { name: 'Winter Dez bis Feb' }));
    expect(bar()).toHaveTextContent('Jan, Feb, Dez');
    fireEvent.click(within(panel).getByRole('button', { name: 'Jul' }));
    expect(bar()).toHaveTextContent('Jan, Feb, Jul, Dez');
    fireEvent.click(within(panel).getByRole('button', { name: '1920 bis 1995' }));
    expect(bar()).toHaveTextContent('1920 bis 1995 · Jan, Feb, Jul, Dez');
    fireEvent.click(within(within(panel).getByRole('radiogroup', { name: 'Zeitachse' })).getByRole('radio', { name: 'Jahre' }));
    expect(screen.getByRole('heading', { name: 'Mittelwasser MQ je Jahr' })).toBeVisible();
    expect(container.innerHTML).not.toMatch(BAD);
    fireEvent.click(within(panel).getByRole('button', { name: 'ganzes Jahr' }));
    expect(bar()).toHaveTextContent('1920 bis 1995 · ganzes Jahr');
    fireEvent.click(within(panel).getByRole('button', { name: /Alle Filter aufheben/ }));
    expect(bar()).toHaveTextContent('1817..2025 · ganzes Jahr');
  });

  it('collapses and expands the filter panel', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Filter zuklappen' }));
    expect(window.location.hash).toContain('panel=0');
    fireEvent.click(screen.getByRole('button', { name: 'Filter aufklappen' }));
    expect(screen.getByRole('button', { name: 'Diese Sicht teilen' })).toBeVisible();
  });

  it('follows hash changes', () => {
    render(<App />);
    act(() => {
      window.location.hash = '#page=lowwater';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    const nav = screen.getByRole('navigation', { name: 'Seiten' });
    expect(within(nav).getByRole('button', { name: /Niedrigwasser/ })).toHaveAttribute('aria-current', 'page');
  });
});
