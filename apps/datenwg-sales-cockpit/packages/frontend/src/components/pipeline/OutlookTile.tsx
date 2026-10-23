// "Ausblick nach Abschlussmonat": per close month three offset columns:
// won (AC, solid), weighted open pipeline (outlined) and forecast with
// success flag (FC, hatched). Year separators and totals in a right band.

import { useId, useMemo, useState } from 'react';

import { IbcsDefs, RefAxis, ScenarioTag } from '@/components/ibcs/Ibcs';
import { Switch, Tile } from '@/components/Tile';
import { C, makeScale, scenPaint } from '@/lib/ibcs/notation';
import { fmtEuro } from '@/lib/sales/format';
import type { Deal, FcDeal, SalesData } from '@/lib/sales/model';

import { buildOutlook, fin, fmtK } from './pipeline-calc';

const W = 840;
const BAND_W = 168;
const PLOT_T = 54;
const BASE = 214;
const H = 262;
const X0 = 6;

type Mode = 'month' | 'quarter';

export function OutlookTile({ data, deals, fc }: { data: SalesData; deals: Deal[]; fc: FcDeal[] }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [mode, setMode] = useState<Mode>('month');
  const out = useMemo(() => buildOutlook(data, deals, fc, mode), [data, deals, fc, mode]);

  const tools = (
    <Switch
      label="Auflösung"
      value={mode}
      options={[
        { id: 'month' as const, label: 'Monat' },
        { id: 'quarter' as const, label: 'Quartal' },
      ]}
      onChange={setMode}
    />
  );
  const sub = `Tsd. € · Ist (AC), gewichtete Pipeline, Forecast (FC) · ab ${out.startLabel}`;

  const x1 = W - BAND_W;
  const cols = out.cols;
  const n = cols.length;
  const gw = (x1 - X0) / Math.max(1, n);
  const bw = Math.min(16, Math.max(4, (gw - 5) / 3));
  const maxV = Math.max(0, ...cols.flatMap((c) => [fin(c.won), fin(c.open), fin(c.fc)]));
  const scale = makeScale([maxV], [BASE, PLOT_T], 0);
  const minLabel = maxV * 0.04;

  const ac = scenPaint('AC', uid);
  const pl = scenPaint('PL', uid);
  const fcp = scenPaint('FC', uid);

  const total = out.years.reduce((s, y) => s + y.open + y.fc, 0) + out.years.reduce((s, y) => s + y.won, 0);
  if (n === 0 || total <= 0) {
    return (
      <Tile title="Ausblick nach Abschlussmonat" sub={sub} tools={tools}>
        <p className="py-600 text-center text-300 text-muted-foreground">Keine Werte im Ausblick für diese Auswahl.</p>
      </Tile>
    );
  }

  // year spans for separators and labels
  const spans: { year: number; from: number; to: number }[] = [];
  cols.forEach((c, i) => {
    const last = spans[spans.length - 1];
    if (last && last.year === c.year) last.to = i;
    else spans.push({ year: c.year, from: i, to: i });
  });

  const fy = out.years[0];
  const message = fy
    ? `Gewichtete Pipeline ${fmtEuro(fy.open)} und Forecast ${fmtEuro(fy.fc)} bis Dez ${fy.year}`
    : undefined;

  return (
    <Tile title="Ausblick nach Abschlussmonat" sub={sub} message={message} tools={tools}>
      <div className="flex flex-wrap items-center gap-x-400 gap-y-100 pb-200 text-200 text-muted-foreground">
        <ScenarioTag code="AC">Gewonnen (Ist)</ScenarioTag>
        <ScenarioTag code="PL">Gewichtete offene Pipeline</ScenarioTag>
        <ScenarioTag code="FC">Forecast (Erfolgsflag)</ScenarioTag>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="group" aria-label="Ausblick nach Abschlussmonat">
        <IbcsDefs uid={uid} />
        {cols.map((c, i) => {
          const gx = X0 + i * gw + (gw - (3 * bw + 2)) / 2;
          const vals: { v: number; paint: typeof ac; name: string; ink: string }[] = [
            { v: fin(c.won), paint: ac, name: 'Gewonnen', ink: C.ac },
            { v: fin(c.open), paint: pl, name: 'Gewichtete Pipeline', ink: C.ac },
            { v: fin(c.fc), paint: fcp, name: 'Forecast', ink: C.fcInk },
          ];
          const label = c.year === 0 ? 'Überfällige offene Angebote (Abschluss vor Stichtag)' : `${c.label}${mode === 'quarter' ? ' ' + c.year : ''}`;
          return (
            <g key={c.key}>
              <title>{`${label}\nGewonnen: ${fmtEuro(c.won)}\nGewichtete Pipeline: ${fmtEuro(c.open)}\nForecast: ${fmtEuro(c.fc)}`}</title>
              {vals.map((s, j) => {
                if (s.v <= 0) return null;
                const x = gx + j * (bw + 1);
                const top = scale(s.v);
                return (
                  <g key={s.name}>
                    <rect x={x} y={top} width={bw} height={Math.max(0.5, BASE - top)} fill={s.paint.fill} stroke={s.paint.stroke} strokeWidth={s.paint.strokeWidth} />
                    {s.v >= minLabel && (
                      <text transform={`translate(${x + bw / 2 + 3.5},${top - 3}) rotate(-90)`} fontSize={9} fill={s.ink}>
                        {fmtK(s.v)}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={X0 + i * gw + gw / 2} y={BASE + 13} textAnchor="middle" fontSize={mode === 'month' ? 9.5 : 10.5} fill={C.cat}>
                {c.label}
              </text>
            </g>
          );
        })}
        <RefAxis code="AC" orient="h" at={BASE} from={X0} to={x1} />

        {/* year separators and labels */}
        {spans.map((s, k) => {
          const xa = X0 + s.from * gw;
          const xb = X0 + (s.to + 1) * gw;
          return (
            <g key={s.year}>
              {k > 0 && <line x1={xa} x2={xa} y1={PLOT_T - 8} y2={H - 6} stroke={C.hair} strokeWidth={0.8} strokeDasharray="2 3" />}
              <text x={(xa + xb) / 2} y={BASE + 32} textAnchor="middle" fontSize={11} fontWeight={600} fill={C.cat}>
                {s.year === 0 ? 'vor Stichtag' : s.year}
              </text>
            </g>
          );
        })}

        {/* totals per year */}
        <g>
          <text x={x1 + 18} y={16} fontSize={10} fontWeight={600} fill={C.sub}>
            Summe je Jahr (Tsd. €)
          </text>
          {out.years.map((y, k) => {
            const ty = 36 + k * 70;
            const line = (row: number, p: typeof ac, name: string, v: number, ink: string) => (
              <g key={name} transform={`translate(0,${row * 15})`}>
                <rect x={x1 + 18} y={ty + 5} width={9} height={9} fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} />
                <text x={x1 + 32} y={ty + 13} fontSize={10} fill={C.cat}>
                  {name}
                </text>
                <text x={W - 4} y={ty + 13} textAnchor="end" fontSize={10.5} fill={ink}>
                  {fmtK(v)}
                </text>
              </g>
            );
            return (
              <g key={y.year}>
                <text x={x1 + 18} y={ty} fontSize={11} fontWeight={700} fill={C.ac}>
                  {y.year}
                </text>
                {line(0, ac, 'Gewonnen', y.won, C.ac)}
                {line(1, pl, 'Gew. Pipeline', y.open, C.ac)}
                {line(2, fcp, 'Forecast', y.fc, C.fcInk)}
              </g>
            );
          })}
        </g>
      </svg>
    </Tile>
  );
}
