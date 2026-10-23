// Small multiples of the time analysis: one compact card per member with the
// period value, ΔPY pill, monthly AC/PY columns and a thin ΔPY row. A shared
// scale makes the cards comparable (IBCS); clicking a card zooms in.

import { useId } from 'react';

import { IbcsDefs, VariancePill } from '@/components/ibcs/Ibcs';
import { fmt, fmtDelta, fmtRel, MONTH_SHORT, relDelta } from '@/lib/sales/format';
import type { KpiDef } from '@/lib/sales/kpis';
import { C, scenPaint, varPaint } from '@/lib/ibcs/notation';
import { cn } from '@/lib/utils';

import { fin, goodFor, type MemberSeries } from './analyse-data';

const MW = 220;
const DROW = 16; // ΔPY row
const BASE_TOP = DROW + 6;
const BASE_H = 58;
const MH = BASE_TOP + BASE_H + 12;
const SL = MW / 12;

interface Extent {
  max: number;
  min: number;
  dMax: number;
}

/** Value and Δ extents of a set of cards (shared or own scale). */
function extentOf(list: MemberSeries[]): Extent {
  const vals = list.flatMap((s) => [...s.acM, ...s.pyM]).filter(fin);
  const ds = list.flatMap((s) => s.acM.map((a, i) => Math.abs(a - s.pyM[i]))).filter(fin);
  return { max: Math.max(0, ...vals), min: Math.min(0, ...vals), dMax: Math.max(0, ...ds) };
}

/** Index of the month with the largest |AC| (−1 if none). */
function extremeIndex(vals: number[]): number {
  return vals.reduce((best, v, i) => (fin(v) && (best < 0 || Math.abs(v) > Math.abs(vals[best])) ? i : best), -1);
}

function MiniChart({ s, kpi, ext, sel }: { s: MemberSeries; kpi: KpiDef; ext: Extent; sel: Set<number> }) {
  const uid = 'sm' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const span = ext.max - ext.min || 1;
  const top = BASE_TOP + 10;
  const bottom = BASE_TOP + BASE_H;
  const y = (v: number) => bottom - ((v - ext.min) / span) * (bottom - top);
  const z = y(0);
  const dz = DROW / 2;
  const dy = (d: number) => dz - (ext.dMax ? (d / ext.dMax) * (DROW / 2 - 1) : 0);
  const cw = 0.42 * SL;
  const off = 0.11 * SL;
  // label the month with the largest AC
  const best = extremeIndex(s.acM);
  const ac = scenPaint('AC', uid);
  const py = scenPaint('PY', uid);
  return (
    <svg viewBox={`0 0 ${MW} ${MH}`} className="block h-auto w-full" aria-hidden="true">
      <IbcsDefs uid={uid} />
      {s.acM.map((a, i) => {
        const r = s.pyM[i];
        const d = fin(a) && fin(r) ? a - r : NaN;
        const x = (i + 0.5) * SL;
        const good = goodFor(kpi, d);
        const op = sel.has(i + 1) ? 1 : 0.35;
        return (
          <g key={i} opacity={op}>
            {fin(d) && d !== 0 && (
              <rect x={x - cw / 2} y={Math.min(dz, dy(d))} width={cw} height={Math.max(0.5, Math.abs(dy(d) - dz))} fill={varPaint('AC', good, uid).fill} />
            )}
            {fin(r) && r !== 0 && <rect x={x - off - cw / 2} y={Math.min(z, y(r))} width={cw} height={Math.abs(y(r) - z)} fill={py.fill} />}
            {fin(a) && a !== 0 && <rect x={x + off - cw / 2} y={Math.min(z, y(a))} width={cw} height={Math.abs(y(a) - z)} fill={ac.fill} />}
            {i === best && fin(a) && (
              <text x={x + off} y={a >= 0 ? Math.min(y(a), fin(r) && r > 0 ? y(r) : z) - 3 : y(a) + 9} textAnchor="middle" fontSize={8} fill={C.ac}>
                {fmt(kpi, a)}
              </text>
            )}
          </g>
        );
      })}
      <line x1={0} x2={MW} y1={dz} y2={dz} stroke={C.py} strokeWidth={1.5} />
      <line x1={0} x2={MW} y1={z} y2={z} stroke={C.ac} strokeWidth={1} />
      {[0, 11].map((i) => (
        <text key={i} x={(i + 0.5) * SL} y={MH - 1} textAnchor="middle" fontSize={8} fill={C.sub}>
          {MONTH_SHORT[i]}
        </text>
      ))}
    </svg>
  );
}

export function SmallMultiples({
  list,
  kpi,
  months,
  shared,
  onPick,
}: {
  list: MemberSeries[];
  kpi: KpiDef;
  months: number[];
  shared: boolean;
  onPick: (member: string) => void;
}) {
  if (list.length === 0) return <p className="py-600 text-center text-300 text-muted-foreground">Keine Mitglieder für diese Auswahl.</p>;
  const sharedExt = extentOf(list);
  const sel = new Set(months);
  return (
    <div>
      <p className="pb-200 text-100 text-muted-foreground">
        {shared ? 'Gemeinsame Skala für alle Kacheln, Werte direkt vergleichbar.' : 'Eigene Skala je Kachel, Höhen nicht vergleichbar.'} Klick auf eine Kachel zoomt hinein.
      </p>
      <div className="grid grid-cols-2 gap-300 md:grid-cols-3 xl:grid-cols-4">
        {list.map((s) => {
          const d = s.ac - s.py;
          const rel = relDelta(s.ac, s.py);
          const good = goodFor(kpi, d);
          return (
            <button
              key={s.member}
              type="button"
              aria-pressed={s.selected}
              title={`${s.member}\nAC ${fmt(kpi, s.ac)} · PY ${fmt(kpi, s.py)} · ΔPY ${fmtDelta(kpi, d)}\nKlick: hineinzoomen (filtert auf ${s.member})`}
              onClick={() => onPick(s.member)}
              className={cn(
                'flex min-w-0 flex-col gap-100 rounded-lg border bg-card p-200 text-left transition-colors hover:border-input hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                s.selected && 'border-primary ring-1 ring-primary'
              )}
            >
              <span className="flex min-w-0 items-center justify-between gap-200">
                <span className="truncate text-200 font-semibold">{s.member}</span>
                {!shared && <span className="shrink-0 text-100 text-muted-foreground">eigene Skala</span>}
              </span>
              <span className="flex flex-wrap items-center gap-200">
                <span className="tabular text-300 font-semibold">{fmt(kpi, s.ac)}</span>
                {fin(rel) ? (
                  <VariancePill value={rel} good={good}>
                    {fmtRel(rel)}
                  </VariancePill>
                ) : (
                  <span className="tabular text-100 text-muted-foreground">ΔPY {fmtDelta(kpi, d)}</span>
                )}
              </span>
              <MiniChart s={s} kpi={kpi} ext={shared ? sharedExt : extentOf([s])} sel={sel} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
