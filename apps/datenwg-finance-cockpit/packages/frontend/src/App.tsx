// Finance KPI Cockpit, page built after the MockupKitchen frame:
// header band · KPI row · varint (2) + structure (1) · KPI table (2) + bridge (1),
// filter panel on the right, footer with source and notation.

import { Moon, RefreshCw, Sun } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProfitBridge } from './components/charts/ProfitBridge';
import { StructureChart } from './components/charts/StructureChart';
import { TimeChart } from './components/charts/TimeChart';
import { FilterPanel } from './components/FilterPanel';
import { ScenarioTag } from './components/ibcs/Ibcs';
import { KpiCards } from './components/KpiCards';
import { KpiTable } from './components/KpiTable';
import { CockpitContext, type CockpitContextValue } from './hooks/cockpit.context';
import { useTheme } from './hooks/theme.context';
import { useCockpitData } from './hooks/use-cockpit-data';
import type { Cube, MemberFilter, RefScen, Scen } from './lib/cockpit/cube';
import { MONTH_SHORT, periodLabel } from './lib/cockpit/format';
import { buildCatalogue, kpiValue, type KpiDef } from './lib/cockpit/kpis';
import { choiceOf, filterOf, fromHash, monthsOf, primaryCode, toHash, type View } from './lib/cockpit/view';
import { cn } from './lib/utils';

function App() {
  const { state, progress, refetch } = useCockpitData();
  const { isDark, toggleTheme } = useTheme();
  const [view, setViewState] = useState<View>(() => fromHash(window.location.hash));

  const setView = useCallback((patch: Partial<View>) => setViewState((v) => ({ ...v, ...patch })), []);

  // URL hash mirrors the view (shareable); back/forward and pasted links update it.
  useEffect(() => {
    const h = toHash(view);
    if (h !== window.location.hash) window.history.replaceState(null, '', h || window.location.pathname);
  }, [view]);
  useEffect(() => {
    const onHash = () => setViewState(fromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const cube = state.status === 'ready' ? state.cube : null;
  const headerSub = cube
    ? `in Mio. € · ${primaryCode(view, cube)} vs ${view.ref} · ${periodLabel(monthsOf(view, cube), cube.year)}`
    : 'in Mio. € · AC vs PY / PL / FC';

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <header role="banner" className="sticky top-0 z-30 border-b border-[#e3e1d8] bg-card dark:border-border">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-x-500 gap-y-200 px-600 py-300">
          <div className="flex items-center gap-300">
            <span className="grid size-[34px] place-items-center rounded-md bg-primary font-monospace text-200 font-bold text-primary-foreground" aria-hidden="true">
              FK
            </span>
            <div>
              <h1 className="font-heading text-500 leading-500 font-bold tracking-tight">Finance KPI Cockpit</h1>
              <p className="text-200 text-foreground/70">{headerSub}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-300 text-100 text-muted-foreground">
            <ScenarioTag code="AC">AC Ist</ScenarioTag>
            <ScenarioTag code="FC">FC Forecast</ScenarioTag>
            <ScenarioTag code="PL">PL Plan</ScenarioTag>
            <ScenarioTag code="PY">PY Vorjahr</ScenarioTag>
            <span>
              Δ <span className="font-semibold text-good">günstig</span> / <span className="font-semibold text-bad">ungünstig</span>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-200">
            {cube && (
              <span className="hidden rounded-full bg-accent px-300 py-100 text-100 font-medium text-accent-foreground md:inline">
                Ist bis {MONTH_SHORT[cube.lastAc - 1]} {cube.year}
              </span>
            )}
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
        {state.status === 'ready' && <Cockpit cube={state.cube} view={view} setView={setView} />}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1920px] flex-wrap gap-x-400 gap-y-100 px-600 py-200 text-100 text-muted-foreground">
          <span>Quelle: Semantikmodell „ChartKitchen byDatenWG Demo" · Tabelle Sales Demo</span>
          <span>Notation angelehnt an IBCS · PY = Ist des Vorjahres · Quoten als Quotient der Summen</span>
          <span className="ml-auto">DatenWG · Fabric App</span>
        </div>
      </footer>
    </div>
  );
}

function Cockpit({ cube, view, setView }: { cube: Cube; view: View; setView: (p: Partial<View>) => void }) {
  const catalogue = useMemo(() => buildCatalogue(cube), [cube]);
  const months = useMemo(() => monthsOf(view, cube), [view, cube]);
  const choice = useMemo(() => choiceOf(view), [view]);
  const filter = useMemo(() => filterOf(view, cube), [view, cube]);
  const kpi = catalogue.find((k) => k.id === view.kpi) ?? catalogue[0];

  const value = useCallback(
    (k: KpiDef, scen: Scen, ms?: number[], f?: MemberFilter) => kpiValue(cube, k, scen, ms ?? months, f ?? filter, choice),
    [cube, months, filter, choice]
  );

  const ctx: CockpitContextValue = useMemo(
    () => ({
      cube,
      catalogue,
      view,
      setView,
      months,
      choice,
      filter,
      kpi,
      primary: primaryCode(view, cube),
      value,
      refCode: (r: RefScen) => r,
      scenName: (s: Scen) => {
        if (s === 'ACT') return primaryCode(view, cube);
        if (s === 'PY') return `PY · Ist ${cube.year - 1}`;
        const id = s === 'PL' ? view.plan : view.fc;
        return `${s} · ${cube.scenarioNames[id] ?? id}`;
      },
    }),
    [cube, catalogue, view, setView, months, choice, filter, kpi, value]
  );

  const filtered = view.markets.length + view.products.length > 0;

  return (
    <CockpitContext.Provider value={ctx}>
      <div className="grid gap-[18px] xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          {filtered && <ActiveFilters />}
          <KpiCards />
          <div className="grid gap-[18px] 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <TimeChart />
            <StructureChart />
          </div>
          <div className="grid gap-[18px] 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <KpiTable />
            <ProfitBridge />
          </div>
        </div>
        <div className="xl:sticky xl:top-[92px] xl:self-start">
          <FilterPanel />
        </div>
      </div>
    </CockpitContext.Provider>
  );
}

function ActiveFilters() {
  return (
    <CockpitContext.Consumer>
      {(c) =>
        c && (
          <div className="flex flex-wrap items-center gap-200 rounded-xl border border-[color:var(--ibcs-hilite)]/40 bg-card px-400 py-200 text-200">
            <span className="font-semibold">Gefiltert:</span>
            {[...c.view.markets.map((m) => ({ k: 'markets' as const, n: m })), ...c.view.products.map((p) => ({ k: 'products' as const, n: p }))].map(
              ({ k, n }) => (
                <button
                  key={k + n}
                  type="button"
                  onClick={() => c.setView({ [k]: c.view[k].filter((x) => x !== n) })}
                  className="rounded-full bg-accent px-300 py-100-nudge text-100 font-medium text-accent-foreground hover:opacity-80"
                  title="Filter entfernen"
                >
                  {n} ×
                </button>
              )
            )}
            <button type="button" onClick={() => c.setView({ markets: [], products: [] })} className="ml-auto text-100 text-muted-foreground underline-offset-2 hover:underline">
              alle aufheben
            </button>
          </div>
        )
      }
    </CockpitContext.Consumer>
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
        Kennzahlen werden aus dem Semantikmodell geladen … {done} von {total} Abfragen fertig
      </p>
      <div className="grid grid-cols-2 gap-[18px] md:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[170px] animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-[18px] 2xl:grid-cols-[2fr_1fr]">
        <div className="h-[460px] animate-pulse rounded-xl bg-muted" />
        <div className="h-[460px] animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className={cn('mx-auto mt-800 max-w-[560px] rounded-xl border border-destructive/40 bg-card p-600')}>
      <h2 className="font-heading text-400 font-semibold">Kennzahlen konnten nicht geladen werden</h2>
      <p className="mt-200 text-300 text-muted-foreground">{message}</p>
      <button type="button" onClick={onRetry} className="mt-400 rounded-md bg-primary px-400 py-200 text-300 font-semibold text-primary-foreground hover:opacity-90">
        Erneut versuchen
      </button>
    </div>
  );
}

export default App;
