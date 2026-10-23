// Pure SVG of the integrated variance bridge (rows in, SVG out), following the
// ChartKitchen "wfkombi" layout: rows aligned across three tiers
//   1 AC · PY   offset bars (PY behind AC), Σ rows as totals
//   2 ΔPY       vertical-flow bridge PY Σ → Δ per member → AC Σ with
//               connectors and an optional axis cut (cutMarkV)
//   3 ΔPY%      pins relative to each member's PY (relCap outlier arrows)
// The compact variant (small multiples) draws only the bridge tier.

import type { KeyboardEvent, ReactNode } from 'react';

import { IbcsDefs, PinHead, RefAxis } from '@/components/ibcs/Ibcs';
import { C, makeScale, relCap, scenPaint, varPaint, type Paint } from '@/lib/ibcs/notation';
import { fmt, fmtDelta, fmtRel, unitLabel } from '@/lib/sales/format';
import type { KpiDef } from '@/lib/sales/kpis';

import { bridgeDomain, type BridgeData, type BridgeDomain, type BridgeRow } from './StructureBridgeModel';

const fin = (v: number) => Number.isFinite(v);
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const FULL = { rowH: 27, padT: 24, padB: 6, gap: 26, padR: 14, fs: 10.5, catFs: 11, maxChars: 20 };
const COMPACT = { rowH: 17, padT: 4, padB: 4, gap: 0, padR: 6, fs: 8.5, catFs: 9, maxChars: 14 };

/** Double slanted cut mark on a horizontal bar (ChartKitchen cutMarkV). */
function CutMark({ x, cy, bh }: { x: number; cy: number; bh: number }) {
  const y1 = cy - bh / 2 - 3;
  const y2 = cy + bh / 2 + 3;
  return (
    <g data-cut="">
      <polygon points={`${x + 3},${y1} ${x - 3},${y2} ${x + 3.5},${y2} ${x + 9.5},${y1}`} fill={C.paper} />
      <line x1={x + 3} y1={y1} x2={x - 3} y2={y2} stroke={C.ac} strokeWidth={1} />
      <line x1={x + 9.5} y1={y1} x2={x + 3.5} y2={y2} stroke={C.ac} strokeWidth={1} />
    </g>
  );
}

function Bar({ x, y, w, h, p }: { x: number; y: number; w: number; h: number; p: Paint }) {
  return <rect x={x} y={y} width={Math.max(0.75, w)} height={h} fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} />;
}

export function StructureBridge({
  data,
  kpi,
  uid,
  variant = 'full',
  width,
  domain,
  filterActive = false,
  onToggle,
  ariaLabel,
}: {
  data: BridgeData;
  kpi: KpiDef;
  /** Unique id prefix for the hatch patterns of this svg. */
  uid: string;
  variant?: 'full' | 'compact';
  /** viewBox width. */
  width: number;
  /** Shared tier-2 domain (small multiples); defaults to this bridge only. */
  domain?: BridgeDomain;
  /** Dims unselected member rows to 45 %. */
  filterActive?: boolean;
  /** Member rows become buttons that toggle the cross-filter. */
  onToggle?: (member: string) => void;
  ariaLabel: string;
}) {
  const full = variant === 'full';
  const L = full ? FULL : COMPACT;
  const rows = data.rows;
  const W = width;
  const H = L.padT + rows.length * L.rowH + L.padB;
  const yMid = (i: number) => L.padT + i * L.rowH + L.rowH / 2;
  const unit = unitLabel(kpi);

  // ---------- horizontal layout ----------
  const maxChars = Math.max(1, ...rows.map((r) => short(r.label, L.maxChars).length));
  const labelW = full ? Math.min(150, Math.max(58, maxChars * 6.6 + 14)) : Math.min(100, Math.max(40, maxChars * 5.1 + 10));
  const avail = W - labelW - 2 * L.gap - L.padR;
  const t1 = full ? avail * 0.34 : 0;
  const t2 = full ? avail * 0.4 : W - labelW - L.padR - 4;
  const t3 = full ? avail * 0.26 : 0;
  const x1 = labelW;
  const x2 = full ? x1 + t1 + L.gap : labelW + 4;
  const x3 = x2 + t2 + L.gap;

  const memberRows = rows.filter((r) => r.kind === 'member' || r.kind === 'rest');

  // ---------- tier 1 scale (members; Σ rows clipped with a cut mark if they would squash the members) ----------
  const memberVals = memberRows.flatMap((r) => [r.ac, r.py]).filter(fin);
  const sumVals = [data.pySum, data.acSum].filter(fin);
  const memberMax = Math.max(0, ...memberVals.map(Math.abs));
  const sumMax = Math.max(0, ...sumVals.map(Math.abs));
  const sumsFit = memberMax === 0 || sumMax <= 1.6 * memberMax;
  const t1Vals = sumsFit ? [...memberVals, ...sumVals] : memberVals;
  const t1Neg = t1Vals.some((v) => v < 0);
  const t1Lo = x1 + (t1Neg ? 40 : 4);
  const t1Hi = x1 + t1 - 34;
  const baseScale = makeScale(t1Vals, [t1Lo, t1Hi], 0.02);
  const clipX = (v: number) => Math.max(t1Lo, Math.min(t1Hi, baseScale(v)));

  // ---------- tier 2 scale ----------
  const dom = domain ?? bridgeDomain([data]);
  const r0 = x2 + (dom.lo < 0 ? (full ? 40 : 28) : full ? 4 : 2);
  const r1 = x2 + t2 - (full ? 44 : 30);
  const X = (v: number) => r0 + ((v - dom.base - dom.lo) / (dom.hi - dom.lo)) * (r1 - r0);
  const axis2 = X(dom.base);

  // ---------- tier 3 scale ----------
  const rels = rows.filter((r) => r.kind !== 'start').map((r) => r.rel);
  const cap = relCap(rels);
  const clampRel = (v: number) => Math.max(-cap, Math.min(cap, v));
  const rNeg = rels.some((v) => v < 0);
  const rPos = rels.some((v) => v > 0);
  const rScale = makeScale(rels.filter(fin).map(clampRel), [x3 + (rNeg ? 34 : 0), x3 + t3 - (rPos ? 34 : 0)], 0.02);

  const bh = L.rowH * 0.58;
  const pyPaint = scenPaint('PY', uid);
  const acPaint = scenPaint('AC', uid);
  const span = (a: number, b: number) => ({ x: Math.min(a, b), w: Math.abs(b - a) });

  const toggle = (r: BridgeRow) => {
    if (onToggle && r.kind === 'member') onToggle(r.label);
  };
  const onKey = (e: KeyboardEvent, r: BridgeRow) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(r);
    }
  };

  // connectors are drawn below the bars
  const conns: ReactNode[] = [];
  if (data.bridge) {
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      if (!fin(prev.to)) continue;
      const xc = X(prev.to);
      conns.push(<line key={`c${i}`} x1={xc} x2={xc} y1={yMid(i - 1) + bh / 2} y2={yMid(i) - bh / 2} stroke={C.conn} strokeWidth={1} />);
    }
  }

  const endIdx = rows.findIndex((r) => r.kind === 'end');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full"
      role="group"
      aria-label={ariaLabel}
      data-bridge={data.bridge ? 'closed' : 'none'}
      data-cut={dom.cut ? 'true' : 'false'}
    >
      <IbcsDefs uid={uid} />

      {full && (
        <g fontSize={10} fontWeight={600} fill={C.sub}>
          <text x={x1} y={12}>
            AC · PY
          </text>
          <text x={x2} y={12}>
            {data.bridge ? 'ΔPY Brücke' : 'ΔPY'}
          </text>
          <text x={x3} y={12}>
            ΔPY%
          </text>
        </g>
      )}

      {conns}

      {/* Σ rule above the AC Σ row */}
      {endIdx > 0 && <line x1={0} x2={W - L.padR / 2} y1={L.padT + endIdx * L.rowH} y2={L.padT + endIdx * L.rowH} stroke={C.ac} strokeWidth={1} />}

      {rows.map((r, i) => {
        const y = yMid(i);
        const sum = r.kind === 'start' || r.kind === 'end';
        const isMember = r.kind === 'member';
        const dim45 = filterActive && isMember && !r.selected;
        const good = !(r.good < 0);
        const col = good ? C.good : C.bad;
        const weight = sum || r.selected ? 700 : 400;

        const tip =
          r.kind === 'start'
            ? `${r.label}: ${fmt(kpi, r.py)} ${unit}`
            : [
                r.label,
                `AC: ${fmt(kpi, r.ac)} ${unit}`,
                `PY: ${fmt(kpi, r.py)} ${unit}`,
                `ΔPY: ${fmtDelta(kpi, r.delta)}`,
                `ΔPY%: ${fmtRel(r.rel)}`,
              ].join('\n');

        const interactive =
          onToggle && isMember
            ? {
                role: 'button' as const,
                tabIndex: 0,
                'aria-pressed': r.selected,
                'aria-label': `${r.label}: ${fmt(kpi, r.ac)}, ΔPY ${fmtDelta(kpi, r.delta)}. Filter umschalten`,
                onClick: () => toggle(r),
                onKeyDown: (e: KeyboardEvent) => onKey(e, r),
                className: 'cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-ring',
              }
            : {};

        // ----- tier 1 -----
        let tier1: ReactNode = null;
        if (full) {
          if (sum) {
            const v = r.kind === 'start' ? r.py : r.ac;
            if (fin(v)) {
              const z = baseScale(0);
              const xe = clipX(v);
              const clipped = Math.abs(xe - baseScale(v)) > 0.5;
              const b = span(z, xe);
              const neg = v < 0;
              tier1 = (
                <>
                  <Bar x={b.x} y={y - bh / 2} w={b.w} h={bh} p={r.kind === 'start' ? pyPaint : acPaint} />
                  {clipped && <CutMark x={neg ? b.x + 8 : b.x + b.w - 22} cy={y} bh={bh} />}
                  <text x={neg ? b.x - 6 : b.x + b.w + 6} y={y} dy="0.35em" textAnchor={neg ? 'end' : 'start'} fontSize={L.fs} fontWeight={700} fill={C.ac}>
                    {fmt(kpi, v)}
                  </text>
                </>
              );
            }
          } else {
            const barH = 0.4 * L.rowH;
            const shift = 0.12 * L.rowH;
            const z = baseScale(0);
            const refBar = fin(r.py) ? span(z, clipX(r.py)) : null;
            const acBar = fin(r.ac) ? span(z, clipX(r.ac)) : null;
            const lead = fin(r.ac) ? r.ac : r.py;
            const endR = Math.max(z, refBar ? refBar.x + refBar.w : z, acBar ? acBar.x + acBar.w : z);
            const endL = Math.min(z, refBar ? refBar.x : z, acBar ? acBar.x : z);
            const valNeg = fin(lead) && lead < 0;
            tier1 = (
              <>
                {refBar && <Bar x={refBar.x} y={y - barH / 2 - shift} w={refBar.w} h={barH} p={pyPaint} />}
                {acBar && <Bar x={acBar.x} y={y - barH / 2 + shift} w={acBar.w} h={barH} p={acPaint} />}
                <text x={valNeg ? endL - 6 : endR + 6} y={y + shift / 2} dy="0.35em" textAnchor={valNeg ? 'end' : 'start'} fontSize={L.fs} fill={C.ac}>
                  {fmt(kpi, r.ac)}
                </text>
              </>
            );
          }
        }

        // ----- tier 2 -----
        let tier2: ReactNode = null;
        if (data.bridge) {
          if (sum) {
            const v = r.to;
            if (fin(v)) {
              const fromEff = dom.cut ? dom.base : 0;
              const b = span(X(fromEff), X(v));
              const right = v >= 0;
              tier2 = (
                <>
                  <Bar x={b.x} y={y - bh / 2} w={b.w} h={bh} p={r.kind === 'start' ? pyPaint : acPaint} />
                  {dom.cut && <CutMark x={axis2 + (full ? 13 : 8)} cy={y} bh={bh} />}
                  {full && (
                    <text x={right ? b.x + b.w + 5 : b.x - 5} y={y} dy="0.35em" textAnchor={right ? 'start' : 'end'} fontSize={L.fs} fontWeight={700} fill={C.ac}>
                      {fmt(kpi, v)}
                    </text>
                  )}
                </>
              );
            }
          } else if (fin(r.delta)) {
            const b = span(X(r.from), X(r.to));
            const right = r.delta >= 0;
            tier2 = (
              <>
                <Bar x={b.x} y={y - bh / 2} w={b.w} h={bh} p={varPaint('AC', good, uid)} />
                <text x={right ? b.x + b.w + 4 : b.x - 4} y={y} dy="0.35em" textAnchor={right ? 'start' : 'end'} fontSize={L.fs} fill={col} data-delta="">
                  {fmtDelta(kpi, r.delta)}
                </text>
              </>
            );
          }
        } else if (r.kind !== 'start' && fin(r.delta)) {
          // non-additive fallback: plain ΔPY bars from the reference axis
          const b = span(X(0), X(r.delta));
          const right = r.delta >= 0;
          const h = full ? 11 : 8;
          tier2 = (
            <>
              <Bar x={b.x} y={y - h / 2} w={b.w} h={h} p={varPaint('AC', good, uid)} />
              <text
                x={right ? b.x + b.w + 4 : b.x - 4}
                y={y}
                dy="0.35em"
                textAnchor={right ? 'start' : 'end'}
                fontSize={L.fs}
                fontWeight={sum ? 700 : 400}
                fill={col}
                data-delta=""
              >
                {fmtDelta(kpi, r.delta)}
              </text>
            </>
          );
        }

        // ----- tier 3 -----
        let tier3: ReactNode = null;
        if (full && r.kind !== 'start') {
          if (fin(r.rel)) {
            const capped = Math.abs(r.rel) > cap;
            const rx = rScale(clampRel(r.rel));
            const dir = r.rel < 0 ? -1 : 1;
            tier3 = (
              <>
                <line x1={rScale(0)} x2={rx} y1={y} y2={y} stroke={col} strokeWidth={1.6} />
                <PinHead cx={rx} cy={y} r={3.8} good={good} minuend="AC" uid={uid} />
                {capped && <path d={`M${rx + dir * 5},${y - 3.5} L${rx + dir * 10},${y} L${rx + dir * 5},${y + 3.5} Z`} fill={col} />}
                <text x={rx + dir * (capped ? 14 : 8)} y={y} dy="0.35em" textAnchor={dir < 0 ? 'end' : 'start'} fontSize={L.fs} fontWeight={sum ? 700 : 400} fill={col}>
                  {fmtRel(r.rel)}
                </text>
              </>
            );
          } else {
            tier3 = (
              <text x={rScale(0) + 8} y={y} dy="0.35em" fontSize={10} fill={C.sub}>
                n. a.
              </text>
            );
          }
        }

        return (
          <g key={r.key} opacity={dim45 ? 0.45 : 1} data-kind={r.kind} {...interactive}>
            <title>{tip}</title>
            <rect x={0} y={y - L.rowH / 2} width={W} height={L.rowH} fill="transparent" />
            {r.selected && <rect x={0} y={y - L.rowH / 2 + 4} width={3} height={L.rowH - 8} fill={C.hilite} />}
            <text
              x={labelW - (full ? 8 : 5)}
              y={y}
              dy="0.35em"
              textAnchor="end"
              fontSize={L.catFs}
              fontWeight={weight}
              fontStyle={r.kind === 'rest' ? 'italic' : undefined}
              fill={sum ? C.ac : C.cat}
            >
              {short(r.label, L.maxChars)}
            </text>
            {tier1}
            {tier2}
            {tier3}
          </g>
        );
      })}

      {/* axes on top of the bars, spanning the full height */}
      {full && <RefAxis code="AC" orient="v" at={baseScale(0)} from={L.padT - 4} to={H - L.padB / 2} />}
      {data.bridge ? (
        <RefAxis code="AC" orient="v" at={axis2} from={L.padT - (full ? 4 : 2)} to={H - L.padB / 2} />
      ) : (
        <RefAxis code="PY" orient="v" at={X(0)} from={L.padT - (full ? 4 : 2)} to={H - L.padB / 2} />
      )}
      {full && <RefAxis code="PY" orient="v" at={rScale(0)} from={L.padT - 4} to={H - L.padB / 2} />}
    </svg>
  );
}
