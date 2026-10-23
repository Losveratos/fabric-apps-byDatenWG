import jahreQuery from './jahre.dax?raw';
import kontenQuery from './konten.dax?raw';
import kontowerteQuery from './kontowerte.dax?raw';
import monatsverlaufQuery from './monatsverlauf.dax?raw';

/** Connector name from rayfin/rayfin.yml. */
const connection = 'guv';

const withYear = (q: string, year: number) => q.replaceAll('{{YEAR}}', String(Math.trunc(year)));

/** Account tree incl. formula, KPI and separator lines. */
export function konten() {
  return { connection, query: kontenQuery };
}

/** Available years and last month with actuals. */
export function jahre() {
  return { connection, query: jahreQuery };
}

/** Per-account AC, FC (AC+FC), PL, PY and YTD comparisons for one fiscal year. */
export function kontowerte(year: number) {
  return { connection, query: withYear(kontowerteQuery, year) };
}

/** Monthly values per top-level line and sign for one fiscal year. */
export function monatsverlauf(year: number) {
  return { connection, query: withYear(monatsverlaufQuery, year) };
}
