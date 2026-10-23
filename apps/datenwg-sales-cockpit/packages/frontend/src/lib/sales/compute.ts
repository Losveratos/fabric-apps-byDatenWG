// Builds the compute functions of the sales context with a memo cache.

import type { MemberValue } from '@/hooks/sales.context';

import type { KpiDef } from './kpis';
import { aggregate, sumMonths, type Acc, type Dim, type Filter, type SalesData } from './model';

const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function key(year: number, filter: Filter, groupBy: Dim | null) {
  const f = Object.entries(filter)
    .filter(([, v]) => v && v.length)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${[...(v as string[])].sort().join(',')}`)
    .join(';');
  return `${year}|${groupBy ?? ''}|${f}`;
}

export function makeCompute(data: SalesData, defaults: { year: number; months: number[]; filter: Filter }) {
  const cache = new Map<string, Map<string, Acc[]>>();

  const agg = (year: number, filter: Filter = defaults.filter, groupBy: Dim | null = null) => {
    const k = key(year, filter, groupBy);
    let hit = cache.get(k);
    if (!hit) {
      hit = aggregate(data, year, filter, groupBy);
      cache.set(k, hit);
    }
    return hit;
  };

  const total = (kpi: KpiDef, opts: { year?: number; months?: number[]; filter?: Filter } = {}) => {
    const arr = agg(opts.year ?? defaults.year, opts.filter ?? defaults.filter).get('');
    if (!arr) return kpi.additive ? 0 : NaN;
    return kpi.value(sumMonths(arr, opts.months ?? defaults.months));
  };

  const monthly = (kpi: KpiDef, opts: { year?: number; filter?: Filter } = {}) => {
    const arr = agg(opts.year ?? defaults.year, opts.filter ?? defaults.filter).get('');
    return ALL_MONTHS.map((m) => (arr ? kpi.value(arr[m - 1]) : kpi.additive ? 0 : NaN));
  };

  const byMember = (kpi: KpiDef, dim: Dim, opts: { months?: number[]; filter?: Filter } = {}): MemberValue[] => {
    const f = { ...(opts.filter ?? defaults.filter) };
    delete f[dim];
    const months = opts.months ?? defaults.months;
    const ac = agg(defaults.year, f, dim);
    const py = agg(defaults.year - 1, f, dim);
    const names = new Set([...ac.keys(), ...py.keys()]);
    return [...names].map((member) => {
      const a = ac.get(member);
      const p = py.get(member);
      return {
        member,
        ac: a ? kpi.value(sumMonths(a, months)) : kpi.additive ? 0 : NaN,
        py: p ? kpi.value(sumMonths(p, months)) : kpi.additive ? 0 : NaN,
      };
    });
  };

  return { agg, total, monthly, byMember };
}
