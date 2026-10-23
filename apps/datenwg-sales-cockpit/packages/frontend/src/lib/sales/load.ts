// Parses the connector's query tables into the in-browser sales model.

import type { Deal, DealStatus, Dim, FcDeal, SalesData } from './model';

export interface QueryTableLike {
  columns: { name: string }[];
  rows: unknown[][];
}

function cols(t: QueryTableLike) {
  const idx = new Map<string, number>();
  t.columns.forEach((c, i) => idx.set(c.name.replace(/^.*\[/, '').replace(/\]$/, ''), i));
  return (name: string) => {
    const i = idx.get(name);
    if (i === undefined) throw new Error(`Spalte "${name}" fehlt im Abfrageergebnis.`);
    return i;
  };
}

/** Trims also non-breaking spaces (the model's Bundesland values start with U+00A0). */
const str = (v: unknown) => (v == null ? '' : String(v)).replace(/^[\s\u00a0]+|[\s\u00a0]+$/g, '');
const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const day = (v: unknown) => str(v).slice(0, 10);

export interface SalesTables {
  angebote: QueryTableLike;
  forecast: QueryTableLike;
  dims: QueryTableLike;
}

export function buildSales(t: SalesTables, asOf = '2023-04-30'): SalesData {
  // Dimension lookups for the forecast table (product id, city → state).
  const cd = cols(t.dims);
  const product = new Map<string, { gruppe: string; typ: string }>();
  const city = new Map<string, string>();
  for (const r of t.dims.rows) {
    const art = str(r[cd('art')]);
    if (art === 'produkt') product.set(str(r[cd('key')]), { gruppe: str(r[cd('a')]), typ: str(r[cd('b')]) });
    else if (art === 'stadt') city.set(str(r[cd('key')]), str(r[cd('a')]));
  }

  const ca = cols(t.angebote);
  const g = (r: unknown[], n: string) => r[ca(n)];
  const deals: Deal[] = [];
  for (const r of t.angebote.rows) {
    const status = str(g(r, 'status')) as DealStatus;
    const abschluss = day(g(r, 'abschluss'));
    const anlage = day(g(r, 'anlage'));
    if (!abschluss || !['gewonnen', 'offen', 'verloren'].includes(status)) continue;
    deals.push({
      id: num(g(r, 'id')),
      topic: str(g(r, 'topic')).replace(/\s+\|/g, ' |'),
      kunde: str(g(r, 'kunde')),
      vertriebler: str(g(r, 'vertriebler')),
      stadt: str(g(r, 'stadt')),
      bundesland: str(g(r, 'bundesland')) || 'ohne Bundesland',
      gruppe: str(g(r, 'gruppe')) || 'ohne Produkt',
      typ: str(g(r, 'typ')) || 'ohne Typ',
      summe: num(g(r, 'summe')),
      menge: num(g(r, 'menge')),
      status,
      wsk: num(g(r, 'wsk')),
      anlage,
      abschluss,
      tage: num(g(r, 'tage')),
      closeY: Number(abschluss.slice(0, 4)),
      closeM: Number(abschluss.slice(5, 7)),
      createY: anlage ? Number(anlage.slice(0, 4)) : 0,
      createM: anlage ? Number(anlage.slice(5, 7)) : 0,
    });
  }

  const cf = cols(t.forecast);
  const forecast: FcDeal[] = [];
  for (const r of t.forecast.rows) {
    const abschluss = day(r[cf('abschluss')]);
    if (!abschluss) continue;
    const p = product.get(str(r[cf('produktId')]));
    const stadt = str(r[cf('stadt')]);
    forecast.push({
      topic: str(r[cf('topic')]).replace(/\s+\|/g, ' |'),
      kunde: str(r[cf('kunde')]),
      vertriebler: str(r[cf('vertriebler')]),
      stadt,
      bundesland: city.get(stadt) ?? 'ohne Bundesland',
      gruppe: p?.gruppe ?? 'ohne Produkt',
      typ: p?.typ ?? 'ohne Typ',
      summe: num(r[cf('summe')]),
      abschluss,
      closeY: Number(abschluss.slice(0, 4)),
      closeM: Number(abschluss.slice(5, 7)),
      flag: num(r[cf('flag')]) === 1 ? 1 : 0,
    });
  }

  const dims: Dim[] = ['vertriebler', 'bundesland', 'stadt', 'gruppe', 'typ', 'kunde'];
  const members = {} as Record<Dim, string[]>;
  for (const d of dims) {
    const s = new Set<string>();
    for (const x of deals) s.add(x[d]);
    for (const x of forecast) s.add(x[d]);
    members[d] = [...s].filter(Boolean).sort((a, b) => a.localeCompare(b, 'de'));
  }
  const years = [...new Set(deals.filter((d) => d.status === 'gewonnen').map((d) => d.closeY))].sort();
  return { deals, forecast, asOf, years, members };
}
