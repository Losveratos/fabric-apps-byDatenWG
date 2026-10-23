// KPI catalogue of the cockpit: the 11 model KPIs plus derived ratios, with
// German labels, display units and polarity. Values are always computed from
// the cube, ratios as quotient of sums (never as average of ratios).

import { aggScen, type Cube, type MemberFilter, type Scen, type ScenarioChoice } from './cube';

export type DisplayUnit = 'mio' | 'tsd' | 'eur' | 'pts' | 'pct';

export interface KpiDef {
  id: string;
  label: string;
  short: string;
  group: string;
  unit: DisplayUnit;
  higherBetter: boolean;
  /** Base KPI id (model name) for plain KPIs. */
  base?: string;
  /** Ratio: numerator / denominator base KPI ids. */
  ratio?: { num: string; den: string; factor?: number };
}

const LABELS: Record<string, [string, string]> = {
  Revenue: ['Umsatz', 'Umsatz'],
  Cost: ['Kosten gesamt', 'Kosten'],
  COGS: ['Herstellkosten', 'HK'],
  Profit: ['Ergebnis', 'Ergebnis'],
  'Units Sold': ['Absatz', 'Absatz'],
  Discount: ['Rabatte', 'Rabatte'],
  'Marketing Spend': ['Marketing', 'Marketing'],
  Orders: ['Aufträge', 'Aufträge'],
  'Returned Units': ['Retouren', 'Retouren'],
  'New Customers': ['Neukunden', 'Neukunden'],
  'Customer Satisfaction': ['Kundenzufriedenheit', 'Zufriedenheit'],
};

const GROUP_LABEL: Record<string, string> = {
  Ergebnis: 'Ergebnis',
  Kosten: 'Kosten',
  Menge: 'Menge',
  Kunde: 'Kunde',
  Qualitaet: 'Qualität',
};

function unitOf(modelUnit: string): DisplayUnit {
  if (modelUnit === 'EUR') return 'mio';
  if (modelUnit === 'Punkte') return 'pts';
  return 'tsd';
}

/** Builds the catalogue from the model's KPI dimension plus derived ratios. */
export function buildCatalogue(cube: Cube): KpiDef[] {
  const base: KpiDef[] = cube.kpis.map((k) => ({
    id: k.id,
    label: LABELS[k.id]?.[0] ?? k.id,
    short: LABELS[k.id]?.[1] ?? k.id,
    group: GROUP_LABEL[k.group] ?? k.group,
    unit: unitOf(k.unit),
    higherBetter: k.higherBetter,
    base: k.id,
  }));
  const has = (id: string) => cube.kpis.some((k) => k.id === id);
  const derived: KpiDef[] = [];
  if (has('Profit') && has('Revenue'))
    derived.push({ id: 'margin', label: 'Umsatzrendite', short: 'Marge', group: 'Kennzahlen', unit: 'pct', higherBetter: true, ratio: { num: 'Profit', den: 'Revenue' } });
  if (has('Revenue') && has('Orders'))
    derived.push({ id: 'aov', label: 'Ø Auftragswert', short: 'Ø Auftrag', group: 'Kennzahlen', unit: 'eur', higherBetter: true, ratio: { num: 'Revenue', den: 'Orders' } });
  if (has('Revenue') && has('Units Sold'))
    derived.push({ id: 'price', label: 'Ø Preis je Stück', short: 'Ø Preis', group: 'Kennzahlen', unit: 'eur', higherBetter: true, ratio: { num: 'Revenue', den: 'Units Sold' } });
  if (has('Returned Units') && has('Units Sold'))
    derived.push({ id: 'returns', label: 'Retourenquote', short: 'Retourenquote', group: 'Kennzahlen', unit: 'pct', higherBetter: false, ratio: { num: 'Returned Units', den: 'Units Sold' } });
  if (has('Marketing Spend') && has('Revenue'))
    derived.push({ id: 'mktshare', label: 'Marketingquote', short: 'Mkt.-Quote', group: 'Kennzahlen', unit: 'pct', higherBetter: false, ratio: { num: 'Marketing Spend', den: 'Revenue' } });
  return [...base, ...derived];
}

/** Value of a KPI in a view scenario over months and member filter. */
export function kpiValue(cube: Cube, kpi: KpiDef, scen: Scen, months: number[], f: MemberFilter, ch: ScenarioChoice): number {
  const idx = (id: string) => cube.kpis.findIndex((k) => k.id === id);
  if (kpi.base) {
    const k = idx(kpi.base);
    return k < 0 ? NaN : aggScen(cube, scen, k, months, f, ch);
  }
  if (kpi.ratio) {
    const n = aggScen(cube, scen, idx(kpi.ratio.num), months, f, ch);
    const d = aggScen(cube, scen, idx(kpi.ratio.den), months, f, ch);
    return d ? (n / d) * (kpi.ratio.factor ?? 1) : NaN;
  }
  return NaN;
}

/** Signed "goodness" of a variance: positive is always favourable. */
export function favourable(kpi: KpiDef, delta: number): number {
  return kpi.higherBetter ? delta : -delta;
}

/** Headline KPIs for the card row (MockupKitchen "kpi" row). */
export const HEADLINE = ['Revenue', 'Profit', 'margin', 'Cost', 'Orders', 'Customer Satisfaction'];
