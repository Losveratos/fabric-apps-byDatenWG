// "Verschiebung der Jahreszeiten": mean daily discharge per calendar month for
// the three epochs on one chart. Oldest epoch light grey (reference style),
// 1920 bis 1995 mid grey, ab 1996 dark like AC. Above the plot a Δ% row of
// "ab 1996" against "vor 1920" per month. Clicking a month toggles the filter.

import type { KeyboardEvent } from 'react';

import { C } from '@/lib/ibcs/notation';
import { fmtNum, fmtRel } from '@/lib/rhein/format';
import { MONTHS, type Epoch } from '@/lib/rhein/model';

import { fin, LINE_STYLE, orNa } from './varint';

export interface ProfileLine {
  epoch: Epoch;
  values: number[];
}

const W = 760;
const X0 = 46;
const X1 = 660;
const TOP = 34;
const PH = 210;
const H = TOP + PH + 26;


function niceStep(max: number) {
  const raw = max / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

export function SeasonProfile({
  lines,
  months,
  onToggle,
}: {
  lines: ProfileLine[];
  months: number[];
  onToggle: (m: number) => void;
}) {
  const vals = lines.flatMap((l) => l.values).filter(fin);
  const max = Math.max(1, ...vals);
  const step = niceStep(max);
  const top = Math.ceil((max * 1.05) / step) * step || 1;
  const slot = (X1 - X0) / 12;
  const cx = (i: number) => X0 + (i + 0.5) * slot;
  const y = (v: number) => TOP + PH - (v / top) * PH;
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, k) => k * step);
  const sel = new Set(months);
  const old = lines.find((l) => l.epoch === 'vor 1920');
  const now = lines.find((l) => l.epoch === 'ab 1996');
  const key = (m: number) => (e: KeyboardEvent<SVGRectElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(m);
    }
  };

  const path = (v: number[]) =>
    v
      .map((val, i) => (fin(val) ? `${i && fin(v[i - 1]) ? 'L' : 'M'}${cx(i).toFixed(1)},${y(val).toFixed(1)}` : ''))
      .filter(Boolean)
      .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label="Mittlerer Tagesabfluss je Monat und Epoche" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {MONTHS.map((_, i) =>
        sel.has(i + 1) ? <rect key={`hl${i}`} x={X0 + i * slot + 1} y={0} width={slot - 2} height={H} fill={C.hilite} opacity={0.07} /> : null
      )}
      <text x={X0} y={10} fontSize={10.5} fill={C.sub}>
        Δ ab 1996 gegen vor 1920
      </text>
      {old &&
        now &&
        MONTHS.map((_, i) => {
          const a = now.values[i];
          const r = old.values[i];
          const rel = fin(a) && fin(r) && r ? (a - r) / r : NaN;
          if (!fin(rel)) return null;
          return (
            <text key={`d${i}`} x={cx(i)} y={25} textAnchor="middle" fontSize={10} fontWeight={600} fill={rel >= 0 ? C.good : C.bad}>
              {fmtRel(rel, 0)}
            </text>
          );
        })}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X0} x2={X1} y1={y(t)} y2={y(t)} stroke={C.hair} strokeWidth={t === 0 ? 1.4 : 0.5} opacity={t === 0 ? 1 : 0.6} />
          <text x={X0 - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={C.sub}>
            {fmtNum(t)}
          </text>
        </g>
      ))}
      {lines.map((l) => {
        const st = LINE_STYLE[l.epoch];
        const last = l.values[11];
        return (
          <g key={l.epoch}>
            <path d={path(l.values)} fill="none" stroke={st.stroke} strokeWidth={st.width} strokeDasharray={st.dash} strokeLinejoin="round" />
            {l.values.map((v, i) => (fin(v) ? <circle key={i} cx={cx(i)} cy={y(v)} r={l.epoch === 'ab 1996' ? 3.2 : 2.2} fill={st.stroke} /> : null))}
            {fin(last) && (
              <text x={cx(11) + 10} y={y(last) + 3.5} fontSize={10.5} fontWeight={l.epoch === 'ab 1996' ? 700 : 400} fill={st.stroke}>
                {l.epoch}
              </text>
            )}
          </g>
        );
      })}
      {MONTHS.map((m, i) => (
        <text key={m} x={cx(i)} y={TOP + PH + 16} textAnchor="middle" fontSize={11} fill={C.cat} fontWeight={sel.has(i + 1) ? 700 : 400}>
          {m}
        </text>
      ))}
      <text x={X0 - 6} y={TOP - 4} textAnchor="end" fontSize={10} fill={C.sub}>
        m³/s
      </text>
      {MONTHS.map((m, i) => (
        <rect
          key={`hit${i}`}
          x={X0 + i * slot}
          y={0}
          width={slot}
          height={H}
          fill="transparent"
          role="button"
          tabIndex={0}
          aria-pressed={sel.has(i + 1)}
          aria-label={`${m}: ${lines.map((l) => `${l.epoch} ${orNa(l.values[i], (v) => fmtNum(v))} m³/s`).join(', ')}`}
          className="cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => onToggle(i + 1)}
          onKeyDown={key(i + 1)}
        >
          <title>{`${m}\n${lines.map((l) => `${l.epoch}: ${orNa(l.values[i], (v) => fmtNum(v))} m³/s`).join('\n')}\nKlick: Monat filtern`}</title>
        </rect>
      ))}
    </svg>
  );
}
