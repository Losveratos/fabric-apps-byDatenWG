// Horizontal IBCS bars for open offers: outlined bar = open volume (not yet
// won), solid inner bar = probability-weighted volume. Rows are focusable.

import { useId, type KeyboardEvent } from 'react';

import { IbcsDefs, RefAxis, ScenarioTag } from '@/components/ibcs/Ibcs';
import { C, makeScale, scenPaint } from '@/lib/ibcs/notation';
import { fmtEuro } from '@/lib/sales/format';

import { fin, type BarRow } from './pipeline-calc';

const W = 640;
const ROW_H = 28;
const PAD_T = 6;
const PAD_B = 6;
const RIGHT_COL = 150;
const VAL_W = 66;
const MAX_CHARS = 22;

const short = (s: string) => (s.length > MAX_CHARS ? s.slice(0, MAX_CHARS - 1) + '…' : s);

export interface OpenBarRow extends BarRow {
  /** Row cannot be selected (e.g. "übrige"). */
  inert?: boolean;
}

export function OpenBarsLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-400 gap-y-100 pb-200 text-200 text-muted-foreground">
      <ScenarioTag code="PL">Offen (Summe)</ScenarioTag>
      <ScenarioTag code="AC">Gewichtet (Summe × Wahrscheinlichkeit)</ScenarioTag>
    </div>
  );
}

export function OpenBars({
  rows,
  label,
  selected,
  hasSelection,
  onSelect,
  selectLabel,
}: {
  rows: OpenBarRow[];
  label: string;
  /** Keys of selected rows. */
  selected: string[];
  /** Some selection is active, so unselected rows are dimmed. */
  hasSelection: boolean;
  onSelect: (key: string) => void;
  selectLabel: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  if (rows.length === 0) return <p className="py-600 text-center text-300 text-muted-foreground">Keine offenen Angebote für diese Auswahl.</p>;

  const labelW = Math.min(160, Math.max(60, Math.max(...rows.map((r) => short(r.label).length)) * 6.6 + 14));
  const x0 = labelW;
  const x1 = W - RIGHT_COL - VAL_W;
  const H = PAD_T + rows.length * ROW_H + PAD_B;
  const scale = makeScale(rows.map((r) => fin(r.open)), [x0, x1], 0);
  const outline = scenPaint('PL', uid);
  const solid = scenPaint('AC', uid);
  const onKey = (e: KeyboardEvent, key: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(key);
    }
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="group" aria-label={label}>
      <IbcsDefs uid={uid} />
      {rows.map((r, i) => {
        const y = PAD_T + i * ROW_H + ROW_H / 2;
        const isSel = selected.includes(r.key);
        const dimmed = hasSelection && !isSel;
        const ow = Math.max(0, scale(fin(r.open)) - x0);
        const ww = Math.max(0, scale(fin(r.weighted)) - x0);
        const interactive = !r.inert;
        const common = {
          opacity: dimmed ? 0.45 : 1,
          className: interactive ? 'cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-ring' : undefined,
        };
        const body = (
          <>
            <title>{`${r.label}\nOffen: ${fmtEuro(r.open)}\nGewichtet: ${fmtEuro(r.weighted)}\n${r.n} Angebote`}</title>
            <rect x={0} y={y - ROW_H / 2} width={W} height={ROW_H} fill="transparent" />
            {isSel && <rect x={0} y={y - ROW_H / 2 + 4} width={3} height={ROW_H - 8} fill={C.hilite} />}
            <text x={labelW - 8} y={y} dy="0.35em" textAnchor="end" fontSize={11} fontWeight={isSel ? 700 : 400} fill={C.cat}>
              {short(r.label)}
            </text>
            {ow > 0 && <rect x={x0} y={y - 8} width={ow} height={16} fill={outline.fill} stroke={outline.stroke} strokeWidth={outline.strokeWidth} />}
            {ww > 0 && <rect x={x0} y={y - 4.5} width={ww} height={9} fill={solid.fill} />}
            <text x={x0 + ow + 6} y={y} dy="0.35em" fontSize={10.5} fill={C.ac}>
              {fmtEuro(r.open)}
            </text>
            <text x={W - 4} y={y} dy="0.35em" textAnchor="end" fontSize={10.5} fill={C.fcInk}>
              {`gew. ${fmtEuro(r.weighted)} · ${r.n} Ang.`}
            </text>
          </>
        );
        return interactive ? (
          <g
            key={r.key}
            role="button"
            tabIndex={0}
            aria-pressed={isSel}
            aria-label={`${r.label}: offen ${fmtEuro(r.open)}, gewichtet ${fmtEuro(r.weighted)}, ${r.n} Angebote. ${selectLabel}`}
            onClick={() => onSelect(r.key)}
            onKeyDown={(e) => onKey(e, r.key)}
            {...common}
          >
            {body}
          </g>
        ) : (
          <g key={r.key} role="img" aria-label={`${r.label}: offen ${fmtEuro(r.open)}, gewichtet ${fmtEuro(r.weighted)}, ${r.n} Angebote`} opacity={common.opacity}>
            {body}
          </g>
        );
      })}
      <RefAxis code="AC" orient="v" at={x0} from={PAD_T} to={H - PAD_B / 2} />
    </svg>
  );
}
