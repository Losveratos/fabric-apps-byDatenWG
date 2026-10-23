// Integrated variance chart (ChartKitchen renderVarInt), pure: series in,
// SVG out. Three tiers on shared month slots, top to bottom:
//   1) ΔPY%  pins with heads in AC notation, outliers capped (relCap)
//   2) ΔPY   Δ bridge: monthly variances run up to Σ (renderTimeWf);
//            plain ΔPY columns for non-additive KPIs
//   3) AC und PY  offset columns plus the total band on the right
// Used by the overview time chart (big) and its small multiples (compact).

import type { KeyboardEvent, ReactNode } from 'react';

import { IbcsDefs, PinHead, RefAxis } from '@/components/ibcs/Ibcs';
import { C, makeScale, scenPaint, varPaint, type Paint } from '@/lib/ibcs/notation';
import { fmt, fmtDelta, fmtRel, MONTH_SHORT, relDelta } from '@/lib/sales/format';
import { favourable, type KpiDef } from '@/lib/sales/kpis';

import { bridgeOf, cxOf, extentOf, fin, layoutOf, slotOf, type BandData, type Extent, type Geom, type VRow } from './varint';

// ---------- small marks ----------

function Bar({ x, w, ya, yb, paint, min = 0, dataD }: { x: number; w: number; ya: number; yb: number; paint: Paint; min?: number; dataD?: number }) {
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
      data-bridge-d={dataD === undefined ? undefined : String(dataD)}
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

export function CatLabels({ g, rows, y, allSel }: { g: Geom; rows: VRow[]; y: number; allSel: boolean }) {
  return (
    <g>
      {rows.map((r) => (
        <text key={r.m} x={cxOf(g, r.m)} y={y} textAnchor="middle" fontSize={g.fCat} fill={C.cat} fontWeight={r.sel && !allSel ? 600 : 400}>
          {g.compact ? MONTH_SHORT[r.m - 1].charAt(0) : MONTH_SHORT[r.m - 1]}
        </text>
      ))}
    </g>
  );
}

/** Dashed separator after the last closed month ("noch offen"). */
export function Divider({ g, lastClosed, height, labelY }: { g: Geom; lastClosed: number; height: number; labelY: number }) {
  if (lastClosed < 1 || lastClosed > 11) return null;
  const x = g.X0 + lastClosed * slotOf(g);
  return (
    <g>
      <line x1={x} x2={x} y1={2} y2={height - 2} stroke={C.hair} strokeWidth={1} strokeDasharray="3,3" />
      {!g.compact && (
        <text x={x + 4} y={labelY} fontSize={10} fill={C.sub}>
          {MONTH_SHORT[lastClosed]}.. noch offen
        </text>
      )}
    </g>
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

// ---------- tier 1: ΔPY% ----------

function RelTier({ g, uid, kpi, rows, band, ext, top }: TierProps) {
  const y0 = top + g.CAP;
  const [lo, hi] = ext.rel;
  const pad = g.compact ? 9 : 22;
  const s = makeScale([lo, hi], [y0 + g.hRel - (lo < 0 ? pad : 4), y0 + (hi > 0 ? pad : 4)], 0);
  const z = s(0);
  const bandX = g.BAND_X + g.BAND_W / 2;

  const pin = (key: string, x: number, rel: number, good: boolean, op: number, label: boolean, bold: boolean) => {
    if (!fin(rel)) return null;
    const v = Math.max(lo, Math.min(hi, rel));
    const capped = rel > hi + 1e-9 || rel < lo - 1e-9;
    const y = s(v);
    const col = good ? C.good : C.bad;
    const up = rel >= 0;
    const a = g.compact ? 3 : 4;
    const off = (capped ? 12 : 9) * (g.compact ? 0.6 : 1);
    return (
      <g key={key} opacity={op}>
        <line x1={x} x2={x} y1={z} y2={y} stroke={col} strokeWidth={g.stem} />
        {capped ? (
          <polygon
            points={up ? `${x - a},${y + a} ${x + a},${y + a} ${x},${y - a}` : `${x - a},${y - a} ${x + a},${y - a} ${x},${y + a}`}
            fill={col}
          />
        ) : (
          <PinHead cx={x} cy={y} r={g.pinR} good={good} minuend="AC" uid={uid} />
        )}
        {label && (
          <text x={x} y={up ? y - off : y + off + g.fLab * 0.7} textAnchor="middle" fontSize={g.fLab} fontWeight={bold ? 700 : 400} fill={col}>
            {fmtRel(rel, Math.abs(rel) < 0.1 ? 1 : 0)}
          </text>
        )}
      </g>
    );
  };

  const relT = relDelta(band.tot, band.refTot);
  const goodT = favourable(kpi, band.tot - band.refTot) >= 0;
  return (
    <g>
      <Caption g={g} top={top}>
        ΔPY%
      </Caption>
      {rows.map((r) => pin(`p${r.m}`, cxOf(g, r.m), r.rel, r.good, r.op, !g.compact, false))}
      {pin('sum', bandX, relT, goodT, 1, true, true)}
      <RefAxis code="PY" orient="h" at={z} from={g.X0} to={g.W - 2} />
    </g>
  );
}

// ---------- tier 2: ΔPY bridge (additive) or plain ΔPY columns ----------

function BridgeTier({ g, uid, kpi, rows, ext, top }: TierProps) {
  const y0 = top + g.CAP;
  const [lo, hi] = ext.wf;
  const pad = g.compact ? 9 : 14;
  const s = makeScale([lo, hi], [y0 + g.hWf - (lo < 0 ? pad : 2), y0 + (hi > 0 ? pad : 2)], 0.12);
  const z = s(0);
  const slot = slotOf(g);
  const bw = 0.55 * slot;
  const showLab = !g.compact && slot >= 34;
  const br = bridgeOf(kpi, rows);
  const sx = g.BAND_X + g.BAND_W / 2;
  const last = br.segs[br.segs.length - 1];
  const sTop = Math.min(s(0), s(br.total));
  const sH = Math.max(0.6, Math.abs(s(0) - s(br.total)));

  return (
    <g>
      <Caption g={g} top={top}>
        ΔPY
      </Caption>
      {/* connectors at the running level, behind the bars */}
      {br.segs.map((seg, i) => {
        if (i === 0) return null;
        const prev = br.segs[i - 1];
        const y = s(seg.from);
        return <line key={`c${seg.m}`} x1={cxOf(g, prev.m) + bw / 2} x2={cxOf(g, seg.m) - bw / 2} y1={y} y2={y} stroke={C.conn} strokeWidth={0.9} />;
      })}
      {last && <line x1={cxOf(g, last.m) + bw / 2} x2={sx - bw / 2} y1={s(br.total)} y2={s(br.total)} stroke={C.conn} strokeWidth={0.9} />}
      {br.segs.map((seg) => {
        const x = cxOf(g, seg.m);
        const yA = s(seg.from);
        const yB = s(seg.to);
        const yTop = Math.min(yA, yB);
        const h = Math.max(0.6, Math.abs(yA - yB));
        return (
          <g key={`b${seg.m}`} opacity={seg.op}>
            <Bar x={x - bw / 2} w={bw} ya={yA} yb={yB} min={0.6} paint={varPaint('AC', seg.good, uid)} dataD={seg.d} />
            {showLab && (
              <text x={x} y={seg.d >= 0 ? yTop - 4 : yTop + h + 11} textAnchor="middle" fontSize={10} fill={seg.good ? C.good : C.bad}>
                {fmtDelta(kpi, seg.d)}
              </text>
            )}
          </g>
        );
      })}
      {/* Σ column: total period variance */}
      <rect x={sx - bw / 2} y={sTop} width={bw} height={sH} fill={C.ac} data-bridge-total={String(br.total)} />
      <text x={sx} y={br.total >= 0 ? sTop - 5 : sTop + sH + (g.compact ? 9 : 12)} textAnchor="middle" fontSize={g.fVal} fontWeight={700} fill={C.ac}>
        {fmtDelta(kpi, br.total)}
      </text>
      <RefAxis code="PY" orient="h" at={z} from={g.X0} to={g.W - 2} />
    </g>
  );
}

function DeltaTier({ g, uid, kpi, rows, band, ext, top }: TierProps) {
  const y0 = top + g.CAP;
  const [lo, hi] = ext.wf;
  const pad = g.compact ? 9 : 14;
  const s = makeScale([lo, hi], [y0 + g.hWf - (lo < 0 ? pad : 2), y0 + (hi > 0 ? pad : 2)], 0);
  const z = s(0);
  const w = 0.55 * slotOf(g);
  const sx = g.BAND_X + g.BAND_W / 2;
  const dT = band.tot - band.refTot;
  const goodT = favourable(kpi, dT) >= 0;
  return (
    <g>
      <Caption g={g} top={top}>
        ΔPY (nicht additiv)
      </Caption>
      {rows.map((r) => {
        if (!fin(r.d)) return null;
        const x = cxOf(g, r.m);
        const y = s(r.d);
        return (
          <g key={r.m} opacity={r.op}>
            <Bar x={x - w / 2} w={w} ya={z} yb={y} paint={varPaint('AC', r.good, uid)} />
            {!g.compact && (
              <text x={x} y={r.d >= 0 ? y - 3 : y + 10} textAnchor="middle" fontSize={10} fill={r.good ? C.good : C.bad}>
                {fmtDelta(kpi, r.d)}
              </text>
            )}
          </g>
        );
      })}
      {fin(dT) && (
        <g>
          <Bar x={sx - w / 2} w={w} ya={z} yb={s(dT)} paint={varPaint('AC', goodT, uid)} />
          <text x={sx} y={dT >= 0 ? s(dT) - 4 : s(dT) + (g.compact ? 9 : 12)} textAnchor="middle" fontSize={g.fVal} fontWeight={700} fill={goodT ? C.good : C.bad}>
            {fmtDelta(kpi, dT)}
          </text>
        </g>
      )}
      <RefAxis code="PY" orient="h" at={z} from={g.X0} to={g.W - 2} />
    </g>
  );
}

// ---------- tier 3: AC und PY with total band ----------

/** Total band right of the base tier, zero aligned with the month axis. */
function TotalBand({ g, uid, kpi, band, ext, z, y0, bottom }: { g: Geom; uid: string; kpi: KpiDef; band: BandData; ext: Extent; z: number; y0: number; bottom: number }) {
  const upPx = z - (y0 + (g.compact ? 12 : 34));
  const downPx = bottom - z;
  const maxUp = Math.max(0, ext.band[1]);
  const maxDn = Math.max(0, -ext.band[0]);
  const k = Math.max(upPx > 0 ? maxUp / upPx : 0, downPx > 0 ? maxDn / downPx : 0) * 1.05 || 1;
  const ys = (v: number) => z - v / k;
  const bcx = g.BAND_X + g.BAND_W / 2;
  const cw = g.compact ? 16 : Math.min(34, 0.55 * g.BAND_W);
  const x = bcx - cw / 2;
  const back = g.compact ? 4 : 6;
  const front = g.compact ? 2 : 3;
  const pinX = x + cw + (g.compact ? 5 : 9);
  const d = band.tot - band.refTot;
  const good = favourable(kpi, d) >= 0;
  const hasRef = fin(band.refTot);
  const negTot = fin(band.tot) && band.tot < 0;
  const labelTop = Math.min(z, fin(band.tot) ? ys(band.tot) : z, hasRef ? ys(band.refTot) : z) - (g.compact ? 4 : 6);
  const labelBottom = Math.max(z, fin(band.tot) ? ys(band.tot) : z, hasRef ? ys(band.refTot) : z) + (g.compact ? 9 : 14);
  return (
    <g>
      {hasRef && <Bar x={x - back} w={cw} ya={z} yb={ys(band.refTot)} paint={scenPaint('PY', uid)} />}
      {fin(band.tot) && <Bar x={x + front} w={cw} ya={z} yb={ys(band.tot)} paint={scenPaint('AC', uid)} />}
      {fin(d) && (
        <>
          <line x1={pinX} x2={pinX} y1={ys(band.refTot)} y2={ys(band.tot)} stroke={good ? C.good : C.bad} strokeWidth={g.compact ? 1.4 : 2} />
          <PinHead cx={pinX} cy={ys(band.tot)} r={g.compact ? 2.2 : 3.5} good={good} minuend="AC" uid={uid} />
          {!g.compact && (
            <text x={bcx} y={negTot ? labelBottom + 13 : labelTop - 13} textAnchor="middle" fontSize={10} fontWeight={700} fill={good ? C.good : C.bad}>
              {fmtDelta(kpi, d)}
            </text>
          )}
        </>
      )}
      {fin(band.tot) && (
        <text x={bcx} y={negTot ? labelBottom : labelTop} textAnchor="middle" fontSize={g.fVal} fontWeight={700} fill={C.ac}>
          {fmt(kpi, band.tot)}
        </text>
      )}
      <line x1={g.BAND_X + 2} x2={g.W - 2} y1={z} y2={z} stroke={C.ac} strokeWidth={g.compact ? 1 : 1.5} />
    </g>
  );
}

function BaseTier({ g, uid, kpi, rows, band, ext, top, allSel }: TierProps & { allSel: boolean }) {
  const y0 = top + g.CAP;
  const plotH = g.hBase;
  const neg = ext.base[0] < 0 || ext.band[0] < 0;
  const bottom = y0 + plotH - (neg ? (g.compact ? 9 : 16) : 0);
  const s = makeScale(ext.base, [bottom, y0 + (g.compact ? 4 : 18)], 0.1);
  const z = s(0);
  const slot = slotOf(g);
  const cw = 0.42 * slot;
  const off = 0.115 * slot;
  const catY = y0 + plotH + (g.compact ? 8 : 13);
  return (
    <g>
      <Caption g={g} top={top}>
        AC und PY
      </Caption>
      {rows.map((r) => {
        const x = cxOf(g, r.m);
        const ya = fin(r.a) ? s(r.a) : z;
        const yr = fin(r.r) ? s(r.r) : z;
        const labY = r.a >= 0 ? Math.min(ya, r.r >= 0 ? yr : z) - 6 : Math.max(ya, r.r < 0 ? yr : z) + 15;
        return (
          <g key={r.m} opacity={r.op}>
            {fin(r.r) && <Bar x={x - off - cw / 2} w={cw} ya={z} yb={yr} paint={scenPaint('PY', uid)} />}
            {fin(r.a) && <Bar x={x + off - cw / 2} w={cw} ya={z} yb={ya} paint={scenPaint('AC', uid)} />}
            {fin(r.a) && !g.compact && (
              <text x={x + off} y={labY} textAnchor="middle" fontSize={11} fill={C.ac}>
                {fmt(kpi, r.a)}
              </text>
            )}
          </g>
        );
      })}
      <line x1={g.X0} x2={g.X1} y1={z} y2={z} stroke={C.ac} strokeWidth={g.compact ? 1 : 1.5} />
      <CatLabels g={g} rows={rows} y={catY} allSel={allSel} />
      <TotalBand g={g} uid={uid} kpi={kpi} band={band} ext={ext} z={z} y0={y0} bottom={bottom} />
      <text x={g.BAND_X + g.BAND_W / 2} y={catY} textAnchor="middle" fontSize={g.compact ? g.fCat : 10.5} fontWeight={600} fill={C.cat}>
        {g.compact && kpi.additive ? 'Σ' : band.label}
      </text>
    </g>
  );
}

// ---------- chart ----------

export interface VarIntChartProps {
  uid: string;
  kpi: KpiDef;
  rows: VRow[];
  band: BandData;
  lastClosed: number;
  geom: Geom;
  /** Scale domains; omitted = own scale from this series. */
  extent?: Extent;
  allSel?: boolean;
  /** Drawn behind the marks (e.g. hover highlight). */
  underlay?: ReactNode;
  /** Drawn on top (e.g. transparent hit areas). */
  overlay?: ReactNode;
  /** Without a label the SVG is decorative (aria-hidden). */
  ariaLabel?: string;
  onKeyDown?: (e: KeyboardEvent<SVGSVGElement>) => void;
}

export function VarIntChart({ uid, kpi, rows, band, lastClosed, geom: g, extent, allSel = true, underlay, overlay, ariaLabel, onKeyDown }: VarIntChartProps) {
  const ext = extent ?? extentOf(kpi, rows, band);
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
      <Divider g={g} lastClosed={lastClosed} height={H} labelY={10} />
      <RelTier {...tier} top={t1} />
      {kpi.additive ? <BridgeTier {...tier} top={t2} /> : <DeltaTier {...tier} top={t2} />}
      <BaseTier {...tier} top={t3} allSel={allSel} />
      {overlay}
    </svg>
  );
}
