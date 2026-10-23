import { createContext, useContext } from 'react';

import type { DocFilter, Library } from '@/lib/library';
import type { RouteState, View } from '@/lib/route';

export interface MonthPick {
  conceptId: string | null;
  month: string; // YYYY-MM
}

export interface AppContextValue {
  lib: Library;
  route: RouteState;
  filter: DocFilter;
  setRoute: (patch: Partial<RouteState>) => void;
  /** Select a node (concept, person or document) and optionally switch view. */
  select: (id: string | null, view?: View) => void;
  monthPick: MonthPick | null;
  setMonthPick: (m: MonthPick | null) => void;
}

export const AppContext = createContext<AppContextValue | undefined>(undefined);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppContext.Provider>');
  return ctx;
}
