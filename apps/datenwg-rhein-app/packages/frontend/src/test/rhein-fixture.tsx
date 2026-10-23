// Test helper: the real daily values (exported once from the semantic model,
// kept local only because of the GRDC licence) and a real RheinContext provider.

import { useCallback, useState, type ReactNode } from 'react';

import { useRheinContextValue } from '@/hooks/rhein-provider';
import { RheinContext } from '@/hooks/rhein.context';
import { buildRhein } from '@/lib/rhein/load';
import type { RheinData } from '@/lib/rhein/model';
import { DEFAULT_VIEW, type View } from '@/lib/rhein/view';

import station from './data/station.json';
import tage from './data/tage.json';

let cached: RheinData | null = null;

/** Model built from the exported query results (cached across tests). */
export function makeTestData(): RheinData {
  if (!cached) cached = buildRhein({ tage, station });
  return cached;
}

/** Real RheinContext over the exported data; view changes are stateful. */
export function RheinTestProvider({ children, view: initial }: { children: ReactNode; view?: Partial<View> }) {
  const data = makeTestData();
  const [view, setViewState] = useState<View>({ ...DEFAULT_VIEW, ...initial });
  const setView = useCallback((p: Partial<View>) => setViewState((v) => ({ ...v, ...p })), []);
  const value = useRheinContextValue(data, view, setView, setViewState);
  return <RheinContext.Provider value={value}>{children}</RheinContext.Provider>;
}
