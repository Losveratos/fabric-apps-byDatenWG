// The 25 driest years by NM7Q as an IBCS bar list, plus the epoch tally
// "expected vs counted" (a hint, not a proof).

import { ScenarioTag } from '@/components/ibcs/Ibcs';
import { useRhein } from '@/hooks/rhein.context';
import { C } from '@/lib/ibcs/notation';
import { fmt, fmtDelta, fmtNum } from '@/lib/rhein/format';
import { favourable, KPI_BY_ID } from '@/lib/rhein/kpis';
import { epochTally, TOP_N } from './helpers';

const NM7Q = KPI_BY_ID.nm7q;
export function DryRanking({ zoomed = false }: { zoomed?: boolean }) {
  const { ranking, series, openYear } = useRhein();
  const rows = ranking(NM7Q, 'asc', TOP_N);
  const pool = series(NM7Q, 'year').filter((p) => p.active && Number.isFinite(p.ac));
  if (!rows.length) return <p className="text-200 text-muted-foreground">Keine Daten für diese Auswahl.</p>;

  const ref = series(NM7Q, 'year')[0]?.ref ?? NaN;
  const max = Math.max(...rows.map((r) => r.value), ref, 1);
  const tally = epochTally(pool, rows);

  return (
    <div className={zoomed ? 'grid gap-600 lg:grid-cols-[2fr_1fr]' : 'flex flex-col gap-400'}>
      <div>
        <div className="mb-200 flex flex-wrap items-center gap-300 text-200 text-foreground/70">
          <ScenarioTag code="AC">NM7Q des Jahres</ScenarioTag>
          <ScenarioTag code="PY">REF 1817 bis 1920 ({fmt(NM7Q, ref)} m³/s)</ScenarioTag>
        </div>
        <ol className="flex flex-col gap-[3px]" aria-label="Die 25 trockensten Jahre">
          {rows.map((r, i) => {
            const d = r.value - ref;
            const good = favourable(NM7Q, d) >= 0;
            return (
              <li key={r.year} data-testid="dry-row" className="grid grid-cols-[1.6rem_3rem_5.5rem_1fr_4.2rem_4.6rem] items-center gap-200 text-200">
                <span className="text-right font-monospace text-100 text-muted-foreground">{i + 1}</span>
                <button
                  type="button"
                  onClick={() => openYear(r.year)}
                  aria-label={`Jahr ${r.year} öffnen`}
                  className="rounded-sm text-left font-monospace font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {r.year}
                </button>
                <span className="truncate font-monospace text-100 text-muted-foreground">{r.epoch}</span>
                <span className="relative h-[12px]" aria-hidden="true">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${(r.value / max) * 100}%`, background: C.ac }} />
                  <span className="absolute -inset-y-[2px] w-[2px]" style={{ left: `${(ref / max) * 100}%`, background: C.py }} />
                </span>
                <span className="text-right tabular-nums">{fmt(NM7Q, r.value)}</span>
                <span className="text-right tabular-nums font-medium" style={{ color: good ? C.good : C.bad }}>
                  {fmtDelta(NM7Q, d)}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-200 text-100 text-muted-foreground">Werte in m³/s; Δ zur Referenz. Der graue Strich markiert die Referenz.</p>
      </div>
      <div>
        <h3 className="mb-200 text-200 font-semibold">Epochen: erwartet gegen gezählt</h3>
        <table className="w-full text-200">
          <thead>
            <tr className="text-left text-100 text-muted-foreground">
              <th className="py-100 font-medium">Epoche</th>
              <th className="py-100 text-right font-medium">Jahre</th>
              <th className="py-100 text-right font-medium">erwartet</th>
              <th className="py-100 text-right font-medium">gezählt</th>
            </tr>
          </thead>
          <tbody>
            {tally.map((t) => (
              <tr key={t.epoch} data-testid="tally-row" className="border-t">
                <td className="py-100">{t.epoch}</td>
                <td className="py-100 text-right tabular-nums">{fmtNum(t.years)}</td>
                <td className="py-100 text-right tabular-nums">{fmtNum(t.expected, 1)}</td>
                <td className="py-100 text-right font-semibold tabular-nums" style={{ color: t.counted > t.expected + 1 ? C.bad : undefined }}>
                  {fmtNum(t.counted)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-200 text-100 text-muted-foreground">
          Erwartet: {rows.length} mal Anteil der Epoche an allen Jahren. Das ist ein Hinweis, kein Beweis: Messmethode, Flussausbau und Wetter wirken zugleich.
        </p>
      </div>
    </div>
  );
}
