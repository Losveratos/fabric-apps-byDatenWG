import { useMemo } from 'react';

import { useSemanticModelQuery } from '@/hooks/use-semantic-model-query';
import { buildRhein } from '@/lib/rhein/load';
import type { RheinData } from '@/lib/rhein/model';
import { connection, rheinQueries } from '@/queries/rhein';

export type RheinState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: RheinData };

function friendly(message: string): string {
  if (/401|403|forbidden|permission|unauthori/i.test(message))
    return 'Kein Zugriff auf das Semantikmodell „Rhein Köln Abfluss". Du brauchst Lese- und Build-Rechte im Workspace des Modells.';
  if (/capacity|429|throttl/i.test(message)) return 'Die Fabric-Kapazität ist gerade ausgelastet. Bitte in ein paar Minuten neu laden.';
  return message;
}

/** Loads all daily values and the station row, then builds the model once. */
export function useRheinData() {
  const tage = useSemanticModelQuery({ connection, query: rheinQueries.tage });
  const station = useSemanticModelQuery({ connection, query: rheinQueries.station });
  const all = [tage, station];
  const done = all.filter((q) => q.data?.status === 'success').length;

  const state: RheinState = useMemo(() => {
    for (const q of [tage, station]) {
      if (q.error) return { status: 'error', message: friendly(q.error.message) };
      if (q.data?.status === 'error') return { status: 'error', message: friendly(q.data.error.message) };
    }
    if (tage.data?.status === 'success' && station.data?.status === 'success') {
      try {
        return { status: 'ready', data: buildRhein({ tage: tage.data.table, station: station.data.table }) };
      } catch (e) {
        return { status: 'error', message: e instanceof Error ? e.message : String(e) };
      }
    }
    return { status: 'loading' };
  }, [tage, station]);

  return { state, progress: { done, total: all.length }, refetch: () => Promise.all(all.map((q) => q.refetch())) };
}
