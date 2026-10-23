// Small multiples of the season page (ported from the team MemberMultiples):
// one card per epoch or decade with the value of the month selection, a Δ%
// pill against REF 1817 bis 1920 and a mini monthly profile (AC columns vs
// grey REF columns, Δ per month above). Shared scale = comparable heights.

import { useId } from 'react';

import { IbcsDefs, VariancePill } from '@/components/ibcs/Ibcs';
import { C, scenPaint, varPaint } from '@/lib/ibcs/notation';
import { fmt, fmtDelta, fmtRel, relDelta } from '@/lib/rhein/format';
import type { KpiDef } from '@/lib/rhein/kpis';
import { MONTHS } from '@/lib/rhein/model';
import { cn } from '@/lib/utils';

import { fin, goodFor, orNa } from './varint';

const MW = 220;
const DROW = 16;
const BASE_TOP = DROW + 6;
const BASE_H = 58;
const MH = BASE_TOP + BASE_H + 12;

export interface MultCard {
  key: string;
  label: string;
  /** Value of the month selection and its reference. */
  ac: number;
  ref: number;
  /** Twelve monthly AC values and the twelve REF values. */
  acM: number[];
  refM: number[];
  selected: boolean;
}

interface Extent {
  max: number;
  min: number;
  dMax: number;
}

function multExtent(list: MultCard[]): Extent {
  const vals = list.flatMap((s) => [...s.acM, ...s.refM]).filter(fin);
  const ds = list.flatMap((s) => s.acM.map((a, i) => Math.abs(a - s.refM[i]))).filter(fin);
  return { max: Math.max(0, ...vals), min: Math.min(0, ...vals), dMax: Math.max(0, ...ds) };
}

function MiniChart({ s, kpi, ext, months }: { s: MultCard; kpi: KpiDef; ext: Extent; months: Set<number> }) {
  const uid = 'sm' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const SL = MW / 12;
  const spanV = ext.max - ext.min || 1;
  const top = BASE_TOP + 4;
  const bottom = BASE_TOP + BASE_H;
  const y = (v: number) => bottom - ((v - ext.min) / spanV) * (bottom - top);
  const z = y(0);
  const dz = DROW / 2;
  const dy = (d: number) => dz - (ext.dMax ? (d / ext.dMax) * (DROW / 2 - 1) : 0);
  const cw = 0.42 * SL;
  const off = 0.11 * SL;
  const ac = scenPaint('AC', uid);
  const rp = scenPaint('PY', uid);
  return (
    <svg viewBox={`0 0 ${MW} ${MH}`} className="block h-auto w-full" aria-hidden="true">
      <IbcsDefs uid={uid} />
      {s.acM.map((a, i) => {
        const r = s.refM[i];
        const d = fin(a) && fin(r) ? a - r : NaN;
        const x = (i + 0.5) * SL;
        const good = goodFor(kpi, d);
        const on = !months.size || months.has(i + 1);
        return (
          <g key={i} opacity={on ? 1 : 0.35}>
            {fin(d) && d !== 0 && fin(dy(d)) && (
              <rect x={x - cw / 2} y={Math.min(dz, dy(d))} width={cw} height={Math.max(0.5, Math.abs(dy(d) - dz))} fill={varPaint('AC', good, uid).fill} />
            )}
            {fin(r) && r !== 0 && <rect x={x - off - cw / 2} y={Math.min(z, y(r))} width={cw} height={Math.abs(y(r) - z)} fill={rp.fill} />}
            {fin(a) && a !== 0 && <rect x={x + off - cw / 2} y={Math.min(z, y(a))} width={cw} height={Math.abs(y(a) - z)} fill={ac.fill} />}
          </g>
        );
      })}
      <line x1={0} x2={MW} y1={dz} y2={dz} stroke={C.py} strokeWidth={1.5} />
      <line x1={0} x2={MW} y1={z} y2={z} stroke={C.ac} strokeWidth={1} />
      <text x={0.5 * SL} y={MH - 1} textAnchor="start" fontSize={8} fill={C.sub}>
        {MONTHS[0]}
      </text>
      <text x={11.5 * SL} y={MH - 1} textAnchor="end" fontSize={8} fill={C.sub}>
        {MONTHS[11]}
      </text>
    </svg>
  );
}

export function MonthMultiples({
  list,
  kpi,
  shared,
  months,
  pickHint,
  onPick,
}: {
  list: MultCard[];
  kpi: KpiDef;
  shared: boolean;
  months: number[];
  /** Hint what a click does ("filtert die Epoche"). */
  pickHint: string;
  onPick: (key: string) => void;
}) {
  if (list.length === 0) return <p className="py-600 text-center text-300 text-muted-foreground">Keine Werte für diese Auswahl.</p>;
  const sharedExt = multExtent(list);
  const monthSet = new Set(months);
  return (
    <div>
      <p className="pb-200 text-100 text-muted-foreground">
        Monatsprofil je Kachel: AC voll, REF 1817 bis 1920 grau, darüber ΔREF je Monat.{' '}
        {shared ? 'Gemeinsame Skala, Höhen vergleichbar.' : 'Eigene Skala je Kachel, Höhen nicht vergleichbar.'} Klick {pickHint}.
      </p>
      <div className={cn('grid gap-300', list.length > 6 ? 'grid-cols-2 md:grid-cols-4 xl:grid-cols-6' : 'grid-cols-1 md:grid-cols-3')}>
        {list.map((s) => {
          const d = s.ac - s.ref;
          const rel = relDelta(s.ac, s.ref);
          const good = goodFor(kpi, d);
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={s.selected}
              title={`${s.label}\nAC ${orNa(s.ac, (v) => fmt(kpi, v))} · REF ${orNa(s.ref, (v) => fmt(kpi, v))} · ΔREF ${orNa(d, (v) => fmtDelta(kpi, v))}`}
              onClick={() => onPick(s.key)}
              className={cn(
                'flex min-w-0 flex-col gap-100 rounded-lg border bg-card p-200 text-left transition-colors hover:border-input hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                s.selected && 'border-primary ring-1 ring-primary'
              )}
            >
              <span className="flex min-w-0 items-center justify-between gap-200">
                <span className="truncate text-200 font-semibold">{s.label}</span>
                {!shared && <span className="shrink-0 text-100 text-muted-foreground">eigene Skala</span>}
              </span>
              <span className="flex flex-wrap items-center gap-200">
                <span className="tabular text-300 font-semibold">{orNa(s.ac, (v) => fmt(kpi, v))}</span>
                {fin(rel) ? (
                  <VariancePill value={rel} good={good}>
                    {fmtRel(rel)}
                  </VariancePill>
                ) : (
                  <span className="tabular text-100 text-muted-foreground">ΔREF {orNa(d, (v) => fmtDelta(kpi, v))}</span>
                )}
              </span>
              <MiniChart s={s} kpi={kpi} ext={shared ? sharedExt : multExtent([s])} months={monthSet} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
