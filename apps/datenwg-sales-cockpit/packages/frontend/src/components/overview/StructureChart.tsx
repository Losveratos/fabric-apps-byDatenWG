// Structure chart as ChartKitchen "integrated variance bridge": rows aligned
// across three tiers (AC · PY | ΔPY bridge | ΔPY%), PY Σ → Δ per member (top 15
// + "übrige") → AC Σ. Member rows cross-filter the cockpit. In zoom mode the
// chart can switch to small multiples split by a second dimension.

import { useId, useState } from 'react';

import { ScenarioTag } from '@/components/ibcs/Ibcs';
import { Switch, Tile } from '@/components/Tile';
import { useSales } from '@/hooks/sales.context';
import { fmtDelta, periodLabel, unitLabel } from '@/lib/sales/format';
import { DIM_LABEL, type Dim } from '@/lib/sales/model';

import { StructureBridge } from './StructureBridge';
import { bridgeDomain, bridgeMessage, buildBridge, type StructSort } from './StructureBridgeModel';
import { MULT_TOP_KUNDEN, StructureMultiples } from './StructureMultiples';

type Mode = 'single' | 'multiples';
type ScaleMode = 'shared' | 'own';

const STRUCT_DIMS: Dim[] = ['vertriebler', 'bundesland', 'gruppe', 'typ', 'kunde'];
const DIMS = STRUCT_DIMS.map((id) => ({ id, label: DIM_LABEL[id] }));
const splitLabel = (d: Dim) => (d === 'kunde' ? `Top ${MULT_TOP_KUNDEN} Kunden` : DIM_LABEL[d]);

const SORTS: { id: StructSort; label: string; title: string }[] = [
  { id: 'value', label: 'Wert', title: 'Nach Wert sortieren' },
  { id: 'delta', label: 'Δ', title: 'Nach Abweichung sortieren (günstig zuerst)' },
];
const MODES: { id: Mode; label: string }[] = [
  { id: 'single', label: 'Einzeln' },
  { id: 'multiples', label: 'Small Multiples' },
];
const SCALES: { id: ScaleMode; label: string; title: string }[] = [
  { id: 'shared', label: 'gemeinsam', title: 'Gemeinsame Skala, Balkenlängen über alle Kacheln vergleichbar' },
  { id: 'own', label: 'je Kachel', title: 'Eigene Skala je Kachel' },
];

const TOP_N = 15;
const toolBtn =
  'rounded-sm px-100 text-200 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring';

export function StructureChart() {
  const ctx = useSales();
  const { view, setView, months, filter, kpi, year, toggleMember, clearFilter } = ctx;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [sort, setSort] = useState<StructSort>('delta');
  const [mode, setMode] = useState<Mode>('single');
  const [splitPick, setSplitPick] = useState<Dim | null>(null);
  const [scaleMode, setScaleMode] = useState<ScaleMode>('shared');
  const [drill, setDrill] = useState<{ dim: Dim; member: string } | null>(null);

  const dim = view.structDim;
  const dimLabel = DIM_LABEL[dim] ?? dim;
  const picked = filter[dim] ?? [];
  const dimFilterActive = picked.length > 0;
  const splitOptions = STRUCT_DIMS.filter((d) => d !== dim).map((id) => ({ id, label: splitLabel(id) }));
  const splitDim = splitPick && splitPick !== dim ? splitPick : splitOptions[0].id;
  const drillActive = drill !== null && drill.dim !== dim && (filter[drill.dim] ?? []).includes(drill.member);

  const data = buildBridge(ctx, kpi, dim, { months, filter, picked, sort, topN: TOP_N });
  const message = bridgeMessage(kpi, data, fmtDelta);
  const cut = data.bridge && bridgeDomain([data]).cut;

  const pickCard = (member: string) => {
    if (!(filter[splitDim] ?? []).includes(member)) toggleMember(splitDim, member);
    setDrill({ dim: splitDim, member });
    setMode('single');
  };
  const backToMultiples = () => {
    if (drill) clearFilter(drill.dim);
    setDrill(null);
    setMode('multiples');
  };

  const tools = (zoomed: boolean) => (
    <>
      {dimFilterActive && (
        <button type="button" onClick={() => clearFilter(dim)} className={toolBtn}>
          Filter aufheben
        </button>
      )}
      <Switch label="Dimension" value={dim} options={DIMS} onChange={(v) => setView({ structDim: v })} />
      <Switch label="Sortierung" value={sort} options={SORTS} onChange={setSort} />
      {zoomed && <Switch label="Ansicht" value={mode} options={MODES} onChange={setMode} />}
      {zoomed && mode === 'multiples' && (
        <>
          <Switch label="aufgeteilt nach" value={splitDim} options={splitOptions} onChange={setSplitPick} />
          <Switch label="Skala" value={scaleMode} options={SCALES} onChange={setScaleMode} />
        </>
      )}
    </>
  );

  const title = `${kpi.label} nach ${dimLabel}`;
  const sub = `${unitLabel(kpi)} · AC vs PY · ${periodLabel(months, year)}`;

  const single = (zoomed: boolean) => {
    if (data.rows.length === 0) return <p className="py-600 text-center text-300 text-muted-foreground">Keine Mitglieder für diese Auswahl.</p>;
    return (
      <div className={zoomed ? 'mx-auto w-full max-w-[1100px]' : undefined}>
        <StructureBridge
          data={data}
          kpi={kpi}
          uid={zoomed ? `${uid}z` : uid}
          width={zoomed ? 760 : 560}
          filterActive={dimFilterActive}
          onToggle={(m) => toggleMember(dim, m)}
          ariaLabel={title}
        />
        <p className="mt-200 flex flex-wrap items-center gap-x-300 gap-y-100 text-100 text-muted-foreground">
          <ScenarioTag code="PY" />
          <ScenarioTag code="AC" />
          {data.bridge ? (
            <span>
              Brücke PY Σ → Δ je {dimLabel} → AC Σ{data.rows.some((r) => r.kind === 'rest') ? ', übrige zusammengefasst' : ''}
              {cut ? ' · Achse der Brücke gekappt (Doppelstrich), Δ bleiben lesbar' : ''}
            </span>
          ) : (
            <span>{kpi.label} ist nicht additiv: keine Brücke, ΔPY je Element einzeln; Σ zeigt den Periodenwert.</span>
          )}
        </p>
      </div>
    );
  };

  const body = (zoomed: boolean) => {
    if (zoomed && mode === 'multiples')
      return <StructureMultiples structDim={dim} splitDim={splitDim} shared={scaleMode === 'shared'} sort={sort} uid={`${uid}sm`} onPick={pickCard} />;
    return (
      <>
        {zoomed && drillActive && drill && (
          <nav aria-label="Pfad" className="mb-300 flex flex-wrap items-center gap-200 text-200">
            <button type="button" onClick={backToMultiples} className={toolBtn}>
              ← Zurück zu Small Multiples
            </button>
            <span className="text-muted-foreground">
              Small Multiples › {DIM_LABEL[drill.dim]}: <strong className="text-foreground">{drill.member}</strong>
            </span>
          </nav>
        )}
        {single(zoomed)}
      </>
    );
  };

  return (
    <Tile title={title} sub={sub} message={message} tools={tools}>
      {body}
    </Tile>
  );
}
