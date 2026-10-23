// Builds the RheinContext value from data and view state. Shared by App and
// the test fixture so both behave identically.

import { useMemo } from 'react';

import type { RheinContextValue } from '@/hooks/rhein.context';
import { makeCompute } from '@/lib/rhein/compute';
import { KPI_BY_ID } from '@/lib/rhein/kpis';
import { EPOCHS, MONTHS, type Epoch, type RheinData } from '@/lib/rhein/model';
import type { View } from '@/lib/rhein/view';

export function useRheinContextValue(
  data: RheinData,
  view: View,
  setView: (patch: Partial<View>) => void,
  update: (fn: (v: View) => View) => void
): RheinContextValue {
  const mKey = view.months.join(',');
  const eKey = view.epochs.join('|');
  const compute = useMemo(
    () => makeCompute(data, { months: view.months, epochs: view.epochs }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, mKey, eKey]
  );
  const first = data.years[0];
  const last = data.years[data.years.length - 1];
  const yearsText = view.epochs.length ? EPOCHS.filter((e) => view.epochs.includes(e)).join(', ') : `${first}..${last}`;
  const monthsText = view.months.length ? [...view.months].sort((a, b) => a - b).map((m) => MONTHS[m - 1]).join(', ') : 'ganzes Jahr';

  return {
    data,
    view,
    setView,
    kpi: KPI_BY_ID[view.kpi],
    selectionText: `${yearsText} · ${monthsText}`,
    ...compute,
    toggleMonth: (m: number) =>
      update((v) => ({ ...v, months: v.months.includes(m) ? v.months.filter((x) => x !== m) : [...v.months, m].sort((a, b) => a - b) })),
    toggleEpoch: (e: Epoch) =>
      update((v) => ({ ...v, epochs: v.epochs.includes(e) ? v.epochs.filter((x) => x !== e) : EPOCHS.filter((x) => x === e || v.epochs.includes(x)) })),
    clearFilter: () => update((v) => ({ ...v, months: [], epochs: [] })),
    openYear: (year: number) => update((v) => ({ ...v, year })),
  };
}
