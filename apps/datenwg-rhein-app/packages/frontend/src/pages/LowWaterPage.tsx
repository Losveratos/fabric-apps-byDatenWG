// Page "Niedrigwasser": old P05 threshold, share of days below it per decade,
// NM7Q per year and the 25 driest years.

import { Tile } from '@/components/Tile';
import { DecadeBelow } from '@/components/lowwater/DecadeBelow';
import { DryRanking } from '@/components/lowwater/DryRanking';
import { epochTally, lowestYears, TOP_N } from '@/components/lowwater/helpers';
import { Nm7qYears } from '@/components/lowwater/Nm7qYears';
import { useRhein } from '@/hooks/rhein.context';
import { C } from '@/lib/ibcs/notation';
import { fmt, fmtDelta, fmtNum } from '@/lib/rhein/format';
import { favourable, KPI_BY_ID } from '@/lib/rhein/kpis';

const BELOW = KPI_BY_ID.below;
const NM7Q = KPI_BY_ID.nm7q;

export function LowWaterPage() {
  const { data, total, ref, series, ranking, selectionText } = useRhein();

  const acBelow = total(BELOW);
  const refBelow = ref(BELOW);
  const dBelow = acBelow - refBelow;
  const goodBelow = favourable(BELOW, dBelow) >= 0;

  const lateBelow = total(BELOW, { epochs: ['ab 1996'] });
  const decMsg = Number.isFinite(lateBelow) && Number.isFinite(refBelow)
    ? `Seit 1996 liegen ${fmt(BELOW, lateBelow)} der Tage unter der alten Schwelle, in der Referenz waren es ${fmt(BELOW, refBelow)}.`
    : 'Für diese Auswahl gibt es keinen Vergleich mit der Referenz.';

  const yearPts = series(NM7Q, 'year').filter((p) => Number.isFinite(p.ac));
  const low = lowestYears(yearPts, 10);
  const lowLate = low.filter((p) => p.key >= 1996).length;
  const nmMsg = low.length
    ? `Das niedrigste 7-Tage-Mittel liegt bei ${fmt(NM7Q, low[0].ac)} m³/s im Jahr ${low[0].key}. ${lowLate} der 10 niedrigsten Jahre fallen in die Zeit ab 1996.`
    : 'Für diese Auswahl gibt es keine NM7Q-Werte.';

  const rows = ranking(NM7Q, 'asc', TOP_N);
  const pool = yearPts.filter((p) => p.active);
  const tally = epochTally(pool, rows);
  const late = tally.find((t) => t.epoch === 'ab 1996');
  const rankMsg = late
    ? `${fmtNum(late.counted)} der ${fmtNum(rows.length)} trockensten Jahre liegen ab 1996, bei gleichmäßiger Verteilung wären es rund ${fmtNum(late.expected, 1)}. Ein Hinweis, kein Beweis.`
    : `Die ${fmtNum(rows.length)} trockensten Jahre der Auswahl, mit Epoche und Abstand zur Referenz.`;

  return (
    <div className="flex flex-col gap-[18px]">
      <section className="tile flex flex-wrap items-center gap-x-600 gap-y-300 px-400 py-300" aria-label="Alte P05-Schwelle" data-testid="p05-strip">
        <div>
          <p className="text-100 font-medium tracking-wide text-muted-foreground uppercase">Alte P05-Schwelle</p>
          <p className="font-heading text-600 leading-600 font-semibold tabular-nums">
            rund {fmtNum(data.p05)} m³/s
          </p>
          <p className="text-200 text-foreground/70">5-%-Quantil August und September 1817 bis 1920</p>
        </div>
        <div>
          <p className="text-100 font-medium tracking-wide text-muted-foreground uppercase">Tage darunter, Auswahl</p>
          <p className="font-heading text-500 leading-500 font-semibold tabular-nums">{fmt(BELOW, acBelow)}</p>
          <p className="text-200 text-foreground/70">{selectionText}</p>
        </div>
        <div>
          <p className="text-100 font-medium tracking-wide text-muted-foreground uppercase">REF 1817 bis 1920</p>
          <p className="font-heading text-500 leading-500 font-semibold tabular-nums">{fmt(BELOW, refBelow)}</p>
          <p className="text-200 text-foreground/70">gleiche Monate</p>
        </div>
        <div>
          <p className="text-100 font-medium tracking-wide text-muted-foreground uppercase">Abweichung</p>
          <p className="font-heading text-500 leading-500 font-semibold tabular-nums" style={{ color: goodBelow ? C.good : C.bad }}>
            {fmtDelta(BELOW, dBelow)}
          </p>
          <p className="text-200 text-foreground/70">Prozentpunkte zur Referenz</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-2">
        <Tile title="Tage unter der alten P05-Schwelle je Dekade" sub={`% der Tage · REF 1817 bis 1920 · ${selectionText}`} message={decMsg}>
          {(zoomed) => <DecadeBelow zoomed={zoomed} />}
        </Tile>
        <Tile title="Die 25 trockensten Jahre" sub={`NM7Q in m³/s · ${selectionText}`} message={rankMsg}>
          {(zoomed) => <DryRanking zoomed={zoomed} />}
        </Tile>
      </div>

      <Tile title="NM7Q je Jahr" sub={`m³/s · REF 1817 bis 1920 · ${selectionText}`} message={nmMsg}>
        {(zoomed) => <Nm7qYears zoomed={zoomed} />}
      </Tile>
    </div>
  );
}
