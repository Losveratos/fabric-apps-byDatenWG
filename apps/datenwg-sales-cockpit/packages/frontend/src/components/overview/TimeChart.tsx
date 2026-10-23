// IBCS monthly time series tile (ChartKitchen grammar): all 12 months of the
// analysis year for the selected KPI, AC against PY. Months after the last
// closed month (current snapshot year) are drawn faded as "noch offen".
// Variants: integrated variance analysis (ΔPY% pins, ΔPY bridge, AC/PY
// columns with total band) and cumulative lines. Zoomed, the integrated
// chart can be split into small multiples per member of a dimension.

import { ArrowLeft } from 'lucide-react';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

import { ScenarioTag, VariancePill } from '@/components/ibcs/Ibcs';
import { Switch, Tile } from '@/components/Tile';
import { useSales } from '@/hooks/sales.context';
import { C, makeScale } from '@/lib/ibcs/notation';
import { fmt, fmtDelta, fmtRel, MONTH_SHORT, periodLabel, relDelta, unitLabel } from '@/lib/sales/format';
import { favourable, type KpiDef } from '@/lib/sales/kpis';
import { DIM_LABEL, sumMonths, type Dim } from '@/lib/sales/model';

import { ALL_MONTHS, BIG, buildRows, COMPACT, cxOf, extentOf, fin, layoutOf, mergeExtents, slotOf, type BandData, type VRow } from './varint';
import { CatLabels, Divider, VarIntChart } from './VarIntChart';

const G = BIG;
const SLOT = slotOf(G);
const HOVER = 'var(--color-hover)';

const upTo = (m: number) => Array.from({ length: m }, (_, i) => i + 1);

type Variant = 'integrated' | 'cumulative';
type ZoomMode = 'single' | 'multiples';
type MultDim = Extract<Dim, 'vertriebler' | 'bundesland' | 'gruppe' | 'typ' | 'kunde'>;
type MultScale = 'shared' | 'own';

const VARIANTS: { id: Variant; label: string; title: string }[] = [
  { id: 'integrated', label: 'Integriert', title: 'ΔPY%, ΔPY-Brücke und Werte untereinander' },
  { id: 'cumulative', label: 'Kumuliert', title: 'Kumulierter Verlauf ab Januar' },
];
const ZOOM_MODES: { id: ZoomMode; label: string; title: string }[] = [
  { id: 'single', label: 'Einzeln', title: 'Ein Diagramm für die aktuelle Auswahl' },
  { id: 'multiples', label: 'Small Multiples', title: 'Ein kleines Diagramm je Element einer Dimension' },
];
const MULT_DIMS: { id: MultDim; label: string }[] = [
  { id: 'vertriebler', label: 'Vertriebler' },
  { id: 'bundesland', label: 'Bundesland' },
  { id: 'gruppe', label: 'Produktgruppe' },
  { id: 'typ', label: 'Produkttyp' },
  { id: 'kunde', label: 'Top 12 Kunden' },
];
const MULT_SCALES: { id: MultScale; label: string; title: string }[] = [
  { id: 'shared', label: 'gemeinsam', title: 'Gleicher Maßstab in allen Kacheln (vergleichbare Höhen)' },
  { id: 'own', label: 'je Kachel', title: 'Eigener Maßstab je Kachel (Muster statt Größe)' },
];
/** IBCS: small multiples work up to about 25 charts. */
const MAX_CARDS = 24;
const TOP_CUSTOMERS = 12;

const onKey = (e: KeyboardEvent, act: () => void) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    act();
  }
};

// ---------- cumulative variant ----------

/** Cumulative lines: AC solid, PY grey, bracket with Δ at the last closed month. */
function LineTier({ kpi, rows, A, R, plotH, lastClosed }: { kpi: KpiDef; rows: VRow[]; A: number[]; R: number[]; plotH: number; lastClosed: number }) {
  const y0 = G.CAP;
  const cx = (m: number) => cxOf(G, m);
  const s = makeScale([...A, ...R], [y0 + plotH - 16, y0 + 18], 0.1);
  const segOpacity = (i: number) => Math.min(rows[i].op, rows[i + 1].op);
  const segs = (vals: number[], render: (i: number, x1: number, y1: number, x2: number, y2: number) => ReactNode) =>
    vals.slice(0, 11).map((v, i) => (fin(v) && fin(vals[i + 1]) ? render(i, cx(i + 1), s(v), cx(i + 2), s(vals[i + 1])) : null));

  const lm = lastClosed >= 1 ? Math.min(12, lastClosed) : 0;
  const a = lm ? A[lm - 1] : NaN;
  const r = lm ? R[lm - 1] : NaN;
  const dEnd = a - r;
  const goodEnd = favourable(kpi, dEnd) >= 0;
  const bx = cx(lm || 12) + 12;
  const above = !fin(r) || a >= r;

  return (
    <g>
      {segs(R, (i, x1, y1, x2, y2) => (
        <line key={`r${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.py} strokeWidth={2} opacity={segOpacity(i)} />
      ))}
      {R.map((v, i) => (fin(v) ? <circle key={`rp${i}`} cx={cx(i + 1)} cy={s(v)} r={2.5} fill={C.py} opacity={rows[i].op} /> : null))}
      {segs(A, (i, x1, y1, x2, y2) => (
        <line key={`a${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ac} strokeWidth={2} opacity={segOpacity(i)} />
      ))}
      {A.map((v, i) => (fin(v) ? <circle key={`ap${i}`} cx={cx(i + 1)} cy={s(v)} r={3} fill={C.ac} opacity={rows[i].op} /> : null))}
      {lm > 0 && fin(a) && (
        <text x={cx(lm)} y={above ? s(a) - 8 : s(a) + 16} textAnchor="middle" fontSize={11} fontWeight={600} fill={C.ac}>
          {fmt(kpi, a)}
        </text>
      )}
      {lm > 0 && fin(r) && (
        <text x={cx(lm)} y={above ? s(r) + 16 : s(r) - 8} textAnchor="middle" fontSize={11} fill={C.sub}>
          {fmt(kpi, r)}
        </text>
      )}
      {fin(dEnd) && (
        <g>
          <path d={`M${bx - 4},${s(a)} H${bx} V${s(r)} H${bx - 4}`} fill="none" stroke={goodEnd ? C.good : C.bad} strokeWidth={1.5} />
          <text x={bx + 5} y={(s(a) + s(r)) / 2 - 2} fontSize={10} fontWeight={700} fill={goodEnd ? C.good : C.bad}>
            {fmtDelta(kpi, dEnd)}
          </text>
          {fin(relDelta(a, r)) && (
            <text x={bx + 5} y={(s(a) + s(r)) / 2 + 10} fontSize={10} fill={goodEnd ? C.good : C.bad}>
              {fmtRel(relDelta(a, r))}
            </text>
          )}
        </g>
      )}
      <CatLabels g={G} rows={rows} y={y0 + plotH + 13} allSel={rows.every((x) => x.sel)} />
    </g>
  );
}

// ---------- small multiples ----------

interface Card {
  member: string;
  rows: VRow[];
  band: BandData;
}

function Multiples({ uid, dim, scale, onPick }: { uid: string; dim: MultDim; scale: MultScale; onPick: (member: string) => void }) {
  const { kpi, year, pyYear, months, lastClosed, filter, agg } = useSales();
  const f = { ...filter };
  delete f[dim];
  const acMap = agg(year, f, dim);
  const pyMap = agg(pyYear, f, dim);
  const missing = kpi.additive ? 0 : NaN;
  const per = periodLabel(months, year).replace(` ${year}`, '');
  const selected = filter[dim] ?? [];

  const all: Card[] = [...new Set([...acMap.keys(), ...pyMap.keys()])].map((member) => {
    const ac = acMap.get(member);
    const py = pyMap.get(member);
    const acM = ALL_MONTHS.map((m) => (ac ? kpi.value(ac[m - 1]) : missing));
    const pyM = ALL_MONTHS.map((m) => (py ? kpi.value(py[m - 1]) : missing));
    return {
      member,
      rows: buildRows(kpi, acM, pyM, lastClosed, months),
      band: {
        tot: ac ? kpi.value(sumMonths(ac, months)) : missing,
        refTot: py ? kpi.value(sumMonths(py, months)) : missing,
        label: kpi.additive ? `Σ ${per}` : per,
      },
    };
  });
  // AC of the period, descending; undefined values last.
  all.sort((a, b) => (fin(b.band.tot) ? b.band.tot : -Infinity) - (fin(a.band.tot) ? a.band.tot : -Infinity) || a.member.localeCompare(b.member));
  const limit = dim === 'kunde' ? TOP_CUSTOMERS : MAX_CARDS;
  const cards = all.slice(0, limit);
  const rest = all.length - cards.length;
  const extents = cards.map((c) => extentOf(kpi, c.rows, c.band));
  const shared = scale === 'shared' ? mergeExtents(extents) : null;

  if (!cards.length) return <p className="py-600 text-center text-300 text-muted-foreground">Keine Daten für die aktuelle Auswahl.</p>;

  return (
    <div>
      <p className="mb-300 text-200 text-muted-foreground">
        {DIM_LABEL[dim]} nach AC {per} {year} absteigend ·{' '}
        {shared ? 'gemeinsamer Maßstab in allen Kacheln (Höhen vergleichbar)' : 'eigener Maßstab je Kachel (Höhen nicht vergleichbar)'} · Klick zeigt das
        Element einzeln
        {rest > 0 && ` · ${rest} weitere nicht gezeigt`}
      </p>
      <ul className="grid grid-cols-1 gap-300 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label={`Small Multiples je ${DIM_LABEL[dim]}`}>
        {cards.map((c, i) => {
          const d = c.band.tot - c.band.refTot;
          const good = favourable(kpi, d) >= 0;
          const rel = relDelta(c.band.tot, c.band.refTot);
          const on = selected.includes(c.member);
          return (
            <li key={c.member}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={`${c.member}: AC ${fmt(kpi, c.band.tot)}; PY ${fmt(kpi, c.band.refTot)}; ΔPY% ${fmtRel(rel)}. Einzeln anzeigen`}
                onClick={() => onPick(c.member)}
                className={
                  'flex w-full flex-col gap-100 rounded-md border p-200 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring ' +
                  (on ? 'border-ring' : 'border-border')
                }
              >
                <span className="flex w-full items-baseline justify-between gap-200">
                  <span className="truncate text-200 font-semibold" title={c.member}>
                    {c.member}
                  </span>
                  <span className="flex shrink-0 items-center gap-200">
                    <span className="font-monospace text-200 font-bold tabular-nums">{fmt(kpi, c.band.tot)}</span>
                    <VariancePill value={rel} good={good}>
                      {fmtRel(rel, Math.abs(rel) < 0.1 ? 1 : 0)}
                    </VariancePill>
                  </span>
                </span>
                <VarIntChart
                  uid={`${uid}m${i}`}
                  kpi={kpi}
                  rows={c.rows}
                  band={c.band}
                  lastClosed={lastClosed}
                  geom={COMPACT}
                  extent={shared ?? extents[i]}
                  allSel={c.rows.every((r) => r.sel)}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- tile ----------

export function TimeChart() {
  const { view, setView, months, kpi, year, pyYear, lastClosed, monthly, total, filter, toggleMember } = useSales();
  const uid = 'tc' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [hot, setHot] = useState<{ m: number; focus: boolean } | null>(null);
  // Zoom-only state, kept here so it survives closing and reopening the zoom.
  const [zoomMode, setZoomMode] = useState<ZoomMode>('single');
  const [multDim, setMultDim] = useState<MultDim>('vertriebler');
  const [multScale, setMultScale] = useState<MultScale>('shared');
  const [drill, setDrill] = useState<{ dim: MultDim; member: string } | null>(null);

  // Stored 'columns' / 'line' from older links fall back to the integrated chart.
  const variant: Variant = view.timeVariant === 'cumulative' ? 'cumulative' : 'integrated';
  const acM = monthly(kpi, { year });
  const pyM = monthly(kpi, { year: pyYear });
  const rows = buildRows(kpi, acM, pyM, lastClosed, months);
  const allSel = months.length === 12;

  // Period totals (selected months).
  const tot = total(kpi);
  const refTot = total(kpi, { year: pyYear });
  const per = periodLabel(months, year);
  const perShort = per.replace(` ${year}`, '');
  const band: BandData = { tot, refTot, label: kpi.additive ? `Σ ${perShort}` : perShort };

  const sub = `${unitLabel(kpi)} · AC vs PY · ${year}`;

  const dT = tot - refTot;
  const relT = relDelta(tot, refTot);
  let message: ReactNode = null;
  if (fin(dT)) {
    const usePP = kpi.unit === 'pct' || !fin(relT);
    const mag = (usePP ? fmtDelta(kpi, Math.abs(dT)) : fmtRel(Math.abs(relT))).replace(/^[+−]/, '');
    const level = mag.startsWith('±');
    message = level ? (
      <>
        {kpi.label} {per} liegt auf Höhe von PY
      </>
    ) : (
      <>
        {kpi.label} {per} liegt <span style={{ color: favourable(kpi, dT) >= 0 ? C.good : C.bad }}>{mag}</span> {dT > 0 ? 'über' : 'unter'} PY
      </>
    );
  }

  // Interaction.
  const reset = () => setView({ period: 'fy' });
  const pick = (m: number) => {
    if (view.period === 'month' && view.month === m) reset();
    else setView({ period: 'month', month: m });
  };
  const tip = (r: VRow) =>
    [
      `${MONTH_SHORT[r.m - 1]} ${year}${r.open ? ' (noch offen)' : ''}`,
      `AC ${fmt(kpi, r.a)}`,
      `PY ${fmt(kpi, r.r)}`,
      `ΔPY ${fmtDelta(kpi, r.d)}`,
      `ΔPY% ${fmtRel(r.rel)}`,
    ].join('\n');

  const pickMember = (dim: MultDim, member: string) => {
    const cur = filter[dim] ?? [];
    if (cur.length === 0) toggleMember(dim, member);
    else if (!(cur.length === 1 && cur[0] === member)) setView({ filter: { ...filter, [dim]: [member] } });
    setDrill({ dim, member });
    setZoomMode('single');
  };
  const drillActive = drill !== null && (filter[drill.dim] ?? []).includes(drill.member);
  const back = () => {
    if (drill && drillActive) toggleMember(drill.dim, drill.member);
    setDrill(null);
    setZoomMode('multiples');
  };

  const layout = layoutOf(G);
  const showBand = variant === 'integrated';
  const H = showBand ? layout.H : G.CAP + 240 + G.CAT;

  const underlay = hot && (
    <rect
      x={hot.m === 0 ? G.BAND_X : G.X0 + (hot.m - 1) * SLOT}
      y={0}
      width={hot.m === 0 ? G.BAND_W : SLOT}
      height={H}
      fill={HOVER}
      stroke={hot.focus ? C.hilite : 'none'}
      strokeWidth={1}
    />
  );

  // Hit areas: one focusable slot per month, plus the total band.
  const overlay = (
    <>
      {rows.map((r) => (
        <rect
          key={`hit${r.m}`}
          data-month={r.m}
          x={G.X0 + (r.m - 1) * SLOT}
          y={0}
          width={SLOT}
          height={H}
          fill="transparent"
          tabIndex={0}
          role="button"
          aria-pressed={view.period === 'month' && view.month === r.m}
          aria-label={`${MONTH_SHORT[r.m - 1]} ${year}: AC ${fmt(kpi, r.a)}; PY ${fmt(kpi, r.r)}${r.open ? '; noch offen' : ''}`}
          style={{ cursor: 'pointer', outline: 'none' }}
          onClick={() => pick(r.m)}
          onKeyDown={(e) => onKey(e, () => pick(r.m))}
          onMouseEnter={() => setHot({ m: r.m, focus: false })}
          onMouseLeave={() => setHot(null)}
          onFocus={() => setHot({ m: r.m, focus: true })}
          onBlur={() => setHot(null)}
        >
          <title>{tip(r)}</title>
        </rect>
      ))}
      {showBand && (
        <rect
          x={G.BAND_X}
          y={0}
          width={G.BAND_W}
          height={H}
          fill="transparent"
          tabIndex={0}
          role="button"
          aria-label={`${band.label}: ${fmt(kpi, tot)}; PY ${fmt(kpi, refTot)}. Zeitraum auf gesamtes Jahr zurücksetzen`}
          style={{ cursor: 'pointer', outline: 'none' }}
          onClick={reset}
          onKeyDown={(e) => onKey(e, reset)}
          onMouseEnter={() => setHot({ m: 0, focus: false })}
          onMouseLeave={() => setHot(null)}
          onFocus={() => setHot({ m: 0, focus: true })}
          onBlur={() => setHot(null)}
        >
          <title>{[`${band.label} ${year}`, `AC ${fmt(kpi, tot)}`, `PY ${fmt(kpi, refTot)}`, `ΔPY ${fmtDelta(kpi, dT)}`, `ΔPY% ${fmtRel(relT)}`].join('\n')}</title>
        </rect>
      )}
    </>
  );

  const ariaLabel = `${kpi.label} je Monat ${year}`;
  const onSvgKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && view.period === 'month') reset();
  };

  const mainChart =
    variant === 'integrated' ? (
      <VarIntChart
        uid={uid}
        kpi={kpi}
        rows={rows}
        band={band}
        lastClosed={lastClosed}
        geom={G}
        allSel={allSel}
        underlay={underlay}
        overlay={overlay}
        ariaLabel={ariaLabel}
        onKeyDown={onSvgKey}
      />
    ) : (
      <svg viewBox={`0 0 ${G.W} ${H}`} className="h-auto w-full" role="group" aria-label={ariaLabel} style={{ fontVariantNumeric: 'tabular-nums' }} onKeyDown={onSvgKey}>
        {underlay}
        <Divider g={G} lastClosed={lastClosed} height={H} labelY={10} />
        <LineTier kpi={kpi} rows={rows} A={cumSeries(kpi, acM, year, lastClosed, total, true)} R={cumSeries(kpi, pyM, pyYear, 12, total, false)} plotH={240} lastClosed={lastClosed} />
        {overlay}
      </svg>
    );

  const multiples = (zoomed: boolean) => zoomed && zoomMode === 'multiples';

  const tools = (zoomed: boolean) => (
    <>
      <span className="flex items-center gap-200">
        <ScenarioTag code="AC" />
        <ScenarioTag code="PY" />
      </span>
      {view.period === 'month' && (
        <button
          type="button"
          onClick={reset}
          className="rounded-sm px-100 text-200 font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Alle
        </button>
      )}
      {!multiples(zoomed) && <Switch<Variant> value={variant} options={VARIANTS} onChange={(v) => setView({ timeVariant: v })} label="Darstellung Zeitreihe" />}
      {zoomed && <Switch<ZoomMode> value={zoomMode} options={ZOOM_MODES} onChange={setZoomMode} label="Ansicht im Zoom" />}
      {multiples(zoomed) && (
        <>
          <Switch<MultDim> value={multDim} options={MULT_DIMS} onChange={setMultDim} label="Dimension der Small Multiples" />
          <Switch<MultScale> value={multScale} options={MULT_SCALES} onChange={setMultScale} label="Maßstab der Small Multiples" />
        </>
      )}
    </>
  );

  const body = (zoomed: boolean) => {
    if (multiples(zoomed)) return <Multiples uid={uid} dim={multDim} scale={multScale} onPick={(m) => pickMember(multDim, m)} />;
    return (
      <>
        {zoomed && drill && drillActive && (
          <nav aria-label="Pfad" className="mb-300 flex flex-wrap items-center gap-200 text-200">
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-100 rounded-sm px-100 font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ArrowLeft className="icon-size-200" aria-hidden="true" />
              Zurück zu Small Multiples
            </button>
            <span className="text-muted-foreground">
              {DIM_LABEL[drill.dim]} › <span className="font-semibold text-foreground">{drill.member}</span>
            </span>
          </nav>
        )}
        {mainChart}
        {kpi.warning && <p className="mt-200 text-200 text-muted-foreground">⚠ {kpi.warning}</p>}
      </>
    );
  };

  return (
    <Tile title={`${kpi.label} je Monat`} sub={sub} message={message} tools={tools}>
      {body}
    </Tile>
  );
}

/** Cumulative series from January: running sums for additive KPIs, period values otherwise. */
function cumSeries(
  kpi: KpiDef,
  vals: number[],
  yr: number,
  lastClosed: number,
  total: (kpi: KpiDef, opts?: { year?: number; months?: number[] }) => number,
  isAc: boolean
): number[] {
  const out = kpi.additive
    ? vals.reduce<number[]>((acc, v) => [...acc, (acc.length ? acc[acc.length - 1] : 0) + (fin(v) ? v : 0)], [])
    : ALL_MONTHS.map((m) => total(kpi, { year: yr, months: upTo(m) }));
  // AC of open months is not drawn.
  return isAc ? out.map((v, i) => (i + 1 > lastClosed ? NaN : v)) : out;
}
