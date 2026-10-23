import { Moon, RefreshCw, Sun } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { KpiStrip } from './components/KpiStrip';
import { PnlTable } from './components/PnlTable';
import { SimPanel } from './components/SimPanel';
import { TrendChart } from './components/TrendChart';
import { ScenarioLabel } from './components/ibcs';
import { useTheme } from './hooks/theme.context';
import { usePnlData, type PnlData } from './hooks/use-pnl-data';
import {
  bridge,
  buildPnl,
  EMPTY_SIM,
  isSimActive,
  LINE_OPEX,
  type Line,
  type Mode,
  type SimParams,
} from './lib/pnl/engine';
import { monthLabel, type Unit } from './lib/pnl/format';
import { loadInitial, persist, type ViewState } from './lib/pnl/state';
import { cn } from './lib/utils';

function App() {
  const [view, setView] = useState<ViewState>(loadInitial);
  const { isDark, toggleTheme } = useTheme();
  const { years, data, refetch } = usePnlData(view.year);

  // Default year: the latest one with data (adopted during render, no effect).
  const yearList = years.status === 'ready' ? years.value : [];
  if (view.year === null && yearList.length) {
    setView((v) => ({ ...v, year: yearList[yearList.length - 1].year }));
  }

  useEffect(() => persist(view), [view]);

  const yearInfo = yearList.find((y) => y.year === view.year);
  const lastActual = yearInfo?.lastActual ?? '';
  const hasOpenMonths = !!lastActual && !lastActual.endsWith('-12');
  const openFrom = useMemo(() => {
    if (!hasOpenMonths) return '';
    const m = Number(lastActual.slice(5, 7)) + 1;
    return monthLabel(`${lastActual.slice(0, 4)}-${String(m).padStart(2, '0')}`);
  }, [lastActual, hasOpenMonths]);

  const set = (patch: Partial<ViewState>) => setView((v) => ({ ...v, ...patch }));

  return (
    <div className="min-h-full bg-background text-foreground">
      <header role="banner" className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-300 px-400 py-300">
          <div className="flex items-center gap-200">
            <span className="inline-block size-300 rounded-sm bg-primary" aria-hidden="true" />
            <h1 className="font-heading text-500 font-bold tracking-tight">Konzern-GuV</h1>
            <span className="rounded-sm bg-accent px-200-nudge py-100-nudge font-monospace text-100 font-medium text-accent-foreground">
              DatenWG · Fabric App
            </span>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-200">
            <label className="flex items-center gap-200 text-200 text-muted-foreground">
              Jahr
              <select
                value={view.year ?? ''}
                onChange={(e) => set({ year: Number(e.target.value) })}
                className="h-[32px] rounded-md border border-input bg-background px-200 text-300 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                {yearList.map((y) => (
                  <option key={y.year} value={y.year}>
                    {y.year}
                  </option>
                ))}
              </select>
            </label>
            <Segmented<Mode>
              label="Zeitraum"
              value={view.mode}
              onChange={(mode) => set({ mode })}
              options={[
                { id: 'fy', label: 'Geschäftsjahr' },
                { id: 'ytd', label: lastActual ? `YTD bis ${monthLabel(lastActual)}` : 'YTD' },
              ]}
            />
            <Segmented<Unit>
              label="Einheit"
              value={view.unit}
              onChange={(unit) => set({ unit })}
              options={[
                { id: 'mio', label: 'Mio.' },
                { id: 'tsd', label: 'Tsd.' },
              ]}
            />
            <IconBtn label="Daten neu laden" onClick={() => void refetch()}>
              <RefreshCw className="icon-size-200" />
            </IconBtn>
            <IconBtn label={isDark ? 'Helles Design' : 'Dunkles Design'} onClick={toggleTheme}>
              {isDark ? <Sun className="icon-size-200" /> : <Moon className="icon-size-200" />}
            </IconBtn>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] p-400">
        {data.status === 'loading' && <Loading />}
        {data.status === 'error' && <ErrorBox message={data.message} onRetry={() => void refetch()} />}
        {data.status === 'ready' && (
          <Dashboard
            data={data.value}
            view={view}
            set={set}
            lastActual={lastActual}
            hasOpenMonths={hasOpenMonths}
            openFrom={openFrom}
          />
        )}
      </main>
    </div>
  );
}

function Dashboard({
  data,
  view,
  set,
  lastActual,
  hasOpenMonths,
  openFrom,
}: {
  data: PnlData;
  view: ViewState;
  set: (p: Partial<ViewState>) => void;
  lastActual: string;
  hasOpenMonths: boolean;
  openFrom: string;
}) {
  // Closed years have no forecast part: the lever always acts on the whole year.
  const sim: SimParams = hasOpenMonths ? view.sim : { ...view.sim, scope: 'fy' };
  const deferredSim = useDeferredValue(sim);
  const simEnabled = view.mode === 'fy';
  const simActive = simEnabled && isSimActive(deferredSim);

  const model = useMemo(
    () => buildPnl({ konten: data.konten, werte: data.werte, mode: view.mode, sim: simEnabled ? deferredSim : EMPTY_SIM }),
    [data, view.mode, deferredSim, simEnabled]
  );
  const steps = useMemo(
    () => (simEnabled ? bridge({ konten: data.konten, werte: data.werte, sim: deferredSim }) : []),
    [data, deferredSim, simEnabled]
  );

  const opexBlocks = useMemo(() => {
    const s = new Set<string>();
    for (const k of data.konten) if (k.rowType === 'Account' && k.l1 === LINE_OPEX && k.l2) s.add(k.l2);
    return [...s].sort();
  }, [data.konten]);

  const byName = new Map<string, Line>();
  for (const l of model.lines.values()) if (l.depth === 0) byName.set(l.name, l);
  const ebt = byName.get('EBT');
  const tax = byName.get('Income taxes');
  const baseTaxRate = ebt && tax && ebt.cols.base ? -tax.cols.base / ebt.cols.base : 0;

  const selected = model.lines.get(view.line) ?? model.lines.get(model.top[0])!;

  return (
    <div className="flex flex-col gap-400">
      <div className="flex flex-wrap items-center gap-x-400 gap-y-100 text-200 text-muted-foreground">
        <span>
          Ist bis <strong className="text-foreground">{lastActual ? monthLabel(lastActual) : '–'} {lastActual.slice(0, 4)}</strong>
          {hasOpenMonths && view.mode === 'fy' ? `, danach Forecast` : ''}
        </span>
        <span className="flex flex-wrap gap-300">
          <ScenarioLabel s="AC" label="Ist" />
          <ScenarioLabel s="FC" label="Forecast" />
          <ScenarioLabel s="PL" label="Plan" />
          <ScenarioLabel s="PY" label="Vorjahr" />
          <ScenarioLabel s="SIM" label="Simulation" />
        </span>
        <span>
          Abweichungen: <span className="font-medium text-good">positiv</span> /{' '}
          <span className="font-medium text-bad">negativ</span> fürs Ergebnis
        </span>
      </div>

      <KpiStrip model={model} mode={view.mode} unit={view.unit} simActive={simActive} />

      <div className="grid gap-400 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-400">
          {selected && selected.depth === 0 && selected.rowType !== 'KPI' && (
            <TrendChart line={selected} konten={data.konten} monate={data.monate} lastActual={lastActual} unit={view.unit} />
          )}
          <PnlTable
            model={model}
            mode={view.mode}
            unit={view.unit}
            simActive={simActive}
            selectedLine={selected?.id ?? ''}
            onSelectLine={(line) => set({ line })}
          />
        </div>
        <div className="xl:sticky xl:top-[76px] xl:self-start">
          <SimPanel
            model={model}
            sim={sim}
            onChange={(s) => set({ sim: s })}
            onReset={() => set({ sim: { ...EMPTY_SIM, scope: view.sim.scope } })}
            steps={steps}
            unit={view.unit}
            simActive={simActive}
            enabled={simEnabled}
            hasOpenMonths={hasOpenMonths}
            openFrom={openFrom}
            opexBlocks={opexBlocks}
            baseTaxRate={baseTaxRate}
          />
        </div>
      </div>

      <footer className="border-t border-border pt-300 text-200 text-muted-foreground">
        Quelle: Semantikmodell „ChartKitchen byDatenWG Demo", Tabellen fact-guv und dim-konten · Notation angelehnt an IBCS · Simulationen
        sind Modellrechnungen und verändern keine Daten.
      </footer>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-md bg-muted p-100">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-sm px-300 py-100 text-200 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
            value === o.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
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

function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-400">
      <p className="text-300 text-muted-foreground">GuV wird aus dem Semantikmodell geladen …</p>
      <div className="grid grid-cols-2 gap-300 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[150px] animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid gap-400 xl:grid-cols-[1fr_360px]">
        <div className="h-[520px] animate-pulse rounded-lg bg-muted" />
        <div className="h-[520px] animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-800 max-w-[560px] rounded-lg border border-destructive/40 bg-card p-500">
      <h2 className="font-heading text-400 font-semibold">GuV konnte nicht geladen werden</h2>
      <p className="mt-200 text-300 text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-400 rounded-md bg-primary px-400 py-200 text-300 font-semibold text-primary-foreground hover:opacity-90"
      >
        Erneut versuchen
      </button>
    </div>
  );
}

export default App;
