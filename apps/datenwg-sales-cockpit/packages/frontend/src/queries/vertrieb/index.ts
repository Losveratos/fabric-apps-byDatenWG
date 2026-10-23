import angebote from './angebote.dax?raw';
import dims from './dims.dax?raw';
import forecast from './forecast.dax?raw';

/** Connector name from rayfin/rayfin.yml. */
export const connection = 'vertrieb';

/** Three queries; everything else is computed in the browser. */
export const salesQueries = { angebote, forecast, dims } as const;
