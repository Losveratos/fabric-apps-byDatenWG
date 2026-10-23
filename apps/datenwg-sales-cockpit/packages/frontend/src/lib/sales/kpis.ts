// KPI catalogue of the sales cockpit. Every KPI is derived from an Acc
// (sums of a period), ratios as quotient of sums.

import type { Acc } from './model';

export type Unit = 'mio' | 'tsd' | 'n' | 'days' | 'pct';

export interface KpiDef {
  id: KpiId;
  label: string;
  short: string;
  unit: Unit;
  higherBetter: boolean;
  /** Short definition shown as tooltip / footnote. */
  info: string;
  /** Additive over months and members (sums), else a ratio/average. */
  additive: boolean;
  /** Data-quality caveat shown next to the KPI. */
  warning?: string;
  value: (a: Acc) => number;
}

export type KpiId = 'won' | 'wonN' | 'avgDeal' | 'customers' | 'cycle' | 'created' | 'winRate' | 'openV' | 'openW' | 'fc';

const div = (a: number, b: number) => (b ? a / b : NaN);

export const KPIS: KpiDef[] = [
  {
    id: 'won',
    label: 'Auftragseingang',
    short: 'Auftragseingang',
    unit: 'mio',
    higherBetter: true,
    additive: true,
    info: 'Summe der gewonnenen Angebote nach Abschlussdatum.',
    value: (a) => a.won,
  },
  {
    id: 'wonN',
    label: 'Gewonnene Aufträge',
    short: 'Aufträge',
    unit: 'n',
    higherBetter: true,
    additive: true,
    info: 'Anzahl gewonnener Angebote nach Abschlussdatum.',
    value: (a) => a.wonN,
  },
  {
    id: 'avgDeal',
    label: 'Ø Auftragswert',
    short: 'Ø Auftrag',
    unit: 'tsd',
    higherBetter: true,
    additive: false,
    info: 'Auftragseingang geteilt durch Anzahl gewonnener Aufträge.',
    value: (a) => div(a.won, a.wonN),
  },
  {
    id: 'customers',
    label: 'Kunden mit Auftrag',
    short: 'Kunden',
    unit: 'n',
    higherBetter: true,
    additive: false,
    info: 'Anzahl verschiedener Kunden mit mindestens einem gewonnenen Angebot.',
    value: (a) => a.customers.size,
  },
  {
    id: 'cycle',
    label: 'Ø Durchlaufzeit',
    short: 'Durchlaufzeit',
    unit: 'days',
    higherBetter: false,
    additive: false,
    info: 'Durchschnittliche Tage von Anlage bis Abschluss der gewonnenen Angebote.',
    value: (a) => div(a.tageWon, a.wonN),
  },
  {
    id: 'created',
    label: 'Neue Angebote',
    short: 'Angebote',
    unit: 'n',
    higherBetter: true,
    additive: true,
    info: 'Anzahl angelegter Angebote nach Anlagedatum, alle Status.',
    value: (a) => a.created,
  },
  {
    id: 'winRate',
    label: 'Abschlussquote',
    short: 'Quote',
    unit: 'pct',
    higherBetter: true,
    additive: false,
    info: 'Gewonnene geteilt durch gewonnene plus verlorene Angebote.',
    warning: 'Ab 2022 sind im Quellsystem kaum verlorene Angebote erfasst, die Quote ist dort zu hoch.',
    value: (a) => div(a.wonN, a.wonN + a.lostN),
  },
  {
    id: 'openV',
    label: 'Offene Pipeline',
    short: 'Pipeline',
    unit: 'mio',
    higherBetter: true,
    additive: true,
    info: 'Summe offener Angebote nach geplantem Abschlussdatum.',
    value: (a) => a.openV,
  },
  {
    id: 'openW',
    label: 'Pipeline gewichtet',
    short: 'Pipeline gew.',
    unit: 'mio',
    higherBetter: true,
    additive: true,
    info: 'Offene Angebote mal Abschlusswahrscheinlichkeit der Status-Stufe.',
    value: (a) => a.openW,
  },
  {
    id: 'fc',
    label: 'Forecast',
    short: 'Forecast',
    unit: 'mio',
    higherBetter: true,
    additive: true,
    info: 'Summe der Forecast-Deals, bei denen der Forecast mit Erfolg rechnet.',
    value: (a) => a.fc,
  },
];

export const KPI_BY_ID = Object.fromEntries(KPIS.map((k) => [k.id, k])) as Record<KpiId, KpiDef>;

/** KPIs of the overview card row. */
export const HEADLINE: KpiId[] = ['won', 'wonN', 'avgDeal', 'customers', 'cycle', 'created'];

/** Positive = favourable, respecting polarity. */
export function favourable(k: KpiDef, delta: number): number {
  return k.higherBetter ? delta : -delta;
}
