// Overview time tile: the selected KPI per decade or per year 1817..2025
// against REF 1817 bis 1920 (same months). Buckets outside the epoch
// selection are drawn lighter. Click a decade: switch to years and highlight
// that decade; click a year: open the year detail. Zoom: small multiples,
// one mini chart per epoch with its years.

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

import { ScenarioTag, VariancePill } from '@/components/ibcs/Ibcs';
import { Switch, Tile } from '@/components/Tile';
import { useRhein } from '@/hooks/rhein.context';
import type { Grain } from '@/lib/rhein/compute';
import { fmt, fmtDelta, fmtRel, relDelta, unitLabel } from '@/lib/rhein/format';
import { favourable } from '@/lib/rhein/kpis';
import { EPOCHS, type Epoch } from '@/lib/rhein/model';
import { cn } from '@/lib/utils';

import { deltaPhrase, pillText, REF_LABEL, subjectOf } from './shared';
import { BIG, buildRows, COMPACT, extentOf, fin, layoutOf, mergeExtents, onKey, slotOf, type BandData, type VRow } from './varint';
import { VarIntChart } from './VarIntChart';

const G = BIG;
const HOVER = 'var(--color-hover)';

type ZoomMode = 'single' | 'multiples';
type MultScale = 'shared' | 'own';

const GRAINS: { id: Grain; label: string }[] = [
  { id: 'decade', label: 'Dekaden' },
  { id: 'year', label: 'Jahre' },
];
const ZOOM_MODES: { id: ZoomMode; label: string; title: string }[] = [
  { id: 'single', label: 'Einzeln', title: 'Ein Diagramm über alle Jahre' },
  { id: 'multiples', label: 'Je Epoche', title: 'Ein kleines Diagramm je Epoche mit ihren Jahren' },
];
const MULT_SCALES: { id: MultScale; label: string; title: string }[] = [
  { id: 'shared', label: 'gemeinsam', title: 'Gleicher Maßstab in allen Kacheln' },
  { id: 'own', label: 'je Kachel', title: 'Eigener Maßstab je Kachel' },
];

/** Band label: the epoch selection or the whole series. */
function bandLabel(epochs: Epoch[]): string {
  if (!epochs.length) return 'Auswahl';
  return epochs.length === 1 ? epochs[0] : `${epochs.length} Epochen`;
}

function Multiples({ uid, scale, onPick }: { uid: string; scale: MultScale; onPick: (e: Epoch) => void }) {
  const { kpi, series, byEpoch, view } = useRhein();
  const all = series(kpi, 'year');
  const totals = byEpoch(kpi);
  const cards = EPOCHS.map((e, i) => {
    const pts = all.filter((p) => p.epoch === e).map((p) => ({ ...p, active: true }));
    const t = totals[i];
    const band: BandData = { tot: t.ac, refTot: t.ref, label: 'Epoche' };
    const rows = buildRows(kpi, pts, 'year', true);
    return { epoch: e, rows, band, n: pts.length };
  });
  const extents = cards.map((c) => extentOf(c.rows, c.band));
  const shared = scale === 'shared' ? mergeExtents(extents) : null;
  return (
    <div>
      <p className="mb-300 text-200 text-muted-foreground">
        Je Epoche alle Jahre gegen {REF_LABEL} ·{' '}
        {shared ? 'gemeinsamer Maßstab (Höhen vergleichbar)' : 'eigener Maßstab je Kachel (Höhen nicht vergleichbar)'} · Klick filtert auf die Epoche
      </p>
      <ul className="grid grid-cols-1 gap-300 lg:grid-cols-3" aria-label="Small Multiples je Epoche">
        {cards.map((c, i) => {
          const good = favourable(kpi, c.band.tot - c.band.refTot) >= 0;
          const on = view.epochs.includes(c.epoch);
          return (
            <li key={c.epoch}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={`${c.epoch}: AC ${fmt(kpi, c.band.tot)}; REF ${fmt(kpi, c.band.refTot)}; ΔREF% ${fmtRel(relDelta(c.band.tot, c.band.refTot))}. Auf Epoche filtern`}
                onClick={() => onPick(c.epoch)}
                className={cn(
                  'flex w-full flex-col gap-100 rounded-md border p-200 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
                  on ? 'border-ring' : 'border-border'
                )}
              >
                <span className="flex w-full items-baseline justify-between gap-200">
                  <span className="truncate text-200 font-semibold">
                    {c.epoch} <span className="font-normal text-muted-foreground">· {c.n} Jahre</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-200">
                    <span className="font-monospace text-200 font-bold tabular">{fmt(kpi, c.band.tot)}</span>
                    <VariancePill value={relDelta(c.band.tot, c.band.refTot)} good={good}>
                      {pillText(kpi, c.band.tot, c.band.refTot)}
                    </VariancePill>
                  </span>
                </span>
                <VarIntChart uid={`${uid}m${i}`} kpi={kpi} rows={c.rows} band={c.band} geom={COMPACT} extent={shared ?? extents[i]} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TimeChart() {
  const { view, setView, kpi, series, total, ref, selectionText, openYear, data } = useRhein();
  const uid = 'tc' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [hot, setHot] = useState<{ i: number; focus: boolean } | null>(null);
  const [zoomMode, setZoomMode] = useState<ZoomMode>('single');
  const [multScale, setMultScale] = useState<MultScale>('shared');
  const [focusDecade, setFocusDecade] = useState<number | null>(null);

  const grain = view.grain;
  const points = series(kpi, grain);
  const rows = buildRows(kpi, points, grain, false);
  const band: BandData = { tot: total(kpi), refTot: ref(kpi), label: bandLabel(view.epochs) };
  const n = rows.length;
  const slot = slotOf(G, n);
  const { H } = layoutOf(G);
  const unitName = grain === 'decade' ? 'Dekade' : 'Jahr';

  // Kernaussage: selection vs REF plus the most unfavourable active bucket.
  const ph = deltaPhrase(kpi, band.tot, band.refTot);
  const worst = rows
    .filter((r) => r.active && fin(r.d))
    .reduce<VRow | null>((w, r) => (!w || favourable(kpi, r.d) < favourable(kpi, w.d) ? r : w), null);
  let message: ReactNode = null;
  if (ph) {
    message = (
      <>
        {subjectOf(kpi, view.epochs, view.months, data.years[0], data.years[data.years.length - 1])}{' '}
        {ph.good === null ? (
          'auf Höhe der Referenz'
        ) : (
          <>
            <span style={{ color: ph.good ? 'var(--ibcs-good)' : 'var(--ibcs-bad)' }}>{ph.text}</span> der Referenz 1817 bis 1920
          </>
        )}
        {worst && favourable(kpi, worst.d) < 0 && (
          <>
            {' '}
            · {grain === 'decade' ? 'ungünstigste Dekade' : 'ungünstigstes Jahr'} {worst.label}{' '}
            <span style={{ color: 'var(--ibcs-bad)' }}>{kpi.unit === 'pct' ? fmtDelta(kpi, worst.d) : fmtRel(worst.rel, 0)}</span>
          </>
        )}
      </>
    );
  }

  const pick = (r: VRow) => {
    if (grain === 'decade') {
      setFocusDecade(r.key);
      setView({ grain: 'year' });
    } else openYear(view.year === r.key ? 0 : r.key);
  };
  const tip = (r: VRow) =>
    [
      `${r.label}${r.years > 1 ? ` (${r.years} Jahre)` : ''}`,
      `AC ${fmt(kpi, r.a)}`,
      `REF ${fmt(kpi, r.r)}`,
      `ΔREF ${fmtDelta(kpi, r.d)}`,
      `ΔREF% ${fmtRel(r.rel)}`,
    ].join('\n');

  const marks: ReactNode[] = [];
  if (grain === 'year' && focusDecade !== null) {
    const idx = rows.filter((r) => Math.floor(r.key / 10) * 10 === focusDecade).map((r) => r.i);
    if (idx.length)
      marks.push(
        <rect key="focus" x={G.X0 + idx[0] * slot} y={0} width={idx.length * slot} height={H} fill={C_FOCUS} data-focus-decade={focusDecade} />
      );
  }
  if (grain === 'year' && view.year) {
    const r = rows.find((x) => x.key === view.year);
    if (r) marks.push(<rect key="year" x={G.X0 + r.i * slot} y={0} width={slot} height={H} fill="none" stroke="var(--ibcs-hilite)" strokeWidth={1.2} />);
  }
  if (hot)
    marks.push(
      <rect
        key="hot"
        x={hot.i < 0 ? G.BAND_X : G.X0 + hot.i * slot}
        y={0}
        width={hot.i < 0 ? G.BAND_W : slot}
        height={H}
        fill={HOVER}
        stroke={hot.focus ? 'var(--ibcs-hilite)' : 'none'}
        strokeWidth={1}
      />
    );

  const overlay = rows.map((r) => (
    <rect
      key={`hit${r.i}`}
      data-bucket={r.key}
      x={G.X0 + r.i * slot}
      y={0}
      width={slot}
      height={H}
      fill="transparent"
      tabIndex={0}
      role="button"
      aria-pressed={grain === 'year' ? view.year === r.key : undefined}
      aria-label={`${r.label}: AC ${fmt(kpi, r.a)}; REF ${fmt(kpi, r.r)}; ΔREF% ${fmtRel(r.rel)}`}
      style={{ cursor: 'pointer', outline: 'none' }}
      onClick={() => pick(r)}
      onKeyDown={(e) => onKey(e, () => pick(r))}
      onMouseEnter={() => setHot({ i: r.i, focus: false })}
      onMouseLeave={() => setHot(null)}
      onFocus={() => setHot({ i: r.i, focus: true })}
      onBlur={() => setHot(null)}
    >
      <title>{tip(r)}</title>
    </rect>
  ));

  const onSvgKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (view.year) openYear(0);
      setFocusDecade(null);
    }
  };

  const multiples = (zoomed: boolean) => zoomed && zoomMode === 'multiples';

  const tools = (zoomed: boolean) => (
    <>
      <span className="flex items-center gap-200">
        <ScenarioTag code="AC" />
        <ScenarioTag code="PY">REF</ScenarioTag>
      </span>
      {!multiples(zoomed) && (
        <Switch<Grain>
          value={grain}
          options={GRAINS}
          onChange={(g) => {
            setFocusDecade(null);
            setView({ grain: g });
          }}
          label="Zeitachse"
        />
      )}
      {zoomed && <Switch<ZoomMode> value={zoomMode} options={ZOOM_MODES} onChange={setZoomMode} label="Ansicht im Zoom" />}
      {multiples(zoomed) && <Switch<MultScale> value={multScale} options={MULT_SCALES} onChange={setMultScale} label="Maßstab der Small Multiples" />}
    </>
  );

  const body = (zoomed: boolean) => {
    if (multiples(zoomed))
      return (
        <Multiples
          uid={uid}
          scale={multScale}
          onPick={(e) => {
            setView({ epochs: view.epochs.length === 1 && view.epochs[0] === e ? [] : [e] });
            setZoomMode('single');
          }}
        />
      );
    return (
      <>
        {grain === 'year' && focusDecade !== null && (
          <p className="mb-200 flex flex-wrap items-center gap-200 text-200 text-muted-foreground">
            <span>
              Dekade <span className="font-semibold text-foreground">{focusDecade}er</span> hervorgehoben · Klick auf ein Jahr zeigt Details
            </span>
            <button
              type="button"
              onClick={() => setFocusDecade(null)}
              className="rounded-sm px-100 font-medium underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              Hervorhebung aufheben
            </button>
          </p>
        )}
        <VarIntChart
          uid={zoomed ? `${uid}z` : uid}
          kpi={kpi}
          rows={rows}
          band={band}
          geom={G}
          underlay={marks}
          overlay={overlay}
          ariaLabel={`${kpi.label} je ${unitName}`}
          onKeyDown={onSvgKey}
        />
        <p className="mt-200 text-100 text-muted-foreground">
          {kpi.label} ist nicht additiv (Mittel, Extremwerte, Anteile): keine Brücke, Δ je {unitName} einzeln gegen {REF_LABEL} derselben Monate. Die rechte
          Spalte zeigt den Wert der ganzen Auswahl.{' '}
          {grain === 'decade' ? 'Klick auf eine Dekade zeigt ihre Jahre.' : 'Klick auf ein Jahr öffnet die Details.'}
        </p>
      </>
    );
  };

  return (
    <Tile title={`${kpi.label} je ${unitName}`} sub={`${unitLabel(kpi)} · AC vs ${REF_LABEL} · ${selectionText}`} message={message} tools={tools}>
      {body}
    </Tile>
  );
}

const C_FOCUS = 'color-mix(in srgb, var(--ibcs-hilite) 10%, transparent)';
