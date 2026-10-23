// Details on demand: one year against REF 1817 bis 1920. All KPIs of the
// year for the selected months with ΔREF and the rank among all years, plus
// the 12-month discharge profile of the year against the REF profile.

import { X } from 'lucide-react';
import { useId } from 'react';

import { IbcsDefs, PinHead, ScenarioTag, VariancePill } from '@/components/ibcs/Ibcs';
import { Tile } from '@/components/Tile';
import { useRhein } from '@/hooks/rhein.context';
import { C, makeScale } from '@/lib/ibcs/notation';
import { fmt, fmtDelta, fmtNum, fmtRel, relDelta } from '@/lib/rhein/format';
import { favourable, KPIS, type KpiDef } from '@/lib/rhein/kpis';
import { epochOf, MONTHS, REF_FROM, REF_TO } from '@/lib/rhein/model';
import { cn } from '@/lib/utils';

import { deltaPhrase, pillText, REF_LABEL } from './shared';
import { fin } from './varint';

interface Rank {
  rank: number;
  of: number;
  /** "niedrigste" or "höchste": counted from the unfavourable end. */
  side: string;
}

function rankOf(kpi: KpiDef, values: { year: number; v: number }[], year: number): Rank | null {
  const list = values.filter((x) => fin(x.v)).sort((a, b) => (kpi.higherBetter ? a.v - b.v : b.v - a.v));
  const i = list.findIndex((x) => x.year === year);
  return i < 0 ? null : { rank: i + 1, of: list.length, side: kpi.higherBetter ? 'niedrigste' : 'höchste' };
}

export function YearDetail() {
  const { view, kpi, stats, ref, profile, openYear, selectionText, setView } = useRhein();
  const uid = 'yd' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const year = view.year;
  const all = stats();
  const st = all.find((s) => s.year === year);
  const refYears = Array.from({ length: REF_TO - REF_FROM + 1 }, (_, i) => REF_FROM + i);

  if (!st) {
    return (
      <Tile title={`Jahr ${year} im Detail`} zoomable={false}>
        <p className="text-300 text-muted-foreground">Für {year} liegen keine vollständigen Daten vor.</p>
      </Tile>
    );
  }

  const rows = KPIS.map((k) => {
    const ac = k.ofYear(st);
    const r = ref(k);
    return { k, ac, r, rank: rankOf(k, all.map((s) => ({ year: s.year, v: k.ofYear(s) })), year) };
  });
  const main = rows.find((x) => x.k.id === kpi.id)!;
  const ph = deltaPhrase(kpi, main.ac, main.r);
  const months = selectionText.split(' · ')[1] ?? '';

  const message = ph ? (
    <>
      {year} liegt {kpi.short} ({months}){' '}
      {ph.good === null ? 'auf Höhe der Referenz' : <span style={{ color: ph.good ? C.good : C.bad }}>{ph.text} der Referenz</span>}
      {main.rank && (
        <>
          {' '}
          · Rang {main.rank.rank} von {main.rank.of} ({main.rank.side} zuerst)
        </>
      )}
    </>
  ) : null;

  const tools = (
    <button
      type="button"
      onClick={() => openYear(0)}
      aria-label="Jahresdetail schließen"
      title="Jahresdetail schließen"
      className="rounded-md p-100 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      <X className="icon-size-200" />
    </button>
  );

  return (
    <Tile title={`Jahr ${year} im Detail`} sub={`${epochOf(year)} · AC vs ${REF_LABEL} · ${months}`} message={message} tools={tools}>
      <div className="grid gap-[18px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <table className="w-full text-200 tabular" aria-label={`Kennzahlen ${year}`}>
          <thead>
            <tr className="text-left text-100 text-muted-foreground">
              <th className="py-100 font-medium">Kennzahl</th>
              <th className="py-100 text-right font-medium">AC {year}</th>
              <th className="py-100 text-right font-medium">REF</th>
              <th className="py-100 text-right font-medium">ΔREF</th>
              <th className="py-100 text-right font-medium">Rang</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ k, ac, r, rank }) => {
              const good = favourable(k, ac - r) >= 0;
              const on = k.id === kpi.id;
              return (
                <tr
                  key={k.id}
                  className={cn('cursor-pointer border-t border-border hover:bg-muted', on && 'font-semibold')}
                  onClick={() => setView({ kpi: k.id })}
                  title={`${k.label} wählen`}
                >
                  <td className="py-100">{k.short}</td>
                  <td className="py-100 text-right">{fmt(k, ac)}</td>
                  <td className="py-100 text-right text-muted-foreground">{fmt(k, r)}</td>
                  <td className="py-100 text-right">
                    {fin(ac) && fin(r) ? (
                      <span className="inline-flex items-center gap-100">
                        <span style={{ color: good ? C.good : C.bad }}>{fmtDelta(k, ac - r)}</span>
                        <VariancePill value={relDelta(ac, r)} good={good}>
                          {pillText(k, ac, r)}
                        </VariancePill>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">n. a.</span>
                    )}
                  </td>
                  <td className="py-100 text-right" title={rank ? `${rank.side} Werte zuerst` : undefined}>
                    {rank ? `${fmtNum(rank.rank)} / ${fmtNum(rank.of)}` : 'n. a.'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Profile uid={uid} ac={profile([year])} refP={profile(refYears)} months={view.months} year={year} />
      </div>
    </Tile>
  );
}

/** 12 months: REF profile grey behind, the year dark in front, ΔREF% pins above. */
function Profile({ uid, ac, refP, months, year }: { uid: string; ac: number[]; refP: number[]; months: number[]; year: number }) {
  const W = 420;
  const H = 190;
  const X0 = 4;
  const X1 = W - 4;
  const slot = (X1 - X0) / 12;
  const cx = (i: number) => X0 + (i + 0.5) * slot;
  const s = makeScale([...ac, ...refP], [H - 16, 66], 0.05);
  const rels = ac.map((a, i) => relDelta(a, refP[i]));
  const rmax = Math.max(0.05, ...rels.filter(fin).map(Math.abs));
  const rs = makeScale([-rmax, rmax], [56, 16], 0);
  const cw = slot * 0.4;
  // Mean discharge is "more water = good" like MQ.
  const goodOf = (a: number, r: number) => a - r >= 0;
  return (
    <figure className="m-0">
      <figcaption className="mb-100 flex flex-wrap items-center gap-300 text-100 text-muted-foreground">
        <span>Monatsprofil Abfluss in m³/s</span>
        <ScenarioTag code="AC">{year}</ScenarioTag>
        <ScenarioTag code="PY">REF</ScenarioTag>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Monatsprofil ${year} gegen ${REF_LABEL}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        <IbcsDefs uid={uid} />
        <text x={X0} y={10} fontSize={9.5} fill={C.sub}>
          ΔREF%
        </text>
        <line x1={X0} x2={X1} y1={rs(0)} y2={rs(0)} stroke={C.py} strokeWidth={3} />
        {ac.map((a, i) => {
          const r = refP[i];
          const rel = rels[i];
          const good = goodOf(a, r);
          const sel = !months.length || months.includes(i + 1);
          return (
            <g key={i} opacity={sel ? 1 : 0.35}>
              {fin(rel) && (
                <>
                  <line x1={cx(i)} x2={cx(i)} y1={rs(0)} y2={rs(rel)} stroke={good ? C.good : C.bad} strokeWidth={1.6} />
                  <PinHead cx={cx(i)} cy={rs(rel)} r={3} good={good} minuend="AC" uid={uid} />
                </>
              )}
              {fin(r) && <rect x={cx(i) - cw / 2 - slot * 0.1} y={s(r)} width={cw} height={Math.max(0.5, s(0) - s(r))} fill={C.py} />}
              {fin(a) && <rect x={cx(i) - cw / 2 + slot * 0.1} y={s(a)} width={cw} height={Math.max(0.5, s(0) - s(a))} fill={C.ac} />}
              <text x={cx(i)} y={H - 3} textAnchor="middle" fontSize={9.5} fill={C.cat} fontWeight={months.includes(i + 1) ? 700 : 400}>
                {MONTHS[i]}
              </text>
              <title>{`${MONTHS[i]} ${year}: ${fmtNum(a)} m³/s · REF ${fmtNum(r)} m³/s · ΔREF% ${fmtRel(rel)}`}</title>
            </g>
          );
        })}
        <line x1={X0} x2={X1} y1={s(0)} y2={s(0)} stroke={C.ac} strokeWidth={1.2} />
      </svg>
    </figure>
  );
}
