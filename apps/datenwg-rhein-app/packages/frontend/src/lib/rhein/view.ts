// View state of the Rhine app, mirrored into the URL hash (shareable).

import type { Grain } from './compute';
import type { KpiId } from './kpis';
import { EPOCHS, type Epoch } from './model';

export type Page = 'overview' | 'season' | 'lowwater';

export interface View {
  page: Page;
  kpi: KpiId;
  /** Months 1..12; empty = whole year. */
  months: number[];
  /** Epoch filter; empty = all. */
  epochs: Epoch[];
  /** Time axis of the overview chart. */
  grain: Grain;
  /** Season page: grouping of the small multiples. */
  multDim: 'epoch' | 'decade';
  multScale: 'shared' | 'own';
  /** Selected year (details on demand), 0 = none. */
  year: number;
  /** Filter panel expanded. */
  panel: boolean;
}

export const DEFAULT_VIEW: View = {
  page: 'overview',
  kpi: 'mq',
  months: [],
  epochs: [],
  grain: 'decade',
  multDim: 'epoch',
  multScale: 'shared',
  year: 0,
  panel: true,
};

const KPI_IDS = ['mq', 'nq', 'hq', 'nm7q', 'below'];

export function toHash(v: View): string {
  const p = new URLSearchParams();
  if (v.page !== DEFAULT_VIEW.page) p.set('page', v.page);
  if (v.kpi !== DEFAULT_VIEW.kpi) p.set('kpi', v.kpi);
  if (v.months.length) p.set('m', v.months.join(','));
  if (v.epochs.length) p.set('e', v.epochs.map((e) => EPOCHS.indexOf(e)).join(','));
  if (v.grain !== DEFAULT_VIEW.grain) p.set('grain', v.grain);
  if (v.multDim !== DEFAULT_VIEW.multDim) p.set('multDim', v.multDim);
  if (v.multScale !== DEFAULT_VIEW.multScale) p.set('multScale', v.multScale);
  if (v.year) p.set('year', String(v.year));
  if (!v.panel) p.set('panel', '0');
  const s = p.toString();
  return s ? '#' + s : '';
}

export function fromHash(hash: string): View {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const v: View = { ...DEFAULT_VIEW, months: [], epochs: [] };
  const page = p.get('page');
  if (page === 'overview' || page === 'season' || page === 'lowwater') v.page = page;
  const kpi = p.get('kpi');
  if (kpi && KPI_IDS.includes(kpi)) v.kpi = kpi as View['kpi'];
  v.months = (p.get('m') ?? '').split(',').map(Number).filter((m) => m >= 1 && m <= 12);
  v.epochs = (p.get('e') ?? '').split(',').filter(Boolean).map(Number).filter((i) => i >= 0 && i < EPOCHS.length).map((i) => EPOCHS[i]);
  if (p.get('grain') === 'year') v.grain = 'year';
  if (p.get('multDim') === 'decade') v.multDim = 'decade';
  if (p.get('multScale') === 'own') v.multScale = 'own';
  const y = Number(p.get('year'));
  if (y > 1800 && y < 2100) v.year = y;
  v.panel = p.get('panel') !== '0';
  return v;
}
