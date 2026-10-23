// Share of days below the old P05 threshold per decade: AC columns, REF line,
// integrated delta columns (PP) below. Click a decade for its years.

import { useState } from 'react';

import { IbcsDefs, ScenarioTag } from '@/components/ibcs/Ibcs';
import { useRhein } from '@/hooks/rhein.context';
import { C, makeScale } from '@/lib/ibcs/notation';
import { fmt, fmtDelta } from '@/lib/rhein/format';
import { favourable, KPI_BY_ID } from '@/lib/rhein/kpis';

const BELOW = KPI_BY_ID.below;
const W = 720;
const L = 8;
const R = 8;
const AC_TOP = 26;
const AC_BOT = 170;
const D_TOP = 200;
const D_BOT = 284;

export function DecadeBelow({ zoomed = false }: { zoomed?: boolean }) {
  const { series, view, openYear } = useRhein();
  const [dec, setDec] = useState(0);
  const pts = series(BELOW, 'decade').filter((p) => Number.isFinite(p.ac) && Number.isFinite(p.ref));
  if (!pts.length) return <p className="text-200 text-muted-foreground">Keine Daten für diese Auswahl.</p>;

  const ref = pts[0].ref;
  const fAc = makeScale([...pts.map((p) => p.ac), ref], [AC_BOT, AC_TOP], 0.12);
  const deltas = pts.map((p) => p.ac - p.ref);
  const fD = makeScale(deltas, [D_BOT, D_TOP], 0.2);
  const band = (W - L - R) / pts.length;
  const bw = band * 0.62;

  const years = dec ? series(BELOW, 'year').filter((p) => p.key >= dec && p.key < dec + 10) : [];

  return (
    <div className="flex flex-col gap-300">
      <div className="flex flex-wrap items-center gap-300 text-200 text-foreground/70">
        <ScenarioTag code="AC">Anteil der Tage unter P05</ScenarioTag>
        <ScenarioTag code="PY">REF 1817 bis 1920 ({fmt(BELOW, ref)})</ScenarioTag>
        <span>Δ in Prozentpunkten (PP), rot = mehr Tage unter der Schwelle als in der Referenz</span>
      </div>
      <svg viewBox={`0 0 ${W} ${D_BOT + 22}`} className="w-full" style={{ maxHeight: zoomed ? 640 : 420 }} role="group" aria-label="Tage unter der alten P05-Schwelle je Dekade">
        <IbcsDefs uid="dec" />
        {pts.map((p, i) => {
          const x = L + i * band + (band - bw) / 2;
          const d = p.ac - p.ref;
          const good = favourable(BELOW, d) >= 0;
          const y0 = fD(0);
          const yD = fD(d);
          const sel = dec === p.key;
          return (
            <g
              key={p.key}
              role="button"
              tabIndex={0}
              aria-pressed={sel}
              aria-label={`${p.label}: ${fmt(BELOW, p.ac)} der Tage unter P05, ${fmtDelta(BELOW, d)} zur Referenz`}
              onClick={() => setDec(sel ? 0 : p.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setDec(sel ? 0 : p.key);
                }
              }}
              opacity={p.active ? 1 : 0.35}
              style={{ cursor: 'pointer', outlineOffset: 2 }}
            >
              <rect x={L + i * band} y={AC_TOP - 14} width={band} height={D_BOT - AC_TOP + 36} fill={sel ? C.hair : 'transparent'} opacity={sel ? 0.25 : 1} />
              <rect x={x} y={fAc(p.ac)} width={bw} height={Math.max(0, AC_BOT - fAc(p.ac))} fill={C.ac} />
              <text x={x + bw / 2} y={fAc(p.ac) - 4} textAnchor="middle" fontSize={zoomed ? 10 : 8.5} fill={C.cat} className="tabular-nums">
                {fmt(BELOW, p.ac).replace(' %', '')}
              </text>
              <rect x={x} y={Math.min(y0, yD)} width={bw} height={Math.abs(yD - y0)} fill={good ? C.good : C.bad} />
              <text x={x + bw / 2} y={D_BOT + 14} textAnchor="middle" fontSize={zoomed ? 10 : 8.5} fill={C.cat}>
                {p.label.replace('er', '')}
              </text>
            </g>
          );
        })}
        <line x1={L} x2={W - R} y1={AC_BOT} y2={AC_BOT} stroke={C.ac} strokeWidth={1.2} />
        <line x1={L} x2={W - R} y1={fAc(ref)} y2={fAc(ref)} stroke={C.py} strokeWidth={2.4} pointerEvents="none" />
        <line x1={L} x2={W - R} y1={fD(0)} y2={fD(0)} stroke={C.ac} strokeWidth={1.2} />
      </svg>
      {dec ? (
        <div className="rounded-md border p-300" aria-label={`Jahre der ${dec}er`}>
          <h3 className="mb-200 text-200 font-semibold">Jahre der {dec}er, Anteil unter P05</h3>
          <ul className="grid grid-cols-2 gap-x-400 gap-y-100 sm:grid-cols-5">
            {years.map((y) => {
              const d = y.ac - y.ref;
              const good = favourable(BELOW, d) >= 0;
              return (
                <li key={y.key}>
                  <button
                    type="button"
                    onClick={() => openYear(y.key)}
                    className="flex w-full items-baseline justify-between gap-200 rounded-sm px-100 text-200 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                    aria-label={`Jahr ${y.key} öffnen, ${fmt(BELOW, y.ac)}`}
                  >
                    <span className="font-monospace">{y.key}</span>
                    <span className="tabular-nums" style={{ color: good ? C.good : C.bad }}>
                      {fmt(BELOW, y.ac)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-200 text-muted-foreground">Dekade anklicken, um die einzelnen Jahre zu sehen.{view.epochs.length ? ' Ausgeblendete Epochen sind blass.' : ''}</p>
      )}
    </div>
  );
}
