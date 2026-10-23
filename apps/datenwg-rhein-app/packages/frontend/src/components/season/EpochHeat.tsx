// "Epochen × Monate": heat table of ΔREF% of the selected KPI per epoch and
// calendar month. Teal = favourable, red = unfavourable, intensity by |Δ%|
// (relative to the largest cell). Click sets that month and epoch as filter.

import { C } from '@/lib/ibcs/notation';
import { fmt, fmtDelta, fmtRel } from '@/lib/rhein/format';
import { favourable, type KpiDef } from '@/lib/rhein/kpis';
import { MONTHS, type Epoch } from '@/lib/rhein/model';
import { cn } from '@/lib/utils';

import { fin, orNa } from './varint';

export interface HeatCell {
  ac: number;
  ref: number;
  d: number;
  rel: number;
}

export interface HeatRow {
  epoch: Epoch;
  cells: HeatCell[];
}

/** Intensity 0..1 of a cell: |Δ%| relative to the largest |Δ%|, falling back to |Δ|. */
function heatScale(rows: HeatRow[]) {
  const cells = rows.flatMap((r) => r.cells);
  const maxRel = Math.max(0, ...cells.map((c) => Math.abs(c.rel)).filter(fin));
  const maxD = Math.max(0, ...cells.map((c) => Math.abs(c.d)).filter(fin));
  return (c: HeatCell) => {
    if (fin(c.rel) && maxRel > 0) return Math.min(1, Math.abs(c.rel) / maxRel);
    if (fin(c.d) && maxD > 0) return Math.min(1, Math.abs(c.d) / maxD);
    return 0;
  };
}

export function EpochHeat({
  rows,
  kpi,
  months,
  epochs,
  onPick,
}: {
  rows: HeatRow[];
  kpi: KpiDef;
  months: number[];
  epochs: Epoch[];
  onPick: (month: number, epoch: Epoch) => void;
}) {
  const inten = heatScale(rows);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[2px] text-200 tabular">
        <thead>
          <tr>
            <th scope="col" className="px-100 text-left text-100 font-medium text-muted-foreground">
              Epoche
            </th>
            {MONTHS.map((m, i) => (
              <th key={m} scope="col" className={cn('px-100 text-center text-100 font-medium text-muted-foreground', months.includes(i + 1) && 'text-foreground font-bold')}>
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.epoch}>
              <th scope="row" className={cn('whitespace-nowrap px-100 text-left text-200 font-medium', epochs.includes(r.epoch) && 'font-bold')}>
                {r.epoch}
              </th>
              {r.cells.map((c, i) => {
                const good = !fin(c.d) || favourable(kpi, c.d) >= 0;
                const k = inten(c);
                const pct = Math.round(12 + 78 * k);
                const col = good ? C.good : C.bad;
                const active = months.includes(i + 1) && epochs.includes(r.epoch);
                const label = fin(c.rel) ? fmtRel(c.rel, 0) : orNa(c.d, (v) => fmtDelta(kpi, v));
                return (
                  <td key={i} className="p-0">
                    <button
                      type="button"
                      aria-pressed={active}
                      aria-label={`${r.epoch}, ${MONTHS[i]}: ΔREF ${label}`}
                      title={`${r.epoch} · ${MONTHS[i]}\nAC ${orNa(c.ac, (v) => fmt(kpi, v))} · REF ${orNa(c.ref, (v) => fmt(kpi, v))}\nΔREF ${orNa(c.d, (v) => fmtDelta(kpi, v))} (${orNa(c.rel, (v) => fmtRel(v))})\nKlick: Monat und Epoche filtern`}
                      onClick={() => onPick(i + 1, r.epoch)}
                      className={cn(
                        'w-full min-w-[3rem] rounded-sm px-100 py-200 text-center font-monospace text-100 font-medium focus-visible:outline-2 focus-visible:outline-ring',
                        active && 'ring-2 ring-[color:var(--ibcs-hilite)]'
                      )}
                      style={{
                        background: `color-mix(in srgb, ${col} ${pct}%, transparent)`,
                        color: k > 0.55 ? '#ffffff' : undefined,
                      }}
                    >
                      {label}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pt-200 text-100 text-muted-foreground">
        Zelle = ΔREF% gegen den gleichen Monat 1817 bis 1920. Teal günstig, rot ungünstig, je kräftiger desto größer die Abweichung. Wo REF null ist, steht die absolute Abweichung.
      </p>
    </div>
  );
}
