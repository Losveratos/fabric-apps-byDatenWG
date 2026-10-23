// Context every page and chart of the Rhine app reads from.

import { createContext, useContext } from 'react';

import type { Compute } from '@/lib/rhein/compute';
import type { KpiDef } from '@/lib/rhein/kpis';
import type { Epoch, RheinData } from '@/lib/rhein/model';
import type { View } from '@/lib/rhein/view';

export interface RheinContextValue extends Compute {
  data: RheinData;
  view: View;
  setView: (patch: Partial<View>) => void;
  /** Selected KPI. */
  kpi: KpiDef;
  /** e.g. "1817..2025 · Aug, Sep" */
  selectionText: string;
  toggleMonth: (m: number) => void;
  toggleEpoch: (e: Epoch) => void;
  clearFilter: () => void;
  /** Open the year detail (details on demand), 0 closes it. */
  openYear: (year: number) => void;
}

export const RheinContext = createContext<RheinContextValue | undefined>(undefined);

export function useRhein(): RheinContextValue {
  const ctx = useContext(RheinContext);
  if (!ctx) throw new Error('useRhein must be used inside <RheinContext.Provider>');
  return ctx;
}
