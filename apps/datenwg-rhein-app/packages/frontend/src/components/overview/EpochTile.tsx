// Structure tile "‹KPI› je Epoche": three horizontal AC bars against a grey
// REF marker (same months 1817..1920) and a ΔREF% pin column. Click on an
// epoch toggles the epoch filter (cross filter for every page).

import { useId, useState } from 'react';

import { IbcsDefs, PinHead, RefAxis, ScenarioTag } from '@/components/ibcs/Ibcs';
import { Tile } from '@/components/Tile';
import { useRhein } from '@/hooks/rhein.context';
import { C, makeScale, relCap } from '@/lib/ibcs/notation';
import { fmt, fmtDelta, fmtRel, relDelta, unitLabel } from '@/lib/rhein/format';
import { favourable } from '@/lib/rhein/kpis';
import type { Epoch } from '@/lib/rhein/model';

import { deltaPhrase, REF_LABEL } from './shared';
import { fin, onKey } from './varint';

const W = 560;
const ROW = 46;
const TOP = 20;
const LBL = 112;
const BAR0 = 120;
const BAR1 = 330;
const REL0 = 410;
const REL1 = 548;

const EPOCH_SUBJECT: Record<Epoch, string> = { 'vor 1920': 'Vor 1920', '1920 bis 1995': 'Von 1920 bis 1995', 'ab 1996': 'Seit 1996' };

export function EpochTile() {
  const { kpi, byEpoch, view, toggleEpoch, selectionText } = useRhein();
  const uid = 'ep' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [hot, setHot] = useState(-1);
  const groups = byEpoch(kpi);
  const H = TOP + groups.length * ROW + 8;

  const max = Math.max(0, ...groups.flatMap((g) => [g.ac, g.ref]).filter(fin));
  const x = (v: number) => BAR0 + (max > 0 ? (v / max) * (BAR1 - BAR0) : 0);
  const rels = groups.map((g) => relDelta(g.ac, g.ref));
  const cap = relCap(rels);
  const rs = makeScale([-cap, cap], [REL0 + 18, REL1 - 18], 0);
  const z = rs(0);

  // Kernaussage: the epoch with the largest unfavourable (else largest) deviation.
  const ranked = groups
    .map((g) => ({ g, f: favourable(kpi, g.ac - g.ref) / (Math.abs(g.ref) || 1) }))
    .filter((x) => fin(x.f))
    .sort((a, b) => a.f - b.f);
  const pickG = ranked.length ? (ranked[0].f < 0 ? ranked[0].g : ranked[ranked.length - 1].g) : null;
  const ph = pickG ? deltaPhrase(kpi, pickG.ac, pickG.ref) : null;
  const message =
    pickG && ph ? (
      <>
        {EPOCH_SUBJECT[pickG.group as Epoch]} liegt {kpi.short}{' '}
        {ph.good === null ? 'auf Höhe der Referenz' : <span style={{ color: ph.good ? C.good : C.bad }}>{ph.text} der Referenz</span>}
        {view.months.length ? ' (gewählte Monate)' : ''}
      </>
    ) : null;

  const hint = view.epochs.length ? 'Klick hebt die Epoche auf oder fügt sie hinzu.' : 'Klick filtert auf die Epoche.';

  return (
    <Tile
      title={`${kpi.label} je Epoche`}
      sub={`${unitLabel(kpi)} · AC vs ${REF_LABEL} · ${selectionText.split(' · ')[1] ?? ''}`}
      message={message}
      tools={
        <span className="flex items-center gap-200">
          <ScenarioTag code="AC" />
          <ScenarioTag code="PY">REF</ScenarioTag>
        </span>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label={`${kpi.label} je Epoche`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        <IbcsDefs uid={uid} />
        <text x={BAR0} y={12} fontSize={10.5} fill={C.sub}>
          AC und REF
        </text>
        <text x={REL0} y={12} fontSize={10.5} fill={C.sub}>
          ΔREF%
        </text>
        {groups.map((g, i) => {
          const y = TOP + i * ROW;
          const cy = y + ROW / 2;
          const on = view.epochs.includes(g.group as Epoch);
          const dim = view.epochs.length > 0 && !on;
          const d = g.ac - g.ref;
          const good = favourable(kpi, d) >= 0;
          const rel = rels[i];
          const relV = fin(rel) ? Math.max(-cap, Math.min(cap, rel)) : NaN;
          const capped = fin(rel) && Math.abs(rel) > cap + 1e-9;
          const col = good ? C.good : C.bad;
          const act = () => toggleEpoch(g.group as Epoch);
          return (
            <g key={g.group} opacity={dim ? 0.4 : 1}>
              {hot === i && <rect x={0} y={y} width={W} height={ROW} fill="var(--color-hover)" />}
              <text x={LBL} y={cy + 4} textAnchor="end" fontSize={11.5} fontWeight={on ? 700 : 500} fill={C.cat}>
                {g.group}
              </text>
              {fin(g.ac) && <rect x={BAR0} y={cy - 9} width={Math.max(0.5, x(g.ac) - BAR0)} height={18} fill={C.ac} />}
              {fin(g.ref) && <line x1={x(g.ref)} x2={x(g.ref)} y1={cy - 14} y2={cy + 14} stroke={C.py} strokeWidth={3.5} />}
              {fin(g.ac) && (
                <text x={Math.max(x(g.ac), fin(g.ref) ? x(g.ref) : 0) + 6} y={cy + 4} fontSize={11} fontWeight={700} fill={C.ac}>
                  {fmt(kpi, g.ac)}
                </text>
              )}
              {fin(relV) && (
                <>
                  <line x1={z} x2={rs(relV)} y1={cy} y2={cy} stroke={col} strokeWidth={2} />
                  {capped ? (
                    <polygon points={rel > 0 ? `${rs(relV)},${cy - 4} ${rs(relV) + 6},${cy} ${rs(relV)},${cy + 4}` : `${rs(relV)},${cy - 4} ${rs(relV) - 6},${cy} ${rs(relV)},${cy + 4}`} fill={col} />
                  ) : (
                    <PinHead cx={rs(relV)} cy={cy} r={4} good={good} minuend="AC" uid={uid} />
                  )}
                  <text x={rel >= 0 ? rs(relV) + 9 : rs(relV) - 9} y={cy - 7} textAnchor={rel >= 0 ? 'start' : 'end'} fontSize={10} fontWeight={600} fill={col}>
                    {fmtRel(rel, 0)}
                  </text>
                  <text x={rel >= 0 ? rs(relV) + 9 : rs(relV) - 9} y={cy + 13} textAnchor={rel >= 0 ? 'start' : 'end'} fontSize={9} fill={col}>
                    {fmtDelta(kpi, d)}
                  </text>
                </>
              )}
              <rect
                data-epoch={g.group}
                x={0}
                y={y}
                width={W}
                height={ROW}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-pressed={on}
                aria-label={`${g.group}: AC ${fmt(kpi, g.ac)}; REF ${fmt(kpi, g.ref)}; ΔREF% ${fmtRel(rel)}. ${hint}`}
                style={{ cursor: 'pointer', outline: 'none' }}
                onClick={act}
                onKeyDown={(e) => onKey(e, act)}
                onMouseEnter={() => setHot(i)}
                onMouseLeave={() => setHot(-1)}
                onFocus={() => setHot(i)}
                onBlur={() => setHot(-1)}
              >
                <title>{[g.group, `AC ${fmt(kpi, g.ac)}`, `REF ${fmt(kpi, g.ref)}`, `ΔREF ${fmtDelta(kpi, d)}`, `ΔREF% ${fmtRel(rel)}`].join('\n')}</title>
              </rect>
            </g>
          );
        })}
        <RefAxis code="PY" orient="v" at={z} from={TOP - 2} to={H - 4} />
      </svg>
      <p className="mt-200 text-100 text-muted-foreground">
        Grauer Strich = {REF_LABEL} derselben Monate. {hint}
      </p>
    </Tile>
  );
}
