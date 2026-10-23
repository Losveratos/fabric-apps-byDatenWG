// Small multiples of the structure bridge (zoom mode): one compact bridge of
// the structure dimension per member of a split dimension. Optional shared
// tier-2 scale so bar lengths compare across cards (IBCS: identical scales).

import { VariancePill } from '@/components/ibcs/Ibcs';
import { useSales } from '@/hooks/sales.context';
import { fmt, fmtRel, relDelta, unitLabel } from '@/lib/sales/format';
import { favourable } from '@/lib/sales/kpis';
import { DIM_LABEL, type Dim } from '@/lib/sales/model';

import { StructureBridge } from './StructureBridge';
import { bridgeDomain, buildBridge, type StructSort } from './StructureBridgeModel';

/** Customers are many: only the top N by AC get a card. */
export const MULT_TOP_KUNDEN = 12;
const MULT_TOP_N = 8;
const CARD_W = 300;

export function StructureMultiples({
  structDim,
  splitDim,
  shared,
  sort,
  uid,
  onPick,
}: {
  structDim: Dim;
  splitDim: Dim;
  shared: boolean;
  sort: StructSort;
  uid: string;
  onPick: (member: string) => void;
}) {
  const ctx = useSales();
  const { kpi, months, filter, byMember } = ctx;

  let split = byMember(kpi, splitDim, { months, filter }).sort((a, b) => {
    const fa = Number.isFinite(a.ac);
    const fb = Number.isFinite(b.ac);
    if (!fa || !fb) return fa === fb ? a.member.localeCompare(b.member) : fa ? -1 : 1;
    return b.ac - a.ac;
  });
  if (splitDim === 'kunde') split = split.slice(0, MULT_TOP_KUNDEN);

  const cards = split.map((m) => ({
    member: m.member,
    data: buildBridge(ctx, kpi, structDim, {
      months,
      filter: { ...filter, [splitDim]: [m.member] },
      sort,
      topN: MULT_TOP_N,
    }),
  }));
  const sharedDomain = shared ? bridgeDomain(cards.map((c) => c.data)) : undefined;
  const structLabel = DIM_LABEL[structDim] ?? structDim;
  const splitLabel = DIM_LABEL[splitDim] ?? splitDim;

  if (cards.length === 0) return <p className="py-600 text-center text-300 text-muted-foreground">Keine Mitglieder für diese Auswahl.</p>;

  return (
    <div className="flex flex-col gap-300">
      <p className="text-200 text-muted-foreground">
        {kpi.label} nach {structLabel}, aufgeteilt nach {splitDim === 'kunde' ? `Top ${MULT_TOP_KUNDEN} Kunden` : splitLabel} · ΔPY-Brücke je Kachel ·{' '}
        {shared ? 'gemeinsame Skala über alle Kacheln, Balkenlängen sind vergleichbar' : 'Skala je Kachel, Balkenlängen nur innerhalb einer Kachel vergleichbar'}
        {!kpi.additive && ' · nicht additiv: ΔPY je Element statt Brücke'}
      </p>
      <ul className="grid grid-cols-1 gap-300 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-label={`Small Multiples nach ${splitLabel}`}>
        {cards.map((c, i) => {
          const rel = relDelta(c.data.acSum, c.data.pySum);
          const d = c.data.acSum - c.data.pySum;
          const good = !(Number.isFinite(d) && favourable(kpi, d) < 0);
          return (
            <li key={c.member}>
              <button
                type="button"
                onClick={() => onPick(c.member)}
                aria-label={`${c.member}: AC ${fmt(kpi, c.data.acSum)} ${unitLabel(kpi)}, ΔPY% ${fmtRel(rel)}. Einzelansicht öffnen`}
                className="flex h-full w-full flex-col gap-100 rounded-md border border-border bg-card p-200 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex items-baseline justify-between gap-200">
                  <span className="truncate text-300 font-semibold" title={c.member}>
                    {c.member}
                  </span>
                  <span className="flex shrink-0 items-center gap-200">
                    <span className="font-monospace text-200 font-bold">{fmt(kpi, c.data.acSum)}</span>
                    <VariancePill value={rel} good={good}>
                      {fmtRel(rel)}
                    </VariancePill>
                  </span>
                </span>
                {c.data.rows.length > 0 ? (
                  <StructureBridge
                    data={c.data}
                    kpi={kpi}
                    uid={`${uid}m${i}`}
                    variant="compact"
                    width={CARD_W}
                    domain={sharedDomain}
                    ariaLabel={`${kpi.label} ${c.member} nach ${structLabel}`}
                  />
                ) : (
                  <span className="py-300 text-200 text-muted-foreground">Keine Daten</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
