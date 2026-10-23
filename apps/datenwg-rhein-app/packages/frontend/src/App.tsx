// Rhein Köln: MockupKitchen frame (header band with page navigation, filter
// chips, content grid, collapsible filter panel right, footer) with three
// pages after Shneiderman's mantra: Überblick → Saison & Epochen → Niedrigwasser.

import { CalendarRange, Droplets, LayoutDashboard, Moon, RefreshCw, Sun, X } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { FilterPanel } from './components/FilterPanel';
import { ScenarioTag } from './components/ibcs/Ibcs';
import { REF_LABEL } from './components/overview/shared';
import { useRheinContextValue } from './hooks/rhein-provider';
import { RheinContext, useRhein } from './hooks/rhein.context';
import { useTheme } from './hooks/theme.context';
import { useRheinData } from './hooks/use-rhein-data';
import { fmtDate } from './lib/rhein/format';
import { MONTHS, type RheinData } from './lib/rhein/model';
import { fromHash, toHash, type Page, type View } from './lib/rhein/view';
import { cn } from './lib/utils';
import { LowWaterPage } from './pages/LowWaterPage';
import { OverviewPage } from './pages/OverviewPage';
import { SeasonPage } from './pages/SeasonPage';

const PAGES: { id: Page; label: string; icon: typeof LayoutDashboard; hint: string }[] = [
  { id: 'overview', label: 'Überblick', icon: LayoutDashboard, hint: 'Alle Kennzahlen über 209 Jahre' },
  { id: 'season', label: 'Saison & Epochen', icon: CalendarRange, hint: 'Monate und Epochen im Vergleich' },
  { id: 'lowwater', label: 'Niedrigwasser', icon: Droplets, hint: 'Trockene Jahre und Tage unter der P05-Schwelle' },
];

function App() {
  const { state, progress, refetch } = useRheinData();
  const { isDark, toggleTheme } = useTheme();
  const [view, setViewState] = useState<View>(() => fromHash(window.location.hash));
  const setView = useCallback((patch: Partial<View>) => setViewState((v) => ({ ...v, ...patch })), []);

  useEffect(() => {
    const h = toHash(view);
    if (h !== window.location.hash) window.history.replaceState(null, '', h || window.location.pathname + window.location.search);
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
              RK
            </span>
            <div>
              <h1 className="font-heading text-500 leading-500 font-bold tracking-tight">Rhein Köln</h1>
              <p className="text-200 text-foreground/70">Pegel Köln · Abfluss 1817 bis 2025 gegen REF 1817 bis 1920</p>
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
            <div className="hidden items-center gap-300 text-100 text-muted-foreground lg:flex" data-testid="legend">
              <ScenarioTag code="AC">AC Abfluss</ScenarioTag>
              <ScenarioTag code="PY">{REF_LABEL}</ScenarioTag>
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
        {state.status === 'ready' && <Cockpit data={state.data} view={view} setView={setView} update={setViewState} />}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1920px] flex-wrap gap-x-400 gap-y-100 px-600 py-200 text-100 text-muted-foreground">
          <span>
            Daten: GRDC (BfG), Rohdaten WSV · nur interne Nutzung{state.status === 'ready' ? ` · Stand ${fmtDate(state.data.asOf)}` : ''}
          </span>
          <span>Notation angelehnt an IBCS · AC = Abfluss der Auswahl · REF = dieselben Monate 1817 bis 1920</span>
          <span className="ml-auto">DatenWG · Fabric App</span>
        </div>
      </footer>
    </div>
  );
}

function Cockpit({
  data,
  view,
  setView,
  update,
}: {
  data: RheinData;
  view: View;
  setView: (p: Partial<View>) => void;
  update: (fn: (v: View) => View) => void;
}) {
  const ctx = useRheinContextValue(data, view, setView, update);
  return (
    <RheinContext.Provider value={ctx}>
      <div className={cn('grid gap-[18px]', view.panel ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : 'xl:grid-cols-[minmax(0,1fr)_48px]')}>
        <div className="flex min-w-0 flex-col gap-[18px]">
          <ActiveFilters />
          {view.page === 'overview' && <OverviewPage />}
          {view.page === 'season' && <SeasonPage />}
          {view.page === 'lowwater' && <LowWaterPage />}
        </div>
        <div className="xl:sticky xl:top-[92px] xl:self-start">
          <FilterPanel />
        </div>
      </div>
    </RheinContext.Provider>
  );
}

/** Selection text plus the active month and epoch filters as removable chips. */
function ActiveFilters() {
  const { view, selectionText, toggleMonth, toggleEpoch, clearFilter, openYear } = useRhein();
  const chips: { key: string; label: string; remove: () => void }[] = [
    ...view.months.map((m) => ({ key: `m${m}`, label: `Monat: ${MONTHS[m - 1]}`, remove: () => toggleMonth(m) })),
    ...view.epochs.map((e) => ({ key: `e${e}`, label: `Epoche: ${e}`, remove: () => toggleEpoch(e) })),
  ];
  return (
    <div className="flex flex-wrap items-center gap-200 text-200" data-testid="active-filters">
      <span className="font-semibold">{selectionText}</span>
      <span className="text-muted-foreground">vs {REF_LABEL}</span>
      {chips.length > 0 && <span className="ml-200 text-muted-foreground">Gefiltert:</span>}
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.remove}
          className="inline-flex items-center gap-100 rounded-full bg-accent px-300 py-100-nudge text-100 font-medium text-accent-foreground hover:opacity-80"
          title="Filter entfernen"
          aria-label={`${c.label} entfernen`}
        >
          {c.label} <X className="size-[10px]" aria-hidden="true" />
        </button>
      ))}
      {view.year > 0 && (
        <button
          type="button"
          onClick={() => openYear(0)}
          className="inline-flex items-center gap-100 rounded-full border border-border px-300 py-100-nudge text-100 font-medium hover:bg-muted"
          aria-label={`Jahr ${view.year} schließen`}
        >
          Jahr {view.year} <X className="size-[10px]" aria-hidden="true" />
        </button>
      )}
      {chips.length > 0 && (
        <button type="button" onClick={() => clearFilter()} className="text-100 text-muted-foreground underline-offset-2 hover:underline">
          alle aufheben
        </button>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
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
        Tageswerte werden aus dem Semantikmodell geladen … {done} von {total} Abfragen fertig
      </p>
      <div className="h-[6px] w-full max-w-[420px] overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <div className="h-full bg-primary transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-[18px] md:grid-cols-3 2xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
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
      <h2 className="font-heading text-400 font-semibold">Rheindaten konnten nicht geladen werden</h2>
      <p className="mt-200 text-300 text-muted-foreground">{message}</p>
      <button type="button" onClick={onRetry} className="mt-400 rounded-md bg-primary px-400 py-200 text-300 font-semibold text-primary-foreground hover:opacity-90">
        Erneut versuchen
      </button>
    </div>
  );
}

export default App;
