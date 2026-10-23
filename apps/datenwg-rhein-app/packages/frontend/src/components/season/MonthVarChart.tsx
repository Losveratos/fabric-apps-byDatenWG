// Integrated variance chart per calendar month (ChartKitchen renderVarInt),
// three tiers on twelve month slots, top to bottom:
//   1) ΔREF%  pins in AC notation, outliers capped (relCap)
//   2) ΔREF   plain columns per month (KPIs are not additive, no bridge)
//   3) AC und REF  offset columns plus the band of the month selection
// Clicking a month slot toggles the month filter.

import type { KeyboardEvent, ReactNode } from 'react';

import { IbcsDefs, PinHead, RefAxis } from '@/components/ibcs/Ibcs';
import { C, makeScale, scenPaint, varPaint, type Paint } from '@/lib/ibcs/notation';
import { fmt, fmtDelta, fmtRel, relDelta } from '@/lib/rhein/format';
import { favourable, type KpiDef } from '@/lib/rhein/kpis';

import { cxOf, extentOf, fin, layoutOf, orNa, REF_LABEL, slotOf, type BandData, type Extent, type Geom, type VRow } from './varint';

function Bar({ x, w, ya, yb, paint, min = 0 }: { x: number; w: number; ya: number; yb: number; paint: Paint; min?: number }) {
  const h = Math.max(min, Math.abs(yb - ya));
  if (!fin(ya) || !fin(yb) || !fin(h) || h < 0.01) return null;
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

function RelTier({ g, uid, kpi, rows, band, ext, top }: TierProps) {
  const y0 = top + g.CAP;
  const n = rows.length;
  const [lo, hi] = ext.rel;
  const s = makeScale([lo, hi], [y0 + g.hRel - (lo < 0 ? 20 : 4), y0 + (hi > 0 ? 20 : 4)], 0);
  const z = s(0);
  const bandX = g.BAND_X + g.BAND_W / 2;

  const pin = (key: string, x: number, rel: number, good: boolean, op: number, bold: boolean) => {
    if (!fin(rel)) return null;
    const v = Math.max(lo, Math.min(hi, rel));
    const capped = rel > hi + 1e-9 || rel < lo - 1e-9;
    const y = s(v);
    if (!fin(y)) return null;
    const col = good ? C.good : C.bad;
    const up = rel >= 0;
    const a = 4;
    const off = capped ? 12 : 9;
    return (
      <g key={key} opacity={op}>
        <line x1={x} x2={x} y1={z} y2={y} stroke={col} strokeWidth={g.stem} />
        {capped ? (
          <polygon points={up ? `${x - a},${y + a} ${x + a},${y + a} ${x},${y - a}` : `${x - a},${y - a} ${x + a},${y - a} ${x},${y + a}`} fill={col} />
        ) : (
          <PinHead cx={x} cy={y} r={g.pinR} good={good} minuend="AC" uid={uid} />
        )}
        <text x={x} y={up ? y - off : y + off + g.fLab * 0.7} textAnchor="middle" fontSize={g.fLab} fontWeight={bold ? 700 : 400} fill={col}>
          {fmtRel(rel, Math.abs(rel) < 0.1 ? 1 : 0)}
        </text>
      </g>
    );
  };

  const relT = relDelta(band.tot, band.refTot);
  const goodT = favourable(kpi, band.tot - band.refTot) >= 0;
  return (
    <g>
      <Caption g={g} top={top}>
        Δ{REF_LABEL}%
      </Caption>
      {rows.map((r) => pin(`p${r.i}`, cxOf(g, r.i, n), r.rel, r.good, r.op, false))}
      {pin('sum', bandX, relT, goodT, 1, true)}
      <RefAxis code="PY" orient="h" at={z} from={g.X0} to={g.W - 2} />
    </g>
  );
}

function DeltaTier({ g, uid, kpi, rows, band, ext, top }: TierProps) {
  const y0 = top + g.CAP;
  const n = rows.length;
  const [lo, hi] = ext.wf;
  const s = makeScale([lo, hi], [y0 + g.hWf - (lo < 0 ? 14 : 2), y0 + (hi > 0 ? 14 : 2)], 0);
  const z = s(0);
  const w = 0.55 * slotOf(g, n);
  const sx = g.BAND_X + g.BAND_W / 2;
  const dT = band.tot - band.refTot;
  const goodT = favourable(kpi, dT) >= 0;
  return (
    <g>
      <Caption g={g} top={top}>
        Δ{REF_LABEL} je Monat (nicht additiv)
      </Caption>
      {rows.map((r) => {
        if (!fin(r.d)) return null;
        const x = cxOf(g, r.i, n);
        const y = s(r.d);
        return (
          <g key={r.i} opacity={r.op}>
            <Bar x={x - w / 2} w={w} ya={z} yb={y} paint={varPaint('AC', r.good, uid)} />
            <text x={x} y={r.d >= 0 ? y - 3 : y + 10} textAnchor="middle" fontSize={10} fill={r.good ? C.good : C.bad}>
              {fmtDelta(kpi, r.d)}
            </text>
          </g>
        );
      })}
      {fin(dT) && (
        <g>
          <Bar x={sx - w / 2} w={w} ya={z} yb={s(dT)} paint={varPaint('AC', goodT, uid)} />
          <text x={sx} y={dT >= 0 ? s(dT) - 4 : s(dT) + 12} textAnchor="middle" fontSize={g.fVal} fontWeight={700} fill={goodT ? C.good : C.bad}>
            {fmtDelta(kpi, dT)}
          </text>
        </g>
      )}
      <RefAxis code="PY" orient="h" at={z} from={g.X0} to={g.W - 2} />
    </g>
  );
}

function TotalBand({ g, uid, kpi, band, ext, z, y0, bottom }: { g: Geom; uid: string; kpi: KpiDef; band: BandData; ext: Extent; z: number; y0: number; bottom: number }) {
  const upPx = z - (y0 + 34);
  const downPx = bottom - z;
  const maxUp = Math.max(0, ext.band[1]);
  const maxDn = Math.max(0, -ext.band[0]);
  const k = Math.max(upPx > 0 ? maxUp / upPx : 0, downPx > 0 ? maxDn / downPx : 0) * 1.05 || 1;
  const ys = (v: number) => z - v / k;
  const bcx = g.BAND_X + g.BAND_W / 2;
  const cw = Math.min(34, 0.5 * g.BAND_W);
  const x = bcx - cw / 2;
  const pinX = x + cw + 9;
  const d = band.tot - band.refTot;
  const good = favourable(kpi, d) >= 0;
  const hasRef = fin(band.refTot);
  const labelTop = Math.min(z, fin(band.tot) ? ys(band.tot) : z, hasRef ? ys(band.refTot) : z) - 6;
  return (
    <g>
      {hasRef && <Bar x={x - 6} w={cw} ya={z} yb={ys(band.refTot)} paint={scenPaint('PY', uid)} />}
      {fin(band.tot) && <Bar x={x + 3} w={cw} ya={z} yb={ys(band.tot)} paint={scenPaint('AC', uid)} />}
      {fin(d) && (
        <>
          <line x1={pinX} x2={pinX} y1={ys(band.refTot)} y2={ys(band.tot)} stroke={good ? C.good : C.bad} strokeWidth={2} />
          <PinHead cx={pinX} cy={ys(band.tot)} r={3.5} good={good} minuend="AC" uid={uid} />
          <text x={bcx} y={labelTop - 13} textAnchor="middle" fontSize={10} fontWeight={700} fill={good ? C.good : C.bad}>
            {fmtDelta(kpi, d)}
          </text>
        </>
      )}
      {fin(band.tot) && (
        <text x={bcx} y={labelTop} textAnchor="middle" fontSize={g.fVal} fontWeight={700} fill={C.ac}>
          {fmt(kpi, band.tot)}
        </text>
      )}
      <line x1={g.BAND_X + 2} x2={g.W - 2} y1={z} y2={z} stroke={C.ac} strokeWidth={1.5} />
    </g>
  );
}

function BaseTier({ g, uid, kpi, rows, band, ext, top, allSel }: TierProps & { allSel: boolean }) {
  const y0 = top + g.CAP;
  const n = rows.length;
  const bottom = y0 + g.hBase;
  const s = makeScale(ext.base, [bottom, y0 + 18], 0.1);
  const z = s(0);
  const slot = slotOf(g, n);
  const cw = 0.42 * slot;
  const off = 0.115 * slot;
  const catY = y0 + g.hBase + 13;
  return (
    <g>
      <Caption g={g} top={top}>
        AC und {REF_LABEL}
      </Caption>
      {rows.map((r) => {
        const x = cxOf(g, r.i, n);
        const ya = fin(r.a) ? s(r.a) : z;
        const yr = fin(r.r) ? s(r.r) : z;
        return (
          <g key={r.i} opacity={r.op}>
            {fin(r.r) && <Bar x={x - off - cw / 2} w={cw} ya={z} yb={yr} paint={scenPaint('PY', uid)} />}
            {fin(r.a) && <Bar x={x + off - cw / 2} w={cw} ya={z} yb={ya} paint={scenPaint('AC', uid)} />}
            {fin(r.a) && (
              <text x={x + off} y={Math.min(ya, yr) - 6} textAnchor="middle" fontSize={10} fill={C.ac}>
                {fmt(kpi, r.a)}
              </text>
            )}
          </g>
        );
      })}
      <line x1={g.X0} x2={g.X1} y1={z} y2={z} stroke={C.ac} strokeWidth={1.5} />
      {rows.map((r) => (
        <text key={`l${r.i}`} x={cxOf(g, r.i, n)} y={catY} textAnchor="middle" fontSize={g.fCat} fill={C.cat} fontWeight={r.sel && !allSel ? 700 : 400}>
          {r.label}
        </text>
      ))}
      <TotalBand g={g} uid={uid} kpi={kpi} band={band} ext={ext} z={z} y0={y0} bottom={bottom} />
      <text x={g.BAND_X + g.BAND_W / 2} y={catY} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={C.cat}>
        {band.label}
      </text>
    </g>
  );
}

export function MonthVarChart({
  uid,
  kpi,
  rows,
  band,
  geom: g,
  allSel,
  onToggle,
}: {
  uid: string;
  kpi: KpiDef;
  rows: VRow[];
  band: BandData;
  geom: Geom;
  allSel: boolean;
  onToggle: (month: number) => void;
}) {
  const ext = extentOf(rows, band);
  const { t1, t2, t3, H } = layoutOf(g);
  const tier = { g, uid, kpi, rows, band, ext };
  const n = rows.length;
  const slot = slotOf(g, n);
  const key = (m: number) => (e: KeyboardEvent<SVGRectElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(m);
    }
  };
  return (
    <svg viewBox={`0 0 ${g.W} ${H}`} className="h-auto w-full" role="group" aria-label={`${kpi.label} je Monat gegen REF 1817 bis 1920`} style={{ fontVariantNumeric: 'tabular-nums' }}>
      <IbcsDefs uid={uid} />
      {rows.map((r) =>
        r.sel && !allSel ? <rect key={`hl${r.i}`} x={g.X0 + r.i * slot + 1} y={0} width={slot - 2} height={H} fill={C.hilite} opacity={0.07} /> : null
      )}
      <RelTier {...tier} top={t1} />
      <DeltaTier {...tier} top={t2} />
      <BaseTier {...tier} top={t3} allSel={allSel} />
      {rows.map((r) => (
        <rect
          key={`hit${r.i}`}
          x={g.X0 + r.i * slot}
          y={0}
          width={slot}
          height={H}
          fill="transparent"
          role="button"
          tabIndex={0}
          aria-pressed={r.sel && !allSel}
          aria-label={`${r.label}: AC ${orNa(r.a, (v) => fmt(kpi, v))}, REF ${orNa(r.r, (v) => fmt(kpi, v))}, ΔREF ${orNa(r.d, (v) => fmtDelta(kpi, v))}`}
          className="cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => onToggle(r.i + 1)}
          onKeyDown={key(r.i + 1)}
        >
          <title>{`${r.label}: AC ${orNa(r.a, (v) => fmt(kpi, v))} · REF ${orNa(r.r, (v) => fmt(kpi, v))} · ΔREF ${orNa(r.d, (v) => fmtDelta(kpi, v))} (${orNa(r.rel, (v) => fmtRel(v))})\nKlick: Monat filtern`}</title>
        </rect>
      ))}
    </svg>
  );
}
