// "Pipeline nach …": open and weighted volume per member of a dimension.
// Clicking a row cross-filters the whole cockpit.

import { useMemo, useState } from 'react';

import { Switch, Tile } from '@/components/Tile';
import { useSales } from '@/hooks/sales.context';
import { DIM_LABEL, type Dim } from '@/lib/sales/model';

import { OpenBars, OpenBarsLegend, type OpenBarRow } from './OpenBars';
import { groupRows, openDealsOf, TOP_N } from './pipeline-calc';

const DIMS: { id: Dim; label: string }[] = [
  { id: 'vertriebler', label: 'Vertriebler' },
  { id: 'bundesland', label: 'Bundesland' },
  { id: 'gruppe', label: 'Produktgruppe' },
  { id: 'kunde', label: 'Kunde' },
];

export function DimTile() {
  const { data, filter, toggleMember, clearFilter } = useSales();
  const [dim, setDim] = useState<Dim>('vertriebler');

  // The filter of the shown dimension is ignored so every member stays visible.
  const { rows, rest } = useMemo(() => groupRows(openDealsOf(data, filter, dim), dim), [data, filter, dim]);
  const list: OpenBarRow[] = rest ? [...rows, { ...rest, inert: true }] : rows;
  const selected = filter[dim] ?? [];

  const tools = (
    <>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => clearFilter(dim)}
          className="rounded-sm px-100 text-200 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Filter aufheben
        </button>
      )}
      <Switch label="Dimension" value={dim} options={DIMS} onChange={setDim} />
    </>
  );

  return (
    <Tile
      title={`Pipeline nach ${DIM_LABEL[dim]}`}
      sub={`Offene Angebote · € · Top ${TOP_N} nach gewichtetem Wert`}
      tools={tools}
    >
      <OpenBarsLegend />
      <OpenBars
        rows={list}
        label={`Pipeline nach ${DIM_LABEL[dim]}`}
        selected={selected}
        hasSelection={selected.length > 0}
        onSelect={(k) => toggleMember(dim, k)}
        selectLabel="Filter umschalten"
      />
    </Tile>
  );
}
