// Text helpers shared by the overview tiles and KPI cards: reference label,
// variance phrases for the key messages (Kernaussagen).

import { fmtDelta, fmtRel, relDelta } from '@/lib/rhein/format';
import { favourable, type KpiDef } from '@/lib/rhein/kpis';
import { MONTHS, REF_FROM, REF_TO, type Epoch } from '@/lib/rhein/model';

export const REF_LABEL = `REF ${REF_FROM} bis ${REF_TO}`;

export interface Phrase {
  /** "15 % unter" or "1,2 PP über" or "auf Höhe" (without the reference). */
  text: string;
  /** Favourable (true), unfavourable (false) or neutral (null). */
  good: boolean | null;
}

/** Magnitude of a variance for messages: % for flows, percentage points for shares. */
export function deltaPhrase(kpi: KpiDef, ac: number, ref: number): Phrase | null {
  if (!Number.isFinite(ac) || !Number.isFinite(ref)) return null;
  const d = ac - ref;
  const rel = relDelta(ac, ref);
  const usePP = kpi.unit === 'pct' || !Number.isFinite(rel);
  const mag = (usePP ? fmtDelta(kpi, Math.abs(d)) : fmtRel(Math.abs(rel), Math.abs(rel) < 0.1 ? 1 : 0)).replace(/^[+−]/, '');
  if (mag.startsWith('±')) return { text: 'auf Höhe', good: null };
  return { text: `${mag} ${d > 0 ? 'über' : 'unter'}`, good: favourable(kpi, d) >= 0 };
}

/** Compact Δ text for pills: percentage points for shares, else Δ%. */
export function pillText(kpi: KpiDef, ac: number, ref: number): string {
  return kpi.unit === 'pct' ? fmtDelta(kpi, ac - ref) : fmtRel(relDelta(ac, ref));
}

const EPOCH_PHRASE: Record<Epoch, string> = { 'vor 1920': 'Vor 1920', '1920 bis 1995': 'Von 1920 bis 1995', 'ab 1996': 'Seit 1996' };

/** Sentence start for key messages: "Seit 1996 liegt MQ in Aug, Sep". */
export function subjectOf(kpi: KpiDef, epochs: Epoch[], months: number[], first: number, last: number): string {
  const when = epochs.length === 1 ? EPOCH_PHRASE[epochs[0]] : epochs.length > 1 ? `In den Epochen ${epochs.join(' und ')}` : `Von ${first} bis ${last}`;
  const m = months.length ? ` in ${[...months].sort((a, b) => a - b).map((x) => MONTHS[x - 1]).join(', ')}` : '';
  return `${when} liegt ${kpi.short}${m}`;
}
