import station from './station.dax?raw';
import tage from './tage.dax?raw';

/** Connector name from rayfin/rayfin.yml. */
export const connection = 'rhein';

/** Two queries; everything else is computed in the browser. */
export const rheinQueries = { tage, station } as const;
