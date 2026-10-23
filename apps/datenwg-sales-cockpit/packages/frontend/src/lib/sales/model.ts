// Sales data model: all offers of the current snapshot plus forecast deals,
// held in the browser. Every KPI is aggregated here in one pass per
// (year, filter, grouping), so filters, zoom and trees react instantly.

export type DealStatus = 'gewonnen' | 'offen' | 'verloren';

export interface Deal {
  id: number;
  topic: string;
  kunde: string;
  vertriebler: string;
  stadt: string;
  bundesland: string;
  gruppe: string; // Produktgruppe
  typ: string; // Produkttyp
  summe: number; // € (synthetisch verrauscht im Quellmodell)
  menge: number;
  status: DealStatus;
  wsk: number; // Wahrscheinlichkeit 0..100 aus der Status-Dimension
  anlage: string; // YYYY-MM-DD
  abschluss: string; // YYYY-MM-DD (geplant oder erfolgt)
  tage: number; // Dauer Angebot in Tagen
  // derived
  closeY: number;
  closeM: number; // 1..12
  createY: number;
  createM: number;
}

export interface FcDeal {
  topic: string;
  kunde: string;
  vertriebler: string;
  stadt: string;
  bundesland: string;
  gruppe: string;
  typ: string;
  summe: number;
  abschluss: string;
  closeY: number;
  closeM: number;
  /** 1 = Forecast rechnet mit Erfolg, 0 = nicht. */
  flag: 0 | 1;
}

/** Dimensions a view can group or filter by. */
export type Dim = 'vertriebler' | 'bundesland' | 'stadt' | 'gruppe' | 'typ' | 'kunde';

export const DIM_LABEL: Record<Dim, string> = {
  vertriebler: 'Vertriebler',
  bundesland: 'Bundesland',
  stadt: 'Stadt',
  gruppe: 'Produktgruppe',
  typ: 'Produkttyp',
  kunde: 'Kunde',
};

/** Selected members per dimension; missing or empty = all. */
export type Filter = Partial<Record<Dim, string[]>>;

export interface SalesData {
  deals: Deal[];
  forecast: FcDeal[];
  /** Snapshot date of the data (Pipeline Status Sort Order 0). */
  asOf: string; // YYYY-MM-DD
  /** Years that contain closed deals. */
  years: number[];
  /** Distinct members per dimension, sorted. */
  members: Record<Dim, string[]>;
}

// ---------------------------------------------------------------------------
// Accumulator: everything a KPI needs, for one bucket (e.g. a month).
// ---------------------------------------------------------------------------

export interface Acc {
  won: number; // € gewonnen (by close date)
  wonN: number;
  lostN: number;
  tageWon: number; // sum of cycle days of won deals
  customers: Set<string>; // customers with a won deal
  openV: number; // € offen (by expected close date)
  openW: number; // € offen gewichtet (summe × wsk)
  openN: number;
  created: number; // offers created (by Anlage date)
  fc: number; // € forecast deals with flag 1 (by close date)
  fcAll: number; // € all forecast deals
}

export function emptyAcc(): Acc {
  return { won: 0, wonN: 0, lostN: 0, tageWon: 0, customers: new Set(), openV: 0, openW: 0, openN: 0, created: 0, fc: 0, fcAll: 0 };
}

export function mergeAcc(into: Acc, a: Acc): Acc {
  into.won += a.won;
  into.wonN += a.wonN;
  into.lostN += a.lostN;
  into.tageWon += a.tageWon;
  for (const c of a.customers) into.customers.add(c);
  into.openV += a.openV;
  into.openW += a.openW;
  into.openN += a.openN;
  into.created += a.created;
  into.fc += a.fc;
  into.fcAll += a.fcAll;
  return into;
}

/** Sum of the given months (1..12) of a 12-month accumulator array. */
export function sumMonths(arr: Acc[], months: number[]): Acc {
  const out = emptyAcc();
  for (const m of months) if (arr[m - 1]) mergeAcc(out, arr[m - 1]);
  return out;
}

function matches(f: Filter, row: Record<Dim, string>): boolean {
  for (const d of Object.keys(f) as Dim[]) {
    const sel = f[d];
    if (sel && sel.length && !sel.includes(row[d])) return false;
  }
  return true;
}

/**
 * One pass over deals and forecast for a year: returns, per group key, an
 * array of 12 monthly accumulators. `groupBy` null puts everything under "".
 */
export function aggregate(data: SalesData, year: number, filter: Filter, groupBy: Dim | null): Map<string, Acc[]> {
  const out = new Map<string, Acc[]>();
  const bucket = (key: string, m: number) => {
    let arr = out.get(key);
    if (!arr) {
      arr = Array.from({ length: 12 }, emptyAcc);
      out.set(key, arr);
    }
    return arr[m - 1];
  };
  for (const d of data.deals) {
    if (!matches(filter, d)) continue;
    const key = groupBy ? d[groupBy] : '';
    if (d.closeY === year) {
      const a = bucket(key, d.closeM);
      if (d.status === 'gewonnen') {
        a.won += d.summe;
        a.wonN += 1;
        a.tageWon += d.tage;
        a.customers.add(d.kunde);
      } else if (d.status === 'verloren') {
        a.lostN += 1;
      } else {
        a.openV += d.summe;
        a.openW += (d.summe * d.wsk) / 100;
        a.openN += 1;
      }
    }
    if (d.createY === year) bucket(key, d.createM).created += 1;
  }
  for (const f of data.forecast) {
    if (f.closeY !== year || !matches(filter, f)) continue;
    const key = groupBy ? f[groupBy] : '';
    const a = bucket(key, f.closeM);
    a.fcAll += f.summe;
    if (f.flag === 1) a.fc += f.summe;
  }
  return out;
}

/** Last month (1..12) with reliable closed data for a year, given the snapshot. */
export function lastClosedMonth(data: SalesData, year: number): number {
  const ay = Number(data.asOf.slice(0, 4));
  const am = Number(data.asOf.slice(5, 7));
  if (year < ay) return 12;
  if (year === ay) return am;
  return 0;
}
