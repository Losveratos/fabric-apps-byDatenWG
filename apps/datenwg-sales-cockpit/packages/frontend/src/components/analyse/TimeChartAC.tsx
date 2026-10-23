// IBCS integrated variance chart for the Analyse page: ΔPY% pins, ΔPY
// columns and the offset AC/PY column pair per month plus a totals band
// (ChartKitchen grammar, after the finance cockpit TimeChart).

import { useId, useState, type ReactNode } from 'react';

import { IbcsDefs, PinHead, RefAxis } from '@/components/ibcs/Ibcs';
import { fmt, fmtDelta, fmtRel, MONTH_SHORT, periodLabel, relDelta } from '@/lib/sales/format';
import type { KpiDef } from '@/lib/sales/kpis';
import { C, makeScale, relCap, scenPaint, varPaint, type Paint } from '@/lib/ibcs/notation';

import { ALL_MONTHS, fin, goodFor, type Series } from './analyse-data';

const W = 760;
const X0 = 8;
const X1 = 680;
const SLOT = (X1 - X0) / 12;
const BAND_X = X1 + 16;
const BAND_W = W - BAND_X;
const CAP = 14;
const CAT = 18;
const GAP = 14;
const HOVER = 'var(--color-hover)';

const cx = (m: number) => X0 + (m - 0.5) * SLOT;

interface Row {
  m: number;
  sel: boolean;
  a: number;
  r: number;
  d: number;
  rel: number;
  good: boolean;
}

function Bar({ x, w, ya, yb, paint }: { x: number; w: number; ya: number; yb: number; paint: Paint }) {
  const h = Math.abs(yb - ya);
  if (!fin(h) || h < 0.01) return null;
  return (
    <rect
      x={x}
      y={Math.min(ya, yb)}
      width={w}
      height={h}
      fill={paint.fill}
      stroke={paint.stroke === 'none' ? undefined : paint.stroke}
      strokeWidth={paint.strokeWidth || undefined}
    />
  );
}

function Caption({ top, children }: { top: number; children: ReactNode }) {
  return (
    <text x={X0} y={top + 10} fontSize={10.5} fill={C.sub}>
      {children}
    </text>
  );
}

function RelTier({ rows, uid, top, plotH }: { rows: Row[]; uid: string; top: number; plotH: number }) {
  const y0 = top + CAP;
  const cap = relCap(rows.map((r) => r.rel));
  const clamped = rows.map((r) => (fin(r.rel) ? Math.max(-cap, Math.min(cap, r.rel)) : NaN));
  const pos = clamped.some((v) => v > 0);
  const neg = clamped.some((v) => v < 0);
  const s = makeScale(clamped, [y0 + plotH - (neg ? 22 : 6), y0 + (pos ? 22 : 6)], 0);
  const z = s(0);
  return (
    <g>
      <Caption top={top}>ΔPY%</Caption>
      {rows.map((r, i) => {
        const v = clamped[i];
        if (!fin(v)) return null;
        const x = cx(r.m);
        const y = s(v);
        const col = r.good ? C.good : C.bad;
        const capped = Math.abs(r.rel) > cap;
        const up = r.rel >= 0;
        const off = capped ? 12 : 9;
        return (
          <g key={r.m} opacity={r.sel ? 1 : 0.35}>
            <line x1={x} x2={x} y1={z} y2={y} stroke={col} strokeWidth={2} />
            {capped ? (
              <polygon
                points={up ? `${x - 4},${y + 4} ${x + 4},${y + 4} ${x},${y - 4}` : `${x - 4},${y - 4} ${x + 4},${y - 4} ${x},${y + 4}`}
                fill={col}
              />
            ) : (
              <PinHead cx={x} cy={y} r={4.2} good={r.good} minuend="AC" uid={uid} />
            )}
            <text x={x} y={up ? y - off : y + off + 7} textAnchor="middle" fontSize={10} fill={col}>
              {fmtRel(r.rel, Math.abs(r.rel) < 0.1 ? 1 : 0)}
            </text>
          </g>
        );
      })}
      <RefAxis code="PY" orient="h" at={z} from={X0} to={X1} />
    </g>
  );
}

function DeltaTier({ rows, kpi, uid, top, plotH }: { rows: Row[]; kpi: KpiDef; uid: string; top: number; plotH: number }) {
  const y0 = top + CAP;
  const ds = rows.map((r) => r.d);
  const pos = ds.some((v) => v > 0);
  const neg = ds.some((v) => v < 0);
  const s = makeScale(ds, [y0 + plotH - (neg ? 14 : 2), y0 + (pos ? 14 : 2)], 0);
  const z = s(0);
  const w = 0.45 * SLOT;
  return (
    <g>
      <Caption top={top}>ΔPY</Caption>
      {rows.map((r) => {
        if (!fin(r.d)) return null;
        const x = cx(r.m);
        const y = s(r.d);
        return (
          <g key={r.m} opacity={r.sel ? 1 : 0.35}>
            <Bar x={x - w / 2} w={w} ya={z} yb={y} paint={varPaint('AC', r.good, uid)} />
            <text x={x} y={r.d >= 0 ? y - 3 : y + 10} textAnchor="middle" fontSize={10} fill={r.good ? C.good : C.bad}>
              {fmtDelta(kpi, r.d)}
            </text>
          </g>
        );
      })}
      <RefAxis code="PY" orient="h" at={z} from={X0} to={X1} />
    </g>
  );
}

function BaseTier({
  rows,
  kpi,
  uid,
  top,
  plotH,
  tot,
  refTot,
  bandLabel,
  allSel,
}: {
  rows: Row[];
  kpi: KpiDef;
  uid: string;
  top: number;
  plotH: number;
  tot: number;
  refTot: number;
  bandLabel: string;
  allSel: boolean;
}) {
  const y0 = top + CAP;
  const vals = rows.flatMap((r) => [r.a, r.r]);
  const neg = vals.some((v) => v < 0);
  const bottom = y0 + plotH - (neg ? 16 : 0);
  const s = makeScale(vals, [bottom, y0 + 18], 0.1);
  const z = s(0);
  const cw = 0.42 * SLOT;
  const off = 0.115 * SLOT;

  // totals band: own scale, zero aligned with the month axis
  const upPx = z - (y0 + 34);
  const downPx = bottom - z;
  const bv = [tot, refTot].filter(fin);
  const maxUp = Math.max(0, ...bv);
  const maxDn = Math.max(0, ...bv.map((v) => -v));
  const k = Math.max(upPx > 0 ? maxUp / upPx : 0, downPx > 0 ? maxDn / downPx : 0) * 1.05 || 1;
  const ys = (v: number) => z - v / k;
  const bcx = BAND_X + BAND_W / 2;
  const bw = Math.min(34, 0.55 * BAND_W);
  const bx = bcx - bw / 2;
  const d = tot - refTot;
  const good = goodFor(kpi, d);
  const labelTop = Math.min(z, fin(tot) ? ys(tot) : z, fin(refTot) ? ys(refTot) : z) - 6;

  return (
    <g>
      {rows.map((r) => {
        const x = cx(r.m);
        const ya = fin(r.a) ? s(r.a) : z;
        const yr = fin(r.r) ? s(r.r) : z;
        const labY = r.a >= 0 ? Math.min(ya, r.r >= 0 ? yr : z) - 6 : Math.max(ya, r.r < 0 ? yr : z) + 15;
        return (
          <g key={r.m} opacity={r.sel ? 1 : 0.35}>
            {fin(r.r) && <Bar x={x - off - cw / 2} w={cw} ya={z} yb={yr} paint={scenPaint('PY', uid)} />}
            {fin(r.a) && <Bar x={x + off - cw / 2} w={cw} ya={z} yb={ya} paint={scenPaint('AC', uid)} />}
            {fin(r.a) && (
              <text x={x + off} y={labY} textAnchor="middle" fontSize={11} fill={C.ac}>
                {fmt(kpi, r.a)}
              </text>
            )}
          </g>
        );
      })}
      <line x1={X0} x2={X1} y1={z} y2={z} stroke={C.ac} strokeWidth={1.5} />
      {rows.map((r) => (
        <text key={r.m} x={cx(r.m)} y={y0 + plotH + 13} textAnchor="middle" fontSize={11} fill={C.cat} fontWeight={r.sel && !allSel ? 600 : 400}>
          {MONTH_SHORT[r.m - 1]}
        </text>
      ))}
      {/* totals band */}
      {fin(tot) && <Bar x={bx} w={bw} ya={z} yb={ys(tot)} paint={scenPaint('AC', uid)} />}
      {fin(refTot) && <RefAxis code="PY" orient="h" at={ys(refTot)} from={bx - 5} to={bx + bw + 5} />}
      {fin(d) && fin(tot) && fin(refTot) && (
        <>
          <line x1={bx + bw + 6} x2={bx + bw + 6} y1={ys(refTot)} y2={ys(tot)} stroke={good ? C.good : C.bad} strokeWidth={2} />
          <PinHead cx={bx + bw + 6} cy={ys(tot)} r={3.5} good={good} minuend="AC" uid={uid} />
          <text x={bcx} y={labelTop - 13} textAnchor="middle" fontSize={10} fontWeight={700} fill={good ? C.good : C.bad}>
            {fmtDelta(kpi, d)}
          </text>
        </>
      )}
      {fin(tot) && (
        <text x={bcx} y={labelTop} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ac}>
          {fmt(kpi, tot)}
        </text>
      )}
      <line x1={BAND_X + 2} x2={W - 2} y1={z} y2={z} stroke={C.ac} strokeWidth={1.5} />
      <text x={bcx} y={y0 + plotH + 13} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={C.cat}>
        {bandLabel}
      </text>
    </g>
  );
}

/** Integrated AC vs PY variance chart of one KPI by month. */
export function TimeChartAC({ kpi, series, months, year }: { kpi: KpiDef; series: Series; months: number[]; year: number }) {
  const uid = 'ta' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [hot, setHot] = useState<number | null>(null);
  const sel = new Set(months);
  const rows: Row[] = ALL_MONTHS.map((m) => {
    const a = series.acM[m - 1];
    const r = series.pyM[m - 1];
    const d = fin(a) && fin(r) ? a - r : NaN;
    return { m, sel: sel.has(m), a, r, d, rel: relDelta(a, r), good: goodFor(kpi, d) };
  });
  const per = periodLabel(months, year).replace(` ${year}`, '');
  const bandLabel = kpi.additive ? `Σ ${per}` : per;

  const t1 = 0;
  const t2 = t1 + CAP + 78 + GAP;
  const t3 = t2 + CAP + 84 + GAP;
  const H = t3 + CAP + 150 + CAT;

  const tip = (r: Row) =>
    [`${MONTH_SHORT[r.m - 1]} ${year}`, `AC ${fmt(kpi, r.a)}`, `PY ${fmt(kpi, r.r)}`, `ΔPY ${fmtDelta(kpi, r.d)}`, `ΔPY% ${fmtRel(r.rel)}`].join('\n');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${kpi.label} je Monat ${year}, AC gegen PY`}>
      <IbcsDefs uid={uid} />
      {hot !== null && <rect x={X0 + (hot - 1) * SLOT} y={0} width={SLOT} height={H} fill={HOVER} />}
      <RelTier rows={rows} uid={uid} top={t1} plotH={78} />
      <DeltaTier rows={rows} kpi={kpi} uid={uid} top={t2} plotH={84} />
      <BaseTier
        rows={rows}
        kpi={kpi}
        uid={uid}
        top={t3}
        plotH={150}
        tot={series.ac}
        refTot={series.py}
        bandLabel={bandLabel}
        allSel={months.length === 12}
      />
      {rows.map((r) => (
        <rect
          key={`hit${r.m}`}
          x={X0 + (r.m - 1) * SLOT}
          y={0}
          width={SLOT}
          height={H}
          fill="transparent"
          onMouseEnter={() => setHot(r.m)}
          onMouseLeave={() => setHot(null)}
        >
          <title>{tip(r)}</title>
        </rect>
      ))}
    </svg>
  );
}
