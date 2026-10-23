// Overview (Shneiderman: overview first). KPI row, time chart and structure
// side by side, then an outlook strip that leads to the pipeline page.

import { ArrowRight } from 'lucide-react';

import { KpiCards } from '@/components/KpiCards';
import { StructureChart } from '@/components/overview/StructureChart';
import { TimeChart } from '@/components/overview/TimeChart';
import { Tile } from '@/components/Tile';
import { useSales } from '@/hooks/sales.context';
import { fmtEuro } from '@/lib/sales/format';
import { KPI_BY_ID } from '@/lib/sales/kpis';

export function OverviewPage() {
  return (
    <div className="flex flex-col gap-[18px]">
      <KpiCards />
      <div className="grid gap-[18px] 2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <TimeChart />
        <StructureChart />
      </div>
      <Outlook />
    </div>
  );
}

/** Small outlook band: open pipeline and forecast after the snapshot. */
function Outlook() {
  const { data, setView, total, filter } = useSales();
  const asOfY = Number(data.asOf.slice(0, 4));
  const years = [asOfY, asOfY + 1, asOfY + 2];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const rows = years.map((y) => ({
    y,
    won: total(KPI_BY_ID.won, { year: y, months, filter }),
    open: total(KPI_BY_ID.openW, { year: y, months, filter }),
    fc: total(KPI_BY_ID.fc, { year: y, months, filter }),
  }));
  const max = Math.max(1, ...rows.map((r) => Math.max(r.won + r.open, r.fc)));

  return (
    <Tile
      title="Ausblick"
      sub={`Mio. € · AC bis Datenstand, Pipeline gewichtet, FC · ${years[0]}..${years[2]}`}
      collapsible
      zoomable={false}
      tools={
        <button
          type="button"
          onClick={() => setView({ page: 'pipeline' })}
          className="inline-flex items-center gap-100 rounded-md px-200 py-100 text-200 font-medium text-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          Zu Pipeline & Forecast <ArrowRight className="icon-size-100" aria-hidden="true" />
        </button>
      }
    >
      <div className="grid gap-400 md:grid-cols-3">
        {rows.map((r) => (
          <div key={r.y} className="flex flex-col gap-100">
            <div className="flex items-baseline justify-between text-200">
              <span className="font-semibold">{r.y}</span>
              <span className="text-muted-foreground">FC {fmtEuro(r.fc)}</span>
            </div>
            <div className="relative h-[14px] rounded-sm bg-muted" aria-hidden="true">
              <div className="absolute inset-y-0 left-0 bg-[color:var(--ibcs-ac)]" style={{ width: `${(r.won / max) * 100}%` }} />
              <div
                className="absolute inset-y-0 border border-[color:var(--ibcs-ac)] bg-card"
                style={{ left: `${(r.won / max) * 100}%`, width: `${(r.open / max) * 100}%` }}
              />
              <div className="absolute -top-[3px] -bottom-[3px] w-[2px] bg-[color:var(--ibcs-ac)]" style={{ left: `${(r.fc / max) * 100}%` }} title="Forecast" />
            </div>
            <p className="text-100 text-muted-foreground">
              gewonnen {fmtEuro(r.won)} · Pipeline gewichtet {fmtEuro(r.open)}
            </p>
          </div>
        ))}
      </div>
    </Tile>
  );
}
