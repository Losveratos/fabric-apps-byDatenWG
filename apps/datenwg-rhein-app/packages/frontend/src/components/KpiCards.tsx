// Overview KPI row (ChartKitchen IBCS card): status accent, AC value of the
// selection, Δ pill vs REF 1817 bis 1920 (same months), ΔREF row with a pin
// on one shared scale, sparkline of the decade series against the REF level.
// Click = select the KPI for every chart.

import { useId } from 'react';

import { IbcsDefs, PinHead, VariancePill } from '@/components/ibcs/Ibcs';
import { pillText, REF_LABEL } from '@/components/overview/shared';
import { useRhein } from '@/hooks/rhein.context';
import { C, relCap } from '@/lib/ibcs/notation';
import { fmt, fmtDelta, fmtRel, relDelta, unitLabel } from '@/lib/rhein/format';
import { favourable, KPIS, type KpiDef } from '@/lib/rhein/kpis';
import { cn } from '@/lib/utils';

const fin = (v: number) => Number.isFinite(v);

export function KpiCards() {
  const { total, ref } = useRhein();
  const vals = KPIS.map((k) => ({ k, ac: total(k), r: ref(k) }));
  const scale = relCap(vals.map((v) => favourable(v.k, relDelta(v.ac, v.r))));
  return (
    <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5" data-testid="kpi-cards">
      {vals.map((v) => (
        <KpiCard key={v.k.id} kpi={v.k} ac={v.ac} refV={v.r} scale={scale} />
      ))}
    </div>
  );
}

function DeltaRow({ kpi, ac, refV, scale, uid }: { kpi: KpiDef; ac: number; refV: number; scale: number; uid: string }) {
  const W = 90;
  const half = W / 2;
  const d = ac - refV;
  const rel = relDelta(ac, refV);
  const has = fin(ac) && fin(refV);
  const good = favourable(kpi, d) >= 0;
  const fr = favourable(kpi, rel);
  const capped = fin(fr) && Math.abs(fr) > scale;
  const len = fin(fr) ? Math.min(half - 6, (Math.abs(fr) / (scale || 1)) * (half - 6)) : 0;
  const px = fr >= 0 ? half + len : half - len;
  const col = good ? C.good : C.bad;
  return (
    <div className="grid grid-cols-[38px_1fr_auto] items-center gap-200 text-200" data-delta-row="REF">
      <span className="font-monospace text-100 text-muted-foreground">ΔREF</span>
      <svg viewBox={`0 0 ${W} 14`} className="h-[14px] w-full" aria-hidden="true">
        <line x1={half} x2={half} y1={0} y2={14} stroke={C.py} strokeWidth={3} />
        {has && fin(fr) && (
          <>
            <line x1={half} x2={px} y1={7} y2={7} stroke={col} strokeWidth={2} />
            {capped ? (
              <path d={fr >= 0 ? `M${px},3 L${px + 6},7 L${px},11 Z` : `M${px},3 L${px - 6},7 L${px},11 Z`} fill={col} />
            ) : (
              <PinHead cx={px} cy={7} r={3.2} good={good} minuend="AC" uid={uid} />
            )}
          </>
        )}
      </svg>
      <span className={cn('text-right tabular', !has && 'text-muted-foreground')} style={{ color: has ? col : undefined }}>
        {has ? fmtDelta(kpi, d) : 'n. a.'}
      </span>
    </div>
  );
}

function KpiCard({ kpi, ac, refV, scale }: { kpi: KpiDef; ac: number; refV: number; scale: number }) {
  const { view, setView, selectionText } = useRhein();
  const uid = 'k' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const selected = view.kpi === kpi.id;
  const d = ac - refV;
  const rel = relDelta(ac, refV);
  const has = fin(ac) && fin(refV);
  const good = favourable(kpi, d) >= 0;

  return (
    <button
      type="button"
      onClick={() => setView({ kpi: kpi.id })}
      aria-pressed={selected}
      aria-label={`${kpi.label}: AC ${fmt(kpi, ac)}${has ? `, ΔREF ${fmtDelta(kpi, d)}, ΔREF% ${fmtRel(rel)}` : ''}`}
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
          <div className="truncate text-100 text-muted-foreground">
            {kpi.unit === 'pct' ? 'Anteil Tage' : unitLabel(kpi)} · AC {selectionText}
          </div>
        </div>
        {has && (
          <VariancePill value={rel} good={good}>
            {pillText(kpi, ac, refV)}
          </VariancePill>
        )}
      </div>
      <div className="mt-100 flex items-end justify-between gap-200">
        <span className="font-numeric text-hero-700 leading-hero-700 font-bold tabular">{fmt(kpi, ac)}</span>
        <Sparkline kpi={kpi} good={!has || good} />
      </div>
      <div className="mt-200 flex flex-col gap-100">
        <DeltaRow kpi={kpi} ac={ac} refV={refV} scale={scale} uid={uid} />
      </div>
      <div className="mt-100 truncate text-100 text-muted-foreground tabular">
        {REF_LABEL}: {fmt(kpi, refV)} · ΔREF% {fmtRel(rel)}
      </div>
    </button>
  );
}

/** Decade series AC (solid) against the REF level (grey); dots mark decades in the epoch selection. */
function Sparkline({ kpi, good }: { kpi: KpiDef; good: boolean }) {
  const { series } = useRhein();
  const pts = series(kpi, 'decade');
  const ac = pts.map((p) => p.ac);
  const refV = pts.find((p) => fin(p.ref))?.ref ?? NaN;
  const all = [...ac, refV].filter(fin);
  if (all.length < 2) return null;
  const W = 96;
  const H = 32;
  const n = pts.length;
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const x = (i: number) => 2 + (i / Math.max(1, n - 1)) * (W - 6);
  const y = (v: number) => H - 3 - ((v - lo) / (hi - lo || 1)) * (H - 6);
  let d = '';
  let pen = false;
  ac.forEach((v, i) => {
    if (!fin(v)) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    pen = true;
  });
  const lastI = ac.map(fin).lastIndexOf(true);
  const partial = pts.some((p) => !p.active);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[32px] w-[96px] shrink-0" aria-hidden="true">
      {fin(refV) && <line x1={2} x2={W - 4} y1={y(refV)} y2={y(refV)} stroke={C.py} strokeWidth={2} />}
      {d && <path d={d.trim()} fill="none" stroke={C.ac} strokeWidth={1.6} />}
      {partial && pts.map((p, i) => (p.active && fin(p.ac) ? <circle key={p.key} cx={x(i)} cy={y(p.ac)} r={1.6} fill={C.ac} /> : null))}
      {lastI >= 0 && <circle cx={x(lastI)} cy={y(ac[lastI])} r={2.6} fill={good ? C.good : C.bad} />}
    </svg>
  );
}
