// Kernaussagen of the season tiles, computed from the data. Pure functions so
// the specs can check them without rendering.

import { fmtDelta, fmtNum } from '@/lib/rhein/format';
import { favourable, type KpiDef } from '@/lib/rhein/kpis';
import { EPOCHS, type Epoch } from '@/lib/rhein/model';

import type { HeatRow } from './EpochHeat';
import { fin, MONTHS_LONG, REF_TEXT, type VRow } from './varint';

const pct = (r: number) => `${fmtNum(Math.abs(r) * 100, 0)} %`;

/** "Seit 1996", "Vor 1920", "Über alle Jahre" … for the start of a sentence. */
export function epochPhrase(epochs: Epoch[]): string {
  const ep = EPOCHS.filter((e) => epochs.includes(e));
  if (!ep.length || ep.length === EPOCHS.length) return 'Über alle Jahre 1817 bis 2025';
  if (ep.length === 1) return ep[0] === 'vor 1920' ? 'Vor 1920' : ep[0] === 'ab 1996' ? 'Seit 1996' : 'Von 1920 bis 1995';
  return `In den Epochen ${ep.join(' und ')}`;
}

/** Month with the largest ΔREF% (selected months only, if any). */
export function monthMessage(kpi: KpiDef, rows: VRow[], epochs: Epoch[]): string {
  const pool = rows.filter((r) => r.sel && fin(r.d));
  if (!pool.length) return `Keine Werte für ${kpi.label} in dieser Auswahl.`;
  const byRel = pool.filter((r) => fin(r.rel));
  const top = byRel.length
    ? byRel.reduce((a, b) => (Math.abs(b.rel) > Math.abs(a.rel) ? b : a))
    : pool.reduce((a, b) => (Math.abs(b.d) > Math.abs(a.d) ? b : a));
  const month = MONTHS_LONG[top.i];
  const dir = top.d > 0 ? 'über' : 'unter';
  const good = favourable(kpi, top.d) >= 0;
  const amount = fin(top.rel) ? pct(top.rel) : fmtDelta(kpi, Math.abs(top.d));
  if (!/[1-9]/.test(amount)) return `${epochPhrase(epochs)} liegt ${kpi.label} in jedem Monat auf dem Niveau von ${REF_TEXT}.`;
  return `${epochPhrase(epochs)} liegt ${kpi.label} im ${month} ${amount} ${dir} ${REF_TEXT}, die größte Abweichung im Jahreslauf (${good ? 'günstig' : 'ungünstig'}).`;
}

/** Month with the biggest change of "ab 1996" against "vor 1920" in the season profile. */
export function profileMessage(old: number[], now: number[]): string {
  const rel = now.map((a, i) => (fin(a) && fin(old[i]) && old[i] ? (a - old[i]) / old[i] : NaN));
  const idx = rel.map((r, i) => ({ r, i })).filter((x) => fin(x.r));
  if (!idx.length) return 'Keine Werte für den Vergleich der Epochen.';
  const top = idx.reduce((a, b) => (Math.abs(b.r) > Math.abs(a.r) ? b : a));
  const opp = idx.filter((x) => Math.sign(x.r) === -Math.sign(top.r) && x.r !== 0);
  const first = `Seit 1996 führt der Rhein im ${MONTHS_LONG[top.i]} ${pct(top.r)} ${top.r > 0 ? 'mehr' : 'weniger'} Wasser als vor 1920, die größte Verschiebung im Jahreslauf`;
  if (!opp.length) return `${first}.`;
  const o = opp.reduce((a, b) => (Math.abs(b.r) > Math.abs(a.r) ? b : a));
  return `${first}; im ${MONTHS_LONG[o.i]} ${pct(o.r)} ${o.r > 0 ? 'mehr' : 'weniger'}.`;
}

/** Most unfavourable cell of the heat table plus the count of unfavourable months since 1996. */
export function heatMessage(kpi: KpiDef, rows: HeatRow[]): string {
  const cells = rows.flatMap((r) => r.cells.map((c, i) => ({ ...c, i, epoch: r.epoch }))).filter((c) => fin(c.d));
  if (!cells.length) return `Keine Werte für ${kpi.label}.`;
  const bad = cells.filter((c) => favourable(kpi, c.d) < 0 && /[1-9]/.test(fin(c.rel) ? pct(c.rel) : fmtDelta(kpi, c.d)));
  const now = rows.find((r) => r.epoch === 'ab 1996');
  const nBad = now ? now.cells.filter((c) => fin(c.d) && favourable(kpi, c.d) < 0).length : 0;
  if (!bad.length) return `${kpi.label} liegt in keiner Epoche und keinem Monat ungünstiger als ${REF_TEXT}.`;
  const withRel = bad.filter((c) => fin(c.rel));
  const w = withRel.length
    ? withRel.reduce((a, b) => (Math.abs(b.rel) > Math.abs(a.rel) ? b : a))
    : bad.reduce((a, b) => (Math.abs(b.d) > Math.abs(a.d) ? b : a));
  const amount = fin(w.rel) ? pct(w.rel) : fmtDelta(kpi, Math.abs(w.d));
  return `Am ungünstigsten: ${w.epoch} im ${MONTHS_LONG[w.i]}, ${amount} ${w.d > 0 ? 'über' : 'unter'} REF. Seit 1996 sind ${nBad} von 12 Monaten ungünstiger als ${REF_TEXT}.`;
}
