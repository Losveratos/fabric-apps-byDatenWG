// View state of the sales cockpit, mirrored into the URL hash (shareable).

import type { Dim, Filter } from './model';
import type { KpiId } from './kpis';

export type Page = 'overview' | 'analyse' | 'pipeline' | 'deals';
export type PeriodKind = 'fy' | 'ytd' | 'month';
export type TimeVariant = 'integrated' | 'columns' | 'line' | 'cumulative';
export type TreeMode = 'formula' | 'region' | 'product' | 'sales';

export interface View {
  page: Page;
  year: number; // 0 = default (last complete year)
  period: PeriodKind;
  month: number; // 1..12 when period === 'month'
  kpi: KpiId;
  /** Dimension of the structure chart on the overview. */
  structDim: Dim;
  timeVariant: TimeVariant;
  /** Analyse page: one chart or small multiples. */
  multiples: boolean;
  multDim: Dim;
  multScale: 'shared' | 'own';
  treeMode: TreeMode;
  filter: Filter;
  /** Customer profile panel (details on demand). */
  customer: string | null;
  /** Filter panel expanded. */
  panel: boolean;
}

export const DEFAULT_VIEW: View = {
  page: 'overview',
  year: 0,
  period: 'fy',
  month: 0,
  kpi: 'won',
  structDim: 'vertriebler',
  timeVariant: 'integrated',
  multiples: false,
  multDim: 'gruppe',
  multScale: 'shared',
  treeMode: 'formula',
  filter: {},
  customer: null,
  panel: true,
};

const SIMPLE: (keyof View)[] = ['page', 'year', 'period', 'month', 'kpi', 'structDim', 'timeVariant', 'multDim', 'multScale', 'treeMode'];

export function toHash(v: View): string {
  const p = new URLSearchParams();
  for (const k of SIMPLE) if (v[k] !== DEFAULT_VIEW[k]) p.set(k, String(v[k]));
  if (v.multiples) p.set('multiples', '1');
  if (!v.panel) p.set('panel', '0');
  if (v.customer) p.set('customer', v.customer);
  for (const [d, sel] of Object.entries(v.filter)) if (sel && sel.length) p.set(`f.${d}`, sel.join('|'));
  const s = p.toString();
  return s ? '#' + s : '';
}

export function fromHash(hash: string): View {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const v: View = { ...DEFAULT_VIEW, filter: {} };
  const pick = <K extends keyof View>(k: K, allowed: readonly string[]) => {
    const x = p.get(k as string);
    if (x && allowed.includes(x)) (v[k] as unknown) = x;
  };
  pick('page', ['overview', 'analyse', 'pipeline', 'deals']);
  pick('period', ['fy', 'ytd', 'month']);
  pick('kpi', ['won', 'wonN', 'avgDeal', 'customers', 'cycle', 'created', 'winRate', 'openV', 'openW', 'fc']);
  const dims = ['vertriebler', 'bundesland', 'stadt', 'gruppe', 'typ', 'kunde'];
  pick('structDim', dims);
  pick('multDim', dims);
  pick('timeVariant', ['integrated', 'columns', 'line', 'cumulative']);
  pick('multScale', ['shared', 'own']);
  pick('treeMode', ['formula', 'region', 'product', 'sales']);
  const y = Number(p.get('year'));
  if (y > 2000) v.year = y;
  const m = Number(p.get('month'));
  if (m >= 1 && m <= 12) v.month = m;
  v.multiples = p.get('multiples') === '1';
  v.panel = p.get('panel') !== '0';
  v.customer = p.get('customer');
  for (const d of dims) {
    const x = p.get(`f.${d}`);
    if (x) v.filter[d as Dim] = x.split('|').filter(Boolean);
  }
  return v;
}
