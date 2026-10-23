// "Pipeline nach Wahrscheinlichkeit": overview (bars per probability bucket or
// step) and details on demand (top 15 offers of the clicked row).

import { useMemo, useState } from 'react';

import { Switch, Tile } from '@/components/Tile';
import { fmtDate, fmtEuro } from '@/lib/sales/format';
import type { Deal } from '@/lib/sales/model';

import { OpenBars, OpenBarsLegend } from './OpenBars';
import { dealsOfRow, fin, probabilityRows } from './pipeline-calc';

const LIST_N = 15;

type Mode = 'bucket' | 'step';

export function OfferList({ deals, title, onCustomer }: { deals: Deal[]; title: string; onCustomer: (name: string) => void }) {
  const top = useMemo(() => [...deals].sort((a, b) => fin(b.summe) - fin(a.summe)).slice(0, LIST_N), [deals]);
  return (
    <div className="mt-400 border-t border-border pt-300" aria-live="polite">
      <h3 className="text-300 font-semibold">{title}</h3>
      <p className="pb-200 text-200 text-muted-foreground">
        Top {top.length} von {deals.length} Angeboten nach Summe
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-200">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-100 pr-300 font-medium">Kunde</th>
              <th className="py-100 pr-300 font-medium">Thema</th>
              <th className="py-100 pr-300 font-medium">Vertriebler</th>
              <th className="py-100 pr-300 text-right font-medium">Wsk.</th>
              <th className="py-100 pr-300 text-right font-medium">Summe</th>
              <th className="py-100 text-right font-medium">Abschluss</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {top.map((d) => (
              <tr key={d.id} className="border-t border-border/60">
                <td className="py-100 pr-300">
                  <button
                    type="button"
                    onClick={() => onCustomer(d.kunde)}
                    className="rounded-sm text-left font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {d.kunde}
                  </button>
                </td>
                <td className="max-w-[220px] truncate py-100 pr-300 text-muted-foreground" title={d.topic}>
                  {d.topic}
                </td>
                <td className="py-100 pr-300">{d.vertriebler}</td>
                <td className="py-100 pr-300 text-right">{d.wsk} %</td>
                <td className="py-100 pr-300 text-right">{fmtEuro(d.summe)}</td>
                <td className="py-100 text-right">{fmtDate(d.abschluss)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProbabilityTile({ open, onCustomer }: { open: Deal[]; onCustomer: (name: string) => void }) {
  const [mode, setMode] = useState<Mode>('bucket');
  const [sel, setSel] = useState<string | null>(null);

  const rows = useMemo(() => probabilityRows(open, mode), [open, mode]);
  const selRow = rows.find((r) => r.key === sel && r.n > 0);
  const selDeals = useMemo(() => (selRow ? dealsOfRow(open, selRow.key) : []), [open, selRow]);

  const totalOpen = rows.reduce((s, r) => s + r.open, 0);
  const high = rows.find((r) => r.key === 'b4');
  const message =
    mode === 'bucket' && totalOpen > 0 && high
      ? `${fmtEuro(high.open)} (${Math.round((high.open / totalOpen) * 100)} %) der offenen Pipeline liegen über 80 % Wahrscheinlichkeit`
      : undefined;

  const tools = (
    <Switch
      label="Darstellung"
      value={mode}
      options={[
        { id: 'bucket' as const, label: 'Klassen', title: '4 Wahrscheinlichkeitsklassen' },
        { id: 'step' as const, label: 'Stufen', title: 'Einzelne Wahrscheinlichkeitsstufen' },
      ]}
      onChange={(v) => {
        setMode(v);
        setSel(null);
      }}
    />
  );

  return (
    <Tile
      title="Pipeline nach Wahrscheinlichkeit"
      sub={`Offene Angebote · € · ${mode === 'bucket' ? 'Klassen' : 'Stufen'} · oben höchste Wahrscheinlichkeit`}
      message={message}
      tools={tools}
    >
      <OpenBarsLegend />
      <OpenBars
        rows={rows}
        label="Pipeline nach Wahrscheinlichkeit"
        selected={selRow ? [selRow.key] : []}
        hasSelection={!!selRow}
        onSelect={(k) => setSel((cur) => (cur === k ? null : k))}
        selectLabel="Angebote anzeigen"
      />
      {selRow ? (
        <OfferList deals={selDeals} title={`Angebote ${selRow.label}`} onCustomer={onCustomer} />
      ) : (
        <p className="pt-300 text-200 text-muted-foreground">Zeile anklicken, um die größten Angebote der Klasse zu sehen.</p>
      )}
    </Tile>
  );
}
