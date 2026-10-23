import { useId, useMemo } from 'react';

import type { MonatsWert } from '@/lib/pnl/data';
import { evalFormula, type KontoRow, type Line } from '@/lib/pnl/engine';
import { fmtDelta, fmtValue, monthLabel, type Unit } from '@/lib/pnl/format';

import { HatchDefs, ScenarioLabel } from './ibcs';

interface Props {
  line: Line;
  konten: KontoRow[];
  monate: MonatsWert[];
  lastActual: string;
  unit: Unit;
}

interface Point {
  monat: string;
  actual: boolean;
  value: number; // AC or FC
  pl: number;
  py: number;
}

/** Monthly IBCS column chart: AC solid, FC hatched, PL outlined, PY grey, ΔPL below. */
export function TrendChart({ line, konten, monate, lastActual, unit }: Props) {
  const uid = useId().replace(/:/g, '');

  const points: Point[] = useMemo(() => {
    const months = [...new Set(monate.map((m) => m.monat))].sort();
    const formulaOf = new Map(konten.map((k) => [k.name, k.formula]));
    const typeOf = new Map(konten.filter((k) => !k.parent).map((k) => [k.name, k.rowType]));
    return months.map((monat) => {
      const rows = monate.filter((m) => m.monat === monat);
      const get = (key: 'fc' | 'pl' | 'py') => {
        const memo = new Map<string, number>();
        const val = (name: string): number => {
          if (memo.has(name)) return memo.get(name)!;
          const t = typeOf.get(name);
          const v =
            t === 'Formula' || t === 'KPI'
              ? evalFormula(formulaOf.get(name) ?? '', val)
              : rows.filter((r) => r.line === name).reduce((a, r) => a + r[key], 0);
          memo.set(name, v);
          return v;
        };
        return line.displaySign * val(line.name);
      };
      return { monat, actual: monat <= lastActual, value: get('fc'), pl: get('pl'), py: get('py') };
    });
  }, [monate, konten, line, lastActual]);

  if (points.length === 0) return null;

  const W = 760;
  const H = 250;
  const padL = 8;
  const padR = 8;
  const topY = 26;
  const baseY = 160; // zero line of the main chart
  const varTop = 196; // variance strip centre
  const slot = (W - padL - padR) / points.length;
  const bw = Math.min(30, slot * 0.46);
  const maxV = Math.max(1, ...points.flatMap((p) => [Math.abs(p.value), Math.abs(p.pl), Math.abs(p.py)]));
  const sy = (v: number) => (Math.abs(v) / maxV) * (baseY - topY);
  const maxD = Math.max(1, ...points.map((p) => Math.abs(p.value - p.pl)));
  const sd = (v: number) => (Math.abs(v) / maxD) * 22;
  const sum = points.reduce((a, p) => a + p.value, 0);
  const sumPl = points.reduce((a, p) => a + p.pl, 0);
  // For cost lines (displayed inverted) a higher shown value is bad.
  const goodIfUp = line.displaySign === 1;

  return (
    <div className="rounded-lg border border-border bg-card p-400">
      <div className="flex flex-wrap items-baseline justify-between gap-200">
        <div>
          <h2 className="font-heading text-400 font-semibold">{line.name} im Monatsverlauf</h2>
          <p className="text-200 text-muted-foreground">
            Summe {fmtValue(sum, unit)} · ΔPL{' '}
            <span className={(sum - sumPl >= 0) === goodIfUp ? 'text-good' : 'text-bad'}>{fmtDelta(sum - sumPl, unit)}</span>{' '}
            · in {unit === 'mio' ? 'Mio. €' : 'Tsd. €'} · Zeile in der Tabelle anklicken zum Wechseln
          </p>
        </div>
        <div className="flex flex-wrap gap-300">
          <ScenarioLabel s="PY" />
          <ScenarioLabel s="AC" />
          <ScenarioLabel s="FC" />
          <ScenarioLabel s="PL" />
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-200 block h-auto w-full" role="img" aria-label={`${line.name} je Monat`}>
        <HatchDefs id={uid} />
        {points.map((p, i) => {
          const cx = padL + slot * i + slot / 2;
          const x = cx - bw / 2;
          const h = sy(p.value);
          const hPl = sy(p.pl);
          const hPy = sy(p.py);
          const d = p.value - p.pl;
          const good = (d >= 0) === goodIfUp;
          const dh = sd(d);
          return (
            <g key={p.monat}>
              <title>{`${monthLabel(p.monat)}: ${p.actual ? 'AC' : 'FC'} ${fmtValue(p.value, unit)}, PL ${fmtValue(p.pl, unit)}, PY ${fmtValue(p.py, unit)}`}</title>
              {/* PY grey, offset left behind */}
              <rect x={x - bw * 0.28} y={baseY - hPy} width={bw} height={hPy} fill="var(--color-py)" opacity={0.55} />
              {/* AC solid or FC hatched */}
              <rect
                x={x}
                y={baseY - h}
                width={bw}
                height={h}
                fill={p.actual ? 'var(--color-ac)' : `url(#${uid}-fc)`}
                stroke="var(--color-fc)"
                strokeWidth={p.actual ? 0 : 1}
              />
              {/* PL outline */}
              <rect x={x + bw * 0.28} y={baseY - hPl} width={bw} height={hPl} fill="none" stroke="var(--color-pl)" strokeWidth={1.2} />
              <text x={cx} y={baseY - Math.max(h, hPl) - 5} textAnchor="middle" fontSize={10} className="fill-foreground tabular">
                {fmtValue(p.value, unit)}
              </text>
              <text x={cx} y={baseY + 14} textAnchor="middle" fontSize={11} className="fill-muted-foreground">
                {monthLabel(p.monat)}
              </text>
              {/* ΔPL variance column */}
              <rect
                x={cx - bw * 0.35}
                y={d >= 0 ? varTop - dh : varTop}
                width={bw * 0.7}
                height={dh}
                fill={good ? 'var(--color-good)' : 'var(--color-bad)'}
              />
              <text
                x={cx}
                y={d >= 0 ? varTop + 12 : varTop - 4}
                textAnchor="middle"
                fontSize={9}
                className={good ? 'fill-good' : 'fill-bad'}
              >
                {fmtDelta(d, unit)}
              </text>
            </g>
          );
        })}
        <line x1={padL} x2={W - padR} y1={baseY} y2={baseY} stroke="var(--color-foreground)" strokeWidth={1.2} />
        <line x1={padL} x2={W - padR} y1={varTop} y2={varTop} stroke="var(--color-foreground)" strokeWidth={0.8} />
        <text x={padL} y={varTop + 30} fontSize={10} className="fill-muted-foreground">
          ΔPL je Monat
        </text>
        {(() => {
          const lastIdx = points.findIndex((p) => !p.actual);
          if (lastIdx <= 0) return null;
          const x = padL + slot * lastIdx;
          return (
            <g>
              <line x1={x} x2={x} y1={topY - 16} y2={baseY + 20} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" />
              <text x={x + 4} y={topY - 8} fontSize={10} className="fill-muted-foreground">
                Forecast ab {monthLabel(points[lastIdx].monat)}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
