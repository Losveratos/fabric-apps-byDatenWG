// Vertriebscontrolling: MockupKitchen frame (header band with page navigation,
// content grid, collapsible filter panel right, footer) with four pages after
// Shneiderman's mantra: Übersicht → Analyse (zoom) → Pipeline → Deals (details).

import { BarChart3, LayoutDashboard, ListChecks, Moon, RefreshCw, Sun, TrendingUp, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CustomerPanel } from './components/CustomerPanel';
import { FilterPanel } from './components/FilterPanel';
import { ScenarioTag } from './components/ibcs/Ibcs';
import { SalesContext, type SalesContextValue } from './hooks/sales.context';
import { useTheme } from './hooks/theme.context';
import { useSalesData } from './hooks/use-sales-data';
import { makeCompute } from './lib/sales/compute';
import { periodLabel } from './lib/sales/format';
import { KPI_BY_ID } from './lib/sales/kpis';
import { DIM_LABEL, lastClosedMonth, type Dim, type SalesData } from './lib/sales/model';
import { fromHash, toHash, type Page, type View } from './lib/sales/view';
import { cn } from './lib/utils';
import { AnalysePage } from './pages/AnalysePage';
import { DealsPage } from './pages/DealsPage';
import { OverviewPage } from './pages/OverviewPage';
import { PipelinePage } from './pages/PipelinePage';

const PAGES: { id: Page; label: string; icon: typeof LayoutDashboard; hint: string }[] = [
  { id: 'overview', label: 'Übersicht', icon: LayoutDashboard, hint: 'Überblick über alle Kennzahlen' },
  { id: 'analyse', label: 'Analyse', icon: BarChart3, hint: 'Zoom: Small Multiples und Werttreiberbaum' },
  { id: 'pipeline', label: 'Pipeline & Forecast', icon: TrendingUp, hint: 'Offene Angebote und Ausblick' },
  { id: 'deals', label: 'Deals & Kunden', icon: ListChecks, hint: 'Details auf Anfrage' },
];

function App() {
  const { state, progress, refetch } = useSalesData();
  const { isDark, toggleTheme } = useTheme();
  const [view, setViewState] = useState<View>(() => fromHash(window.location.hash));
  const setView = useCallback((patch: Partial<View>) => setViewState((v) => ({ ...v, ...patch })), []);

  useEffect(() => {
    const h = toHash(view);
    if (h !== window.location.hash) window.history.replaceState(null, '', h || window.location.pathname);
  }, [view]);
  useEffect(() => {
    const onHash = () => setViewState(fromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <header role="banner" className="sticky top-0 z-30 border-b border-[#e3e1d8] bg-card dark:border-border">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-x-600 gap-y-200 px-600 py-300">
          <div className="flex items-center gap-300">
            <span className="grid size-[34px] place-items-center rounded-md bg-primary font-monospace text-200 font-bold text-primary-foreground" aria-hidden="true">
              VC
            </span>
            <div>
              <h1 className="font-heading text-500 leading-500 font-bold tracking-tight">Vertriebscontrolling</h1>
              <p className="text-200 text-foreground/70">AC vs PY · Auftragseingang, Pipeline, Forecast</p>
            </div>
          </div>
          <nav aria-label="Seiten" className="flex flex-wrap gap-100 rounded-lg bg-muted p-100">
            {PAGES.map((p) => {
              const Icon = p.icon;
              const on = view.page === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.hint}
                  aria-current={on ? 'page' : undefined}
                  onClick={() => setView({ page: p.id })}
                  className={cn(
                    'inline-flex items-center gap-200-nudge rounded-md px-300 py-200-nudge text-200 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                    on ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="icon-size-200" aria-hidden="true" />
                  {p.label}
                </button>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-300">
            <div className="hidden items-center gap-300 text-100 text-muted-foreground lg:flex">
              <ScenarioTag code="AC">AC Ist</ScenarioTag>
              <ScenarioTag code="PY">PY Vorjahr</ScenarioTag>
              <ScenarioTag code="FC">FC Forecast</ScenarioTag>
              <span>
                Δ <span className="font-semibold text-good">günstig</span> / <span className="font-semibold text-bad">ungünstig</span>
              </span>
            </div>
            <IconBtn label="Daten neu laden" onClick={() => void refetch()}>
              <RefreshCw className="icon-size-200" />
            </IconBtn>
            <IconBtn label={isDark ? 'Helles Design' : 'Dunkles Design'} onClick={toggleTheme}>
              {isDark ? <Sun className="icon-size-200" /> : <Moon className="icon-size-200" />}
            </IconBtn>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1920px] flex-1 px-600 py-600">
        {state.status === 'loading' && <Loading done={progress.done} total={progress.total} />}
        {state.status === 'error' && <ErrorBox message={state.message} onRetry={() => void refetch()} />}
        {state.status === 'ready' && <Cockpit data={state.data} view={view} setView={setView} />}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1920px] flex-wrap gap-x-400 gap-y-100 px-600 py-200 text-100 text-muted-foreground">
          <span>Quelle: Semantikmodell „Vertriebscontrolling_Excel_based_3.0" · aktueller Pipeline-Stand</span>
          <span>Notation angelehnt an IBCS · AC = gewonnene Angebote nach Abschlussdatum · PY = Vorjahr · kein Plan im Modell</span>
          <span className="ml-auto">DatenWG · Fabric App</span>
        </div>
      </footer>
    </div>
  );
}

function Cockpit({ data, view, setView }: { data: SalesData; view: View; setView: (p: Partial<View>) => void }) {
  const defaultYear = useMemo(() => [...data.years].reverse().find((y) => lastClosedMonth(data, y) === 12) ?? data.years[data.years.length - 1], [data]);
  const year = view.year && data.years.includes(view.year) ? view.year : defaultYear;
  const lastClosed = lastClosedMonth(data, year);
  const months = useMemo(() => {
    const upTo = lastClosed || 12;
    if (view.period === 'month') return [view.month || upTo];
    if (view.period === 'ytd') return Array.from({ length: upTo }, (_, i) => i + 1);
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, [view.period, view.month, lastClosed]);
  const filter = view.filter;
  const compute = useMemo(() => makeCompute(data, { year, months, filter }), [data, year, months, filter]);

  const toggleMember = useCallback(
    (dim: Dim, member: string) => {
      const cur = view.filter[dim] ?? [];
      const next = cur.includes(member) ? cur.filter((x) => x !== member) : [...cur, member];
      setView({ filter: { ...view.filter, [dim]: next } });
    },
    [view.filter, setView]
  );
  const clearFilter = useCallback((dim?: Dim) => setView({ filter: dim ? { ...view.filter, [dim]: [] } : {} }), [view.filter, setView]);
  const openCustomer = useCallback((name: string | null) => setView({ customer: name }), [setView]);

  const ctx: SalesContextValue = useMemo(
    () => ({
      data,
      view,
      setView,
      year,
      pyYear: year - 1,
      months,
      periodText: periodLabel(months, year),
      lastClosed,
      filter,
      kpi: KPI_BY_ID[view.kpi] ?? KPI_BY_ID.won,
      ...compute,
      toggleMember,
      clearFilter,
      openCustomer,
    }),
    [data, view, setView, year, months, lastClosed, filter, compute, toggleMember, clearFilter, openCustomer]
  );

  return (
    <SalesContext.Provider value={ctx}>
      <div className={cn('grid gap-[18px]', view.panel ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : 'xl:grid-cols-[minmax(0,1fr)_48px]')}>
        <div className="flex min-w-0 flex-col gap-[18px]">
          <ActiveFilters />
          {view.page === 'overview' && <OverviewPage />}
          {view.page === 'analyse' && <AnalysePage />}
          {view.page === 'pipeline' && <PipelinePage />}
          {view.page === 'deals' && <DealsPage />}
        </div>
        <div className="xl:sticky xl:top-[92px] xl:self-start">
          <FilterPanel />
        </div>
      </div>
      <CustomerPanel />
    </SalesContext.Provider>
  );
}

function ActiveFilters() {
  return (
    <SalesContext.Consumer>
      {(c) => {
        if (!c) return null;
        const chips = (Object.entries(c.filter) as [Dim, string[] | undefined][]).flatMap(([d, sel]) => (sel ?? []).map((m) => ({ d, m })));
        return (
          <div className="flex flex-wrap items-center gap-200 text-200">
            <span className="font-semibold">{c.periodText}</span>
            <span className="text-muted-foreground">vs PY {c.pyYear}</span>
            {chips.length > 0 && <span className="ml-200 text-muted-foreground">Gefiltert:</span>}
            {chips.map(({ d, m }) => (
              <button
                key={d + m}
                type="button"
                onClick={() => c.toggleMember(d, m)}
                className="inline-flex items-center gap-100 rounded-full bg-accent px-300 py-100-nudge text-100 font-medium text-accent-foreground hover:opacity-80"
                title={`${DIM_LABEL[d]}-Filter entfernen`}
              >
                {DIM_LABEL[d]}: {m} <X className="size-[10px]" aria-hidden="true" />
              </button>
            ))}
            {chips.length > 1 && (
              <button type="button" onClick={() => c.clearFilter()} className="text-100 text-muted-foreground underline-offset-2 hover:underline">
                alle aufheben
              </button>
            )}
          </div>
        );
      }}
    </SalesContext.Consumer>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-md border border-border p-200 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      {children}
    </button>
  );
}

function Loading({ done, total }: { done: number; total: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-[18px]">
      <p className="text-300 text-muted-foreground">
        Vertriebsdaten werden aus dem Semantikmodell geladen … {done} von {total} Abfragen fertig
      </p>
      <div className="grid grid-cols-2 gap-[18px] md:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[170px] animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-[18px] 2xl:grid-cols-[3fr_2fr]">
        <div className="h-[460px] animate-pulse rounded-xl bg-muted" />
        <div className="h-[460px] animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-800 max-w-[560px] rounded-xl border border-destructive/40 bg-card p-600">
      <h2 className="font-heading text-400 font-semibold">Vertriebsdaten konnten nicht geladen werden</h2>
      <p className="mt-200 text-300 text-muted-foreground">{message}</p>
      <button type="button" onClick={onRetry} className="mt-400 rounded-md bg-primary px-400 py-200 text-300 font-semibold text-primary-foreground hover:opacity-90">
        Erneut versuchen
      </button>
    </div>
  );
}

export default App;
