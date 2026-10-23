// Parses the connector's query tables into the in-browser Rhine model.

import { percentileInc, REF_FROM, REF_TO, type Day, type RheinData, type Station } from './model';

export interface QueryTableLike {
  columns: { name: string }[];
  rows: unknown[][];
}

function cols(t: QueryTableLike) {
  const idx = new Map<string, number>();
  t.columns.forEach((c, i) => idx.set(c.name.replace(/^.*\[/, '').replace(/\]$/, ''), i));
  return (name: string) => idx.get(name);
}

const str = (v: unknown) => (v == null ? '' : String(v)).trim();
const num = (v: unknown) => {
  if (v == null || v === '') return NaN;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export interface RheinTables {
  tage: QueryTableLike;
  station: QueryTableLike;
}

export function buildRhein(t: RheinTables): RheinData {
  const c = cols(t.tage);
  const iD = c('d');
  const iQ = c('q');
  const iQ7 = c('q7');
  if (iD === undefined || iQ === undefined) throw new Error('Spalten "d" oder "q" fehlen im Abfrageergebnis.');

  const days: Day[] = [];
  for (const r of t.tage.rows) {
    const date = str(r[iD]).slice(0, 10);
    const q = num(r[iQ]);
    if (!date || !Number.isFinite(q)) continue;
    const q7 = iQ7 === undefined ? NaN : num(r[iQ7]);
    days.push({ date, y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)), q, q7: Number.isFinite(q7) ? q7 : null });
  }
  if (!days.length) throw new Error('Das Semantikmodell liefert keine Tageswerte.');
  days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Complete years: 12 months with data.
  const monthsPerYear = new Map<number, Set<number>>();
  for (const d of days) {
    let s = monthsPerYear.get(d.y);
    if (!s) monthsPerYear.set(d.y, (s = new Set()));
    s.add(d.m);
  }
  const years = [...monthsPerYear.entries()].filter(([, s]) => s.size === 12).map(([y]) => y).sort((a, b) => a - b);

  const p05 = percentileInc(
    days.filter((d) => d.y >= REF_FROM && d.y <= REF_TO && (d.m === 8 || d.m === 9)).map((d) => d.q),
    0.05
  );

  const cs = cols(t.station);
  const r0 = t.station.rows[0] ?? [];
  const g = (n: string) => {
    const i = cs(n);
    return i === undefined ? undefined : r0[i];
  };
  const station: Station = {
    station: str(g('station')) || 'Köln',
    fluss: str(g('fluss')) || 'Rhein',
    einzugsgebiet: num(g('einzugsgebiet')),
    quelle: str(g('quelle')),
    lizenz: str(g('lizenz')),
    stand: str(g('stand')),
  };

  return { days, years, station, p05, asOf: days[days.length - 1].date };
}
