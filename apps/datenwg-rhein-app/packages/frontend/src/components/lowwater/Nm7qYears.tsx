// NM7Q per year: thin columns, REF line, the ten lowest years marked and labelled.

import { useMemo } from 'react';

import { IbcsDefs, ScenarioTag } from '@/components/ibcs/Ibcs';
import { useRhein } from '@/hooks/rhein.context';
import { C, makeScale } from '@/lib/ibcs/notation';
import { fmt } from '@/lib/rhein/format';
import { KPI_BY_ID } from '@/lib/rhein/kpis';

import { lowestYears } from './helpers';

const NM7Q = KPI_BY_ID.nm7q;
const W = 900;
const L = 6;
const R = 6;
const TOP = 40;
const BOT = 220;

export function Nm7qYears({ zoomed = false }: { zoomed?: boolean }) {
  const { series, openYear, view } = useRhein();
  const pts = useMemo(() => series(NM7Q, 'year').filter((p) => Number.isFinite(p.ac)), [series]);
  if (!pts.length) return <p className="text-200 text-muted-foreground">Keine Daten für diese Auswahl.</p>;

  const ref = pts[0].ref;
  const f = makeScale([...pts.map((p) => p.ac), ref], [BOT, TOP], 0.05);
  const band = (W - L - R) / pts.length;
  const bw = Math.max(1.2, band * 0.72);
  const low = lowestYears(pts, 10);
  const lowSet = new Set(low.map((p) => p.key));
  const idx = new Map(pts.map((p, i) => [p.key, i]));
  const first = pts[0].key;
  const last = pts[pts.length - 1].key;

  return (
    <div className="flex flex-col gap-300">
      <div className="flex flex-wrap items-center gap-300 text-200 text-foreground/70">
        <ScenarioTag code="AC">NM7Q je Jahr</ScenarioTag>
        <ScenarioTag code="PY">REF 1817 bis 1920 ({fmt(NM7Q, ref)} m³/s)</ScenarioTag>
        <span className="inline-flex items-center gap-100">
          <span className="inline-block size-[10px]" style={{ background: C.bad }} aria-hidden="true" />
          die 10 niedrigsten Jahre
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${BOT + 22}`} className="w-full" style={{ maxHeight: zoomed ? 640 : 360 }} role="group" aria-label="NM7Q je Jahr">
        <IbcsDefs uid="nm7" />
        {pts.map((p, i) => {
          const x = L + i * band + (band - bw) / 2;
          const marked = lowSet.has(p.key);
          return (
            <g key={p.key} opacity={p.active ? 1 : 0.3}>
              <rect x={x} y={f(p.ac)} width={bw} height={Math.max(0, BOT - f(p.ac))} fill={marked ? C.bad : C.ac} />
              <rect
                x={L + i * band}
                y={TOP - 10}
                width={band}
                height={BOT - TOP + 10}
                fill="transparent"
                role="button"
                tabIndex={marked ? 0 : -1}
                aria-label={`Jahr ${p.key}, NM7Q ${fmt(NM7Q, p.ac)} m³/s, öffnen`}
                style={{ cursor: 'pointer' }}
                onClick={() => openYear(p.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openYear(p.key);
                  }
                }}
              >
                <title>{`${p.key}: ${fmt(NM7Q, p.ac)} m³/s`}</title>
              </rect>
            </g>
          );
        })}
        <line x1={L} x2={W - R} y1={BOT} y2={BOT} stroke={C.ac} strokeWidth={1.2} />
        <line x1={L} x2={W - R} y1={f(ref)} y2={f(ref)} stroke={C.py} strokeWidth={2} pointerEvents="none" />
        {low.map((p, k) => {
          const i = idx.get(p.key) ?? 0;
          const cx = L + i * band + band / 2;
          const row = k % 3;
          return (
            <g key={`l${p.key}`} pointerEvents="none">
              <line x1={cx} x2={cx} y1={f(p.ac) - 2} y2={TOP - 28 + row * 11 + 2} stroke={C.bad} strokeWidth={0.6} opacity={0.6} />
              <text x={Math.min(Math.max(cx, 20), W - 20)} y={TOP - 28 + row * 11} textAnchor="middle" fontSize={zoomed ? 10 : 9} fill={C.bad} fontWeight={600} className="tabular-nums">
                {p.key}
              </text>
            </g>
          );
        })}
        <text x={L} y={BOT + 16} fontSize={9} fill={C.cat}>
          {first}
        </text>
        <text x={W - R} y={BOT + 16} textAnchor="end" fontSize={9} fill={C.cat}>
          {last}
        </text>
      </svg>
      {view.epochs.length > 0 && <p className="text-200 text-muted-foreground">Ausgeblendete Epochen sind blass und zählen nicht für die Markierung.</p>}
    </div>
  );
}
