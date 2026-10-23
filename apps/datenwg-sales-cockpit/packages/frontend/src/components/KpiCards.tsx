// Overview KPI row (ChartKitchen IBCS card): status accent, hero AC value,
// Δ pill vs PY, PY row with pin on one shared scale, 12-month sparkline
// AC vs PY. Click = select KPI for every chart (overview → zoom).

import { useId, useMemo } from 'react';

import { IbcsDefs, PinHead, VariancePill } from '@/components/ibcs/Ibcs';
import { useSales } from '@/hooks/sales.context';
import { fmt, fmtDelta, fmtRel, relDelta, unitLabel } from '@/lib/sales/format';
import { favourable, HEADLINE, KPI_BY_ID, type KpiDef } from '@/lib/sales/kpis';
import { C, relCap } from '@/lib/ibcs/notation';
import { cn } from '@/lib/utils';

export function KpiCards() {
  const { total, pyYear } = useSales();
  const cards = HEADLINE.map((id) => KPI_BY_ID[id]);
  const scale = useMemo(
    () => relCap(cards.map((k) => favourable(k, relDelta(total(k), total(k, { year: pyYear }))))),
    [cards, total, pyYear]
  );
  return (
    <div className="grid grid-cols-2 gap-[18px] md:grid-cols-3 2xl:grid-cols-6">
      {cards.map((k) => (
        <KpiCard key={k.id} kpi={k} scale={scale} />
      ))}
    </div>
  );
}

function KpiCard({ kpi, scale }: { kpi: KpiDef; scale: number }) {
  const { view, setView, total, pyYear, year } = useSales();
  const uid = useId().replace(/:/g, '');
  const selected = view.kpi === kpi.id;
  const ac = total(kpi);
  const py = total(kpi, { year: pyYear });
  const d = ac - py;
  const rel = relDelta(ac, py);
  const good = favourable(kpi, d) >= 0;
  const has = Number.isFinite(ac) && Number.isFinite(py);
  const W = 90;
  const half = W / 2;
  const fr = favourable(kpi, rel);
  const capped = Number.isFinite(fr) && Math.abs(fr) > scale;
  const len = Number.isFinite(fr) ? Math.min(half - 6, (Math.abs(fr) / (scale || 1)) * (half - 6)) : 0;
  const px = fr >= 0 ? half + len : half - len;

  return (
    <button
      type="button"
      onClick={() => setView({ kpi: kpi.id })}
      aria-pressed={selected}
      title={kpi.info}
      className={cn(
        'tile relative overflow-hidden p-300 pl-400 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring',
        selected && 'ring-2 ring-primary'
      )}
    >
      <svg width={0} height={0} className="absolute" aria-hidden="true">
        <IbcsDefs uid={uid} />
      </svg>
      <span
        aria-hidden="true"
        className="absolute top-[7px] bottom-[7px] left-[6px] w-[4px] rounded-full"
        style={{ background: has ? (good ? C.good : C.bad) : 'var(--color-border)' }}
      />
      <div className="flex items-start justify-between gap-200">
        <div className="min-w-0">
          <div className="truncate text-100 font-semibold tracking-[0.06em] text-muted-foreground uppercase">{kpi.label}</div>
          <div className="text-100 text-muted-foreground">
            {unitLabel(kpi)} · AC {year}
            {kpi.warning && (
              <span className="ml-100 text-warm" title={kpi.warning}>
                ⚠
              </span>
            )}
          </div>
        </div>
        {has && (
          <VariancePill value={rel} good={good}>
            {kpi.unit === 'pct' ? fmtDelta(kpi, d) : fmtRel(rel)}
          </VariancePill>
        )}
      </div>
      <div className="mt-100 flex items-end justify-between gap-200">
        <span className="font-numeric text-hero-700 leading-hero-700 font-bold tabular">{fmt(kpi, ac)}</span>
        <Sparkline kpi={kpi} good={good} />
      </div>
      <div className="mt-200 grid grid-cols-[34px_1fr_auto] items-center gap-200 text-200" title={`PY ${pyYear}: ${fmt(kpi, py)}`}>
        <span className="font-monospace text-100 text-muted-foreground">ΔPY</span>
        <svg viewBox={`0 0 ${W} 14`} className="h-[14px] w-full" aria-hidden="true">
          <line x1={half} x2={half} y1={0} y2={14} stroke={C.py} strokeWidth={3} />
          {Number.isFinite(fr) && (
            <>
              <line x1={half} x2={px} y1={7} y2={7} stroke={good ? C.good : C.bad} strokeWidth={2} />
              {capped ? (
                <path d={fr >= 0 ? `M${px},3 L${px + 6},7 L${px},11 Z` : `M${px},3 L${px - 6},7 L${px},11 Z`} fill={good ? C.good : C.bad} />
              ) : (
                <PinHead cx={px} cy={7} r={3.2} good={good} minuend="AC" uid={uid} />
              )}
            </>
          )}
        </svg>
        <span className="text-right tabular" style={{ color: has ? (good ? C.good : C.bad) : undefined }}>
          {fmtDelta(kpi, d)}
        </span>
      </div>
      <div className="mt-100 text-100 text-muted-foreground tabular">
        PY {fmt(kpi, py)}
      </div>
    </button>
  );
}

function Sparkline({ kpi, good }: { kpi: KpiDef; good: boolean }) {
  const { monthly, pyYear, lastClosed } = useSales();
  const ac = monthly(kpi);
  const py = monthly(kpi, { year: pyYear });
  const all = [...ac, ...py].filter(Number.isFinite);
  if (all.length < 2) return null;
  const W = 84;
  const H = 30;
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const x = (i: number) => 2 + (i / 11) * (W - 6);
  const y = (v: number) => H - 3 - ((v - lo) / (hi - lo || 1)) * (H - 6);
  const last = Math.max(0, (lastClosed || 12) - 1);
  const path = (vals: number[], to: number) =>
    vals
      .map((v, i) => (i <= to && Number.isFinite(v) ? `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}` : ''))
      .join(' ')
      .replace(/^ *L/, 'M');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[30px] w-[84px] shrink-0" aria-hidden="true">
      <path d={path(py, 11)} fill="none" stroke={C.py} strokeWidth={1.4} />
      <path d={path(ac, last)} fill="none" stroke={C.ac} strokeWidth={2} />
      {Number.isFinite(ac[last]) && <circle cx={x(last)} cy={y(ac[last])} r={2.6} fill={good ? C.good : C.bad} />}
    </svg>
  );
}
