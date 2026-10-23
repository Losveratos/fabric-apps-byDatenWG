// Integrated variance chart (ChartKitchen renderVarInt), pure: rows in, SVG
// out. Three tiers on shared bucket slots, top to bottom:
//   1) ΔREF%  pins in AC notation, outliers capped (relCap)
//   2) ΔREF   plain Δ columns per bucket (KPIs are not additive: no bridge)
//   3) AC und REF  AC columns against the grey reference, band on the right
//      with the value of the whole selection.

import type { KeyboardEvent, ReactNode } from 'react';

import { IbcsDefs, PinHead, RefAxis } from '@/components/ibcs/Ibcs';
import { C, makeScale, scenPaint, varPaint, type Paint } from '@/lib/ibcs/notation';
import { fmt, fmtDelta, fmtRel, relDelta } from '@/lib/rhein/format';
import { favourable, type KpiDef } from '@/lib/rhein/kpis';

import { cxOf, extentOf, fin, layoutOf, slotOf, type BandData, type Extent, type Geom, type VRow } from './varint';

function Bar({ x, w, ya, yb, paint, min = 0 }: { x: number; w: number; ya: number; yb: number; paint: Paint; min?: number }) {
  if (!fin(ya) || !fin(yb) || !fin(x) || !fin(w)) return null;
  const h = Math.max(min, Math.abs(yb - ya));
  if (h < 0.01) return null;
  return (
    <rect
      x={x}
      y={Math.min(ya, yb)}
      width={Math.max(0.4, w)}
      height={h}
      fill={paint.fill}
      stroke={paint.stroke === 'none' ? undefined : paint.stroke}
      strokeWidth={paint.strokeWidth || undefined}
    />
  );
}

function Caption({ g, top, children }: { g: Geom; top: number; children: ReactNode }) {
  return (
    <text x={g.X0} y={top + g.CAP - 4} fontSize={g.fCap} fill={C.sub}>
      {children}
    </text>
  );
}

interface TierProps {
  g: Geom;
  uid: string;
  kpi: KpiDef;
  rows: VRow[];
  band: BandData;
  ext: Extent;
  top: number;
}

const pinRadius = (g: Geom, slot: number) => Math.max(1.1, Math.min(g.pinR, slot * 0.36));
const stemWidth = (g: Geom, slot: number) => Math.max(0.6, Math.min(g.stem, slot * 0.45));

// ---------- tier 1: ΔREF% ----------

function RelTier({ g, uid, kpi, rows, band, ext, top }: TierProps) {
  const y0 = top + g.CAP;
  const n = rows.length;
  const slot = slotOf(g, n);
  const [lo, hi] = ext.rel;
  const pad = g.compact ? 9 : 20;
  const s = makeScale([lo, hi], [y0 + g.hRel - (lo < 0 ? pad : 4), y0 + (hi > 0 ? pad : 4)], 0);
  const z = s(0);
  const bandX = g.BAND_X + g.BAND_W / 2;
  const labels = !g.compact && slot >= 26;

  const pin = (key: string, x: number, rel: number, good: boolean, op: number, label: boolean, bold: boolean, r: number, sw: number) => {
    if (!fin(rel)) return null;
    const v = Math.max(lo, Math.min(hi, rel));
    const capped = rel > hi + 1e-9 || rel < lo - 1e-9;
    const y = s(v);
    const col = good ? C.good : C.bad;
    const up = rel >= 0;
    const a = Math.max(r, 1.6);
    const off = capped ? 11 : 8;
    return (
      <g key={key} opacity={op}>
        <line x1={x} x2={x} y1={z} y2={y} stroke={col} strokeWidth={sw} />
        {capped ? (
          <polygon points={up ? `${x - a},${y + a} ${x + a},${y + a} ${x},${y - a}` : `${x - a},${y - a} ${x + a},${y - a} ${x},${y + a}`} fill={col} />
        ) : (
          <PinHead cx={x} cy={y} r={r} good={good} minuend="AC" uid={uid} />
        )}
        {label && (
          <text x={x} y={up ? y - off : y + off + g.fLab * 0.7} textAnchor="middle" fontSize={g.fLab} fontWeight={bold ? 700 : 400} fill={col}>
            {fmtRel(rel, 0)}
          </text>
        )}
      </g>
    );
  };

  const relT = relDelta(band.tot, band.refTot);
  const goodT = favourable(kpi, band.tot - band.refTot) >= 0;
  const r = pinRadius(g, slot);
  const sw = stemWidth(g, slot);
  return (
    <g>
      <Caption g={g} top={top}>
        ΔREF%
      </Caption>
      {rows.map((row) => pin(`p${row.i}`, cxOf(g, row.i, n), row.rel, row.good, row.op, labels, false, r, sw))}
      {pin('sum', bandX, relT, goodT, 1, !g.compact, true, g.pinR, g.stem)}
      <RefAxis code="PY" orient="h" at={z} from={g.X0} to={g.W - 2} />
    </g>
  );
}

// ---------- tier 2: ΔREF columns ----------

function DeltaTier({ g, uid, kpi, rows, band, ext, top }: TierProps) {
  const y0 = top + g.CAP;
  const n = rows.length;
  const [lo, hi] = ext.wf;
  const pad = g.compact ? 8 : 14;
  const s = makeScale([lo, hi], [y0 + g.hWf - (lo < 0 ? pad : 2), y0 + (hi > 0 ? pad : 2)], 0);
  const z = s(0);
  const slot = slotOf(g, n);
  const w = Math.max(0.6, 0.62 * slot);
  const sx = g.BAND_X + g.BAND_W / 2;
  const bw = g.compact ? 14 : 26;
  const dT = band.tot - band.refTot;
  const goodT = favourable(kpi, dT) >= 0;
  return (
    <g>
      <Caption g={g} top={top}>
        ΔREF{g.compact ? '' : ' (nicht additiv, Δ je Zeitraum einzeln)'}
      </Caption>
      {rows.map((r) => {
        if (!fin(r.d)) return null;
        const x = cxOf(g, r.i, n);
        return (
          <g key={r.i} opacity={r.op}>
            <Bar x={x - w / 2} w={w} ya={z} yb={s(r.d)} paint={varPaint('AC', r.good, uid)} />
          </g>
        );
      })}
      {fin(dT) && (
        <g>
          <Bar x={sx - bw / 2} w={bw} ya={z} yb={s(dT)} min={0.6} paint={varPaint('AC', goodT, uid)} />
          <text x={sx} y={dT >= 0 ? s(dT) - 4 : s(dT) + (g.compact ? 9 : 12)} textAnchor="middle" fontSize={g.fVal} fontWeight={700} fill={goodT ? C.good : C.bad}>
            {fmtDelta(kpi, dT)}
          </text>
        </g>
      )}
      <RefAxis code="PY" orient="h" at={z} from={g.X0} to={g.W - 2} />
    </g>
  );
}

// ---------- tier 3: AC and REF ----------

function BaseTier({ g, uid, kpi, rows, band, ext, top }: TierProps) {
  const y0 = top + g.CAP;
  const n = rows.length;
  const bottom = y0 + g.hBase;
  const s = makeScale(mergeSpan(ext.base, ext.band), [bottom, y0 + (g.compact ? 10 : 22)], 0.06);
  const z = s(0);
  const slot = slotOf(g, n);
  const offset = slot >= 10;
  const cw = offset ? 0.42 * slot : Math.max(0.6, 0.7 * slot);
  const off = offset ? 0.115 * slot : 0;
  const catY = bottom + (g.compact ? 9 : 13);
  // REF is the same for every bucket: columns when there is room, else a grey level line.
  const refLevel = rows.find((r) => fin(r.r))?.r ?? NaN;

  const bcx = g.BAND_X + g.BAND_W / 2;
  const bcw = g.compact ? 14 : 26;
  const d = band.tot - band.refTot;
  const good = favourable(kpi, d) >= 0;
  const yTop = Math.min(fin(band.tot) ? s(band.tot) : z, fin(band.refTot) ? s(band.refTot) : z);
  return (
    <g>
      <Caption g={g} top={top}>
        AC und REF
      </Caption>
      {!offset && fin(refLevel) && <line x1={g.X0} x2={g.X1} y1={s(refLevel)} y2={s(refLevel)} stroke={C.py} strokeWidth={g.compact ? 2 : 3} />}
      {rows.map((r) => {
        const x = cxOf(g, r.i, n);
        return (
          <g key={r.i} opacity={r.op}>
            {offset && fin(r.r) && <Bar x={x - off - cw / 2} w={cw} ya={z} yb={s(r.r)} paint={scenPaint('PY', uid)} />}
            {fin(r.a) && <Bar x={x + off - cw / 2} w={cw} ya={z} yb={s(r.a)} paint={scenPaint('AC', uid)} />}
          </g>
        );
      })}
      <line x1={g.X0} x2={g.X1} y1={z} y2={z} stroke={C.ac} strokeWidth={g.compact ? 1 : 1.5} />
      {rows.map((r) =>
        r.tick ? (
          <text key={`t${r.i}`} x={cxOf(g, r.i, n)} y={catY} textAnchor="middle" fontSize={g.fCat} fill={C.cat}>
            {r.tick}
          </text>
        ) : null
      )}
      {/* selection band */}
      {fin(band.refTot) && <Bar x={bcx - bcw / 2 - (g.compact ? 3 : 5)} w={bcw} ya={z} yb={s(band.refTot)} paint={scenPaint('PY', uid)} />}
      {fin(band.tot) && <Bar x={bcx - bcw / 2 + (g.compact ? 2 : 3)} w={bcw} ya={z} yb={s(band.tot)} paint={scenPaint('AC', uid)} />}
      {fin(band.tot) && (
        <text x={bcx} y={yTop - (g.compact ? 3 : 5)} textAnchor="middle" fontSize={g.fVal} fontWeight={700} fill={C.ac}>
          {fmt(kpi, band.tot)}
        </text>
      )}
      {fin(d) && !g.compact && (
        <text x={bcx} y={yTop - 18} textAnchor="middle" fontSize={10} fontWeight={700} fill={good ? C.good : C.bad}>
          {fmtDelta(kpi, d)}
        </text>
      )}
      <line x1={g.BAND_X + 2} x2={g.W - 2} y1={z} y2={z} stroke={C.ac} strokeWidth={g.compact ? 1 : 1.5} />
      <text x={bcx} y={catY} textAnchor="middle" fontSize={g.compact ? g.fCat : 10.5} fontWeight={600} fill={C.cat}>
        {band.label}
      </text>
    </g>
  );
}

const mergeSpan = (a: [number, number], b: [number, number]): number[] => [a[0], a[1], b[0], b[1]];

export interface VarIntChartProps {
  uid: string;
  kpi: KpiDef;
  rows: VRow[];
  band: BandData;
  geom: Geom;
  extent?: Extent;
  underlay?: ReactNode;
  overlay?: ReactNode;
  ariaLabel?: string;
  onKeyDown?: (e: KeyboardEvent<SVGSVGElement>) => void;
}

export function VarIntChart({ uid, kpi, rows, band, geom: g, extent, underlay, overlay, ariaLabel, onKeyDown }: VarIntChartProps) {
  const ext = extent ?? extentOf(rows, band);
  const { t1, t2, t3, H } = layoutOf(g);
  const tier = { g, uid, kpi, rows, band, ext };
  return (
    <svg
      viewBox={`0 0 ${g.W} ${H}`}
      className="h-auto w-full"
      role={ariaLabel ? 'group' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      onKeyDown={onKeyDown}
    >
      <IbcsDefs uid={uid} />
      {underlay}
      <RelTier {...tier} top={t1} />
      <DeltaTier {...tier} top={t2} />
      <BaseTier {...tier} top={t3} />
      {overlay}
    </svg>
  );
}
