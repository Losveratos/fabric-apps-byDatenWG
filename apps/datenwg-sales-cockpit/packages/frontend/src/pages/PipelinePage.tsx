// Pipeline & Forecast: overview (KPI strip, probability and dimension bars,
// outlook per close month), zoom per tile, details on demand (offer list).

import { useMemo, type ReactNode } from 'react';

import { DimTile } from '@/components/pipeline/DimTile';
import { OutlookTile } from '@/components/pipeline/OutlookTile';
import { fin, forecastOf, openDealsOf, passes, weighted } from '@/components/pipeline/pipeline-calc';
import { ProbabilityTile } from '@/components/pipeline/ProbabilityTile';
import { useSales } from '@/hooks/sales.context';
import { fmtEuro } from '@/lib/sales/format';

function KpiCard({ label, value, note }: { label: string; value: string; note: ReactNode }) {
  return (
    <div className="tile px-400 py-300">
      <p className="text-200 font-medium text-muted-foreground">{label}</p>
      <p className="tabular pt-100 text-hero-700 leading-hero-700 font-semibold">{value}</p>
      <p className="pt-100 text-200 text-muted-foreground">{note}</p>
    </div>
  );
}

export function PipelinePage() {
  const { data, filter, openCustomer } = useSales();

  const open = useMemo(() => openDealsOf(data, filter), [data, filter]);
  const fc = useMemo(() => forecastOf(data, filter), [data, filter]);
  const dealsForOutlook = useMemo(() => data.deals.filter((d) => d.status !== 'verloren' && passes(filter, d)), [data, filter]);

  const openV = open.reduce((s, d) => s + fin(d.summe), 0);
  const openW = open.reduce((s, d) => s + weighted(d), 0);
  const fc2023 = fc.filter((f) => f.flag === 1 && f.closeY === 2023).reduce((s, f) => s + fin(f.summe), 0);
  const quota = openV > 0 ? Math.round((openW / openV) * 100) : 0;

  return (
    <div className="flex flex-col gap-400 p-400">
      <header>
        <h1 className="font-heading text-500 leading-500 font-semibold">Pipeline &amp; Forecast</h1>
        <p className="text-200 text-muted-foreground">Was ist offen, wie wahrscheinlich ist es und wann wird es voraussichtlich abgeschlossen?</p>
      </header>

      <section aria-label="Kennzahlen" className="grid grid-cols-1 gap-300 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Offene Pipeline" value={fmtEuro(openV)} note="Summe aller offenen Angebote, ungewichtet" />
        <KpiCard label="Gewichtete Pipeline" value={fmtEuro(openW)} note={`Summe × Wahrscheinlichkeit · ${quota} % der offenen Pipeline`} />
        <KpiCard label="Offene Angebote" value={open.length.toLocaleString('de-DE')} note="Anzahl, Abschluss geplant oder überfällig" />
        <KpiCard label="Forecast 2023" value={fmtEuro(fc2023)} note="Deals mit Erfolgsflag, Abschluss 2023" />
      </section>

      <div className="grid grid-cols-1 gap-400 xl:grid-cols-2">
        <ProbabilityTile open={open} onCustomer={openCustomer} />
        <DimTile />
      </div>

      <OutlookTile data={data} deals={dealsForOutlook} fc={fc} />

      <p className="text-200 text-muted-foreground">
        Stand 30.04.2023 · Wahrscheinlichkeiten aus der Status-Stufe · Forecast = Deals mit Erfolgsflag · kein Plan im Modell
      </p>
    </div>
  );
}
