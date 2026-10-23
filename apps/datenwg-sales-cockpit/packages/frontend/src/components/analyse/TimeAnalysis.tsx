// Tile A "Zeitanalyse": overview (one integrated variance chart) or small
// multiples per member; a card click zooms in by filtering on the member.

import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import { ScenarioTag } from '@/components/ibcs/Ibcs';
import { Switch, Tile } from '@/components/Tile';
import { useSales } from '@/hooks/sales.context';
import { fmtDelta, fmtRel, relDelta, unitLabel } from '@/lib/sales/format';
import { DIM_LABEL, type Dim } from '@/lib/sales/model';
import { C } from '@/lib/ibcs/notation';

import { fin, goodFor, largestDriver, memberSeries, totalSeries } from './analyse-data';
import { SmallMultiples } from './SmallMultiples';
import { TimeChartAC } from './TimeChartAC';

type Mode = 'total' | 'multiples';
type Scale = 'shared' | 'own';

const MULT_DIMS: { id: Dim; label: string; title?: string }[] = [
  { id: 'vertriebler', label: 'Vertriebler' },
  { id: 'bundesland', label: 'Bundesland' },
  { id: 'gruppe', label: 'Produktgruppe' },
  { id: 'typ', label: 'Produkttyp' },
  { id: 'kunde', label: 'Top 12 Kunden', title: 'Die 12 Kunden mit dem höchsten AC im Zeitraum' },
];

const MULT_IDS = MULT_DIMS.map((d) => d.id);

export function TimeAnalysis() {
  const ctx = useSales();
  const { view, setView, kpi, year, months, periodText, filter, toggleMember, clearFilter } = ctx;
  const multDim: Dim = MULT_IDS.includes(view.multDim) ? view.multDim : 'gruppe';
  const multiples = view.multiples;
  const shared = view.multScale !== 'own';

  const series = totalSeries(ctx, kpi);
  const list = multiples ? memberSeries(ctx, kpi, multDim, multDim === 'kunde' ? 12 : undefined) : [];

  // key message: total variance and the largest driver (additive KPIs only)
  const d = series.ac - series.py;
  const rel = relDelta(series.ac, series.py);
  const driverDim: Dim = multiples ? multDim : 'vertriebler';
  const driver = kpi.additive && fin(d) ? largestDriver(ctx.byMember(kpi, driverDim), d) : null;
  const unit = kpi.unit === 'n' ? '' : ` ${unitLabel(kpi)}`;
  let message: ReactNode = null;
  if (fin(d)) {
    const usePP = kpi.unit === 'pct' || !fin(rel);
    const mag = usePP ? fmtDelta(kpi, d) + (kpi.unit === 'pct' ? '' : unit) : fmtRel(rel);
    const level = mag.startsWith('±');
    message = (
      <>
        {kpi.label} {periodText}{' '}
        {level ? (
          'auf Höhe des Vorjahres'
        ) : (
          <>
            <span style={{ color: goodFor(kpi, d) ? C.good : C.bad }}>{mag}</span> {d > 0 ? 'über' : 'unter'} PY
          </>
        )}
        {driver && (
          <>
            ; größter Treiber: {driver.member}{' '}
            <span style={{ color: goodFor(kpi, driver.delta) ? C.good : C.bad }}>
              {fmtDelta(kpi, driver.delta)}
              {unit}
            </span>
          </>
        )}
      </>
    );
  }

  const zoomed = filter[multDim] ?? [];
  const pick = (member: string) => {
    if (!zoomed.includes(member)) toggleMember(multDim, member);
    setView({ multiples: false });
  };
  const back = () => {
    clearFilter(multDim);
    setView({ multiples: true });
  };

  const tools = (
    <>
      <span className="flex items-center gap-200">
        <ScenarioTag code="AC" />
        <ScenarioTag code="PY" />
      </span>
      <Switch<Mode>
        label="Darstellung"
        value={multiples ? 'multiples' : 'total'}
        options={[
          { id: 'total', label: 'Gesamt' },
          { id: 'multiples', label: 'Small Multiples' },
        ]}
        onChange={(v) => setView({ multiples: v === 'multiples' })}
      />
      {multiples && <Switch<Dim> label="Small Multiples nach" value={multDim} options={MULT_DIMS} onChange={(v) => setView({ multDim: v })} />}
      {multiples && (
        <Switch<Scale>
          label="Skala"
          value={shared ? 'shared' : 'own'}
          options={[
            { id: 'shared', label: 'gemeinsam', title: 'Gleiche Skala für alle Kacheln (IBCS)' },
            { id: 'own', label: 'je Kachel', title: 'Eigene Skala je Kachel' },
          ]}
          onChange={(v) => setView({ multScale: v })}
        />
      )}
    </>
  );

  const sub = `${unitLabel(kpi)} · AC vs PY · ${periodText}${multiples ? ` · nach ${DIM_LABEL[multDim]}` : ''}`;

  return (
    <Tile title="Zeitanalyse" sub={sub} message={message} tools={tools}>
      {multiples ? (
        <SmallMultiples list={list} kpi={kpi} months={months} shared={shared} onPick={pick} />
      ) : (
        <>
          {zoomed.length > 0 && (
            <nav aria-label="Zoom-Pfad" className="flex flex-wrap items-center gap-100 pb-200 text-200">
              <button
                type="button"
                onClick={back}
                title="Filter aufheben und zurück zu den Small Multiples"
                className="inline-flex items-center gap-100 rounded-sm px-100 font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <ChevronLeft className="icon-size-100" aria-hidden="true" />
                Gesamt
              </button>
              <span className="text-muted-foreground" aria-hidden="true">
                ›
              </span>
              <span className="font-semibold">
                {DIM_LABEL[multDim]}: {zoomed.join(', ')}
              </span>
            </nav>
          )}
          <TimeChartAC kpi={kpi} series={series} months={months} year={year} />
        </>
      )}
    </Tile>
  );
}
