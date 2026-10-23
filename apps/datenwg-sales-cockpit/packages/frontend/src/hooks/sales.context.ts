// Context every page and chart of the sales cockpit reads from.

import { createContext, useContext } from 'react';

import type { KpiDef } from '@/lib/sales/kpis';
import type { Acc, Dim, Filter, SalesData } from '@/lib/sales/model';
import type { View } from '@/lib/sales/view';

export interface MemberValue {
  member: string;
  ac: number;
  py: number;
}

export interface SalesContextValue {
  data: SalesData;
  view: View;
  setView: (patch: Partial<View>) => void;

  /** Analysis year (AC) and its previous year (PY). */
  year: number;
  pyYear: number;
  /** Months (1..12) of the selected period. */
  months: number[];
  /** e.g. "Jan..Dez 2022". */
  periodText: string;
  /** Last month with reliable closed data in `year` (12 for complete years). */
  lastClosed: number;
  /** Active member filter. */
  filter: Filter;
  /** Selected KPI. */
  kpi: KpiDef;

  /** Memoised one-pass aggregation: group key → 12 monthly accumulators. */
  agg: (year: number, filter?: Filter, groupBy?: Dim | null) => Map<string, Acc[]>;
  /** KPI value for a period (defaults: selected year, months, filter). */
  total: (kpi: KpiDef, opts?: { year?: number; months?: number[]; filter?: Filter }) => number;
  /** 12 monthly KPI values (NaN where undefined). */
  monthly: (kpi: KpiDef, opts?: { year?: number; filter?: Filter }) => number[];
  /**
   * KPI per member of a dimension for the selected period, AC (year) and PY
   * (year − 1). The filter of `dim` itself is ignored so every member stays
   * visible; filters of other dimensions apply.
   */
  byMember: (kpi: KpiDef, dim: Dim, opts?: { months?: number[]; filter?: Filter }) => MemberValue[];

  /** Toggle a member in the cross-filter of a dimension. */
  toggleMember: (dim: Dim, member: string) => void;
  clearFilter: (dim?: Dim) => void;
  /** Open the customer profile panel. */
  openCustomer: (name: string | null) => void;
}

export const SalesContext = createContext<SalesContextValue | undefined>(undefined);

export function useSales(): SalesContextValue {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSales must be used inside <SalesContext.Provider>');
  return ctx;
}
