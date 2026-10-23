// Test helper: a small synthetic sales dataset and a real SalesContext
// provider around it, for component specs.

import { useMemo, useState, type ReactNode } from 'react';

import { SalesContext, type SalesContextValue } from '@/hooks/sales.context';
import { makeCompute } from '@/lib/sales/compute';
import { KPI_BY_ID } from '@/lib/sales/kpis';
import { lastClosedMonth, type Deal, type DealStatus, type Dim, type FcDeal, type SalesData } from '@/lib/sales/model';
import { DEFAULT_VIEW, type View } from '@/lib/sales/view';

const SELLERS = ['Anna', 'Ben', 'Cem'];
const STATES = ['Bayern', 'Hessen'];
const GROUPS = ['Kaffeebohnen', 'Kaffeemaschinen'];
const TYPES = ['Standart', 'Premium'];

/** Deterministic synthetic deals for 2021 and 2022 (+ open ones for 2023). */
export function makeTestData(): SalesData {
  const deals: Deal[] = [];
  let id = 1;
  for (const y of [2021, 2022, 2023]) {
    for (let m = 1; m <= 12; m++) {
      for (let i = 0; i < 6; i++) {
        const status: DealStatus = y === 2023 ? 'offen' : i === 5 ? 'verloren' : 'gewonnen';
        const summe = 1000 * (1 + ((i * 7 + m * 3 + (y - 2020) * 5) % 9)) * (i === 2 && m === 6 ? -0.2 : 1);
        const abschluss = `${y}-${String(m).padStart(2, '0')}-15`;
        const anlage = `${m > 2 ? y : y - 1}-${String(((m + 9) % 12) + 1).padStart(2, '0')}-01`;
        deals.push({
          id: id++,
          topic: `Kunde ${i % 4} | ${GROUPS[i % 2]} | ${TYPES[(i + m) % 2]}`,
          kunde: `Kunde ${i % 4}`,
          vertriebler: SELLERS[i % 3],
          stadt: i % 2 ? 'Frankfurt' : 'München',
          bundesland: STATES[i % 2],
          gruppe: GROUPS[i % 2],
          typ: TYPES[(i + m) % 2],
          summe,
          menge: 1 + (i % 3),
          status,
          wsk: status === 'gewonnen' ? 100 : status === 'offen' ? 10 * (i + 1) : 0,
          anlage,
          abschluss,
          tage: 30 + i * 10,
          closeY: y,
          closeM: m,
          createY: Number(anlage.slice(0, 4)),
          createM: Number(anlage.slice(5, 7)),
        });
      }
    }
  }
  const forecast: FcDeal[] = [2023, 2024].flatMap((y) =>
    Array.from({ length: 12 }, (_, k) => ({
      topic: `FC ${y}-${k}`,
      kunde: `Kunde ${k % 4}`,
      vertriebler: SELLERS[k % 3],
      stadt: 'München',
      bundesland: 'Bayern',
      gruppe: GROUPS[k % 2],
      typ: TYPES[k % 2],
      summe: 5000 + k * 100,
      abschluss: `${y}-${String(k + 1).padStart(2, '0')}-10`,
      closeY: y,
      closeM: k + 1,
      flag: (k % 3 === 0 ? 0 : 1) as 0 | 1,
    }))
  );
  const dims: Dim[] = ['vertriebler', 'bundesland', 'stadt', 'gruppe', 'typ', 'kunde'];
  const members = Object.fromEntries(dims.map((d) => [d, [...new Set(deals.map((x) => x[d]))].sort()])) as Record<Dim, string[]>;
  return { deals, forecast, asOf: '2023-04-30', years: [2021, 2022], members };
}

/** Real SalesContext over the synthetic data; view changes are stateful. */
export function SalesTestProvider({ children, view: initial }: { children: ReactNode; view?: Partial<View> }) {
  const data = useMemo(() => makeTestData(), []);
  const [view, setViewState] = useState<View>({ ...DEFAULT_VIEW, year: 2022, ...initial });
  const year = view.year || 2022;
  const lastClosed = lastClosedMonth(data, year);
  const months =
    view.period === 'month'
      ? [view.month || lastClosed || 12]
      : view.period === 'ytd'
        ? Array.from({ length: lastClosed || 12 }, (_, i) => i + 1)
        : Array.from({ length: 12 }, (_, i) => i + 1);
  const filter = view.filter;
  const monthsKey = months.join(',');
  const compute = useMemo(() => makeCompute(data, { year, months: monthsKey.split(',').map(Number), filter }), [data, year, monthsKey, filter]);
  const value: SalesContextValue = {
    data,
    view,
    setView: (p) => setViewState((v) => ({ ...v, ...p })),
    year,
    pyYear: year - 1,
    months,
    periodText: `Jan..Dez ${year}`,
    lastClosed,
    filter,
    kpi: KPI_BY_ID[view.kpi],
    ...compute,
    toggleMember: (dim, member) =>
      setViewState((v) => {
        const cur = v.filter[dim] ?? [];
        const next = cur.includes(member) ? cur.filter((x) => x !== member) : [...cur, member];
        return { ...v, filter: { ...v.filter, [dim]: next } };
      }),
    clearFilter: (dim) => setViewState((v) => ({ ...v, filter: dim ? { ...v.filter, [dim]: [] } : {} })),
    openCustomer: (name) => setViewState((v) => ({ ...v, customer: name })),
  };
  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
}
