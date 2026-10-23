import { useMemo } from 'react';

import { useSemanticModelQuery } from '@/hooks/use-semantic-model-query';
import { buildSales } from '@/lib/sales/load';
import type { SalesData } from '@/lib/sales/model';
import { connection, salesQueries } from '@/queries/vertrieb';

export type SalesState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: SalesData };

function friendly(message: string): string {
  if (/401|403|forbidden|permission|unauthori/i.test(message))
    return 'Kein Zugriff auf das Semantikmodell „Vertriebscontrolling_Excel_based_3.0". Du brauchst Lese- und Build-Rechte im Workspace „DatenWG Library".';
  if (/capacity|429|throttl/i.test(message)) return 'Die Fabric-Kapazität ist gerade ausgelastet. Bitte in ein paar Minuten neu laden.';
  return message;
}

/** Loads offers, forecast deals and dimensions in parallel and builds the model once. */
export function useSalesData() {
  const angebote = useSemanticModelQuery({ connection, query: salesQueries.angebote });
  const forecast = useSemanticModelQuery({ connection, query: salesQueries.forecast });
  const dims = useSemanticModelQuery({ connection, query: salesQueries.dims });
  const all = [angebote, forecast, dims];
  const done = all.filter((q) => q.data?.status === 'success').length;

  const state: SalesState = useMemo(() => {
    for (const q of [angebote, forecast, dims]) {
      if (q.error) return { status: 'error', message: friendly(q.error.message) };
      if (q.data?.status === 'error') return { status: 'error', message: friendly(q.data.error.message) };
    }
    if (angebote.data?.status === 'success' && forecast.data?.status === 'success' && dims.data?.status === 'success') {
      try {
        return { status: 'ready', data: buildSales({ angebote: angebote.data.table, forecast: forecast.data.table, dims: dims.data.table }) };
      } catch (e) {
        return { status: 'error', message: e instanceof Error ? e.message : String(e) };
      }
    }
    return { status: 'loading' };
  }, [angebote, forecast, dims]);

  return { state, progress: { done, total: all.length }, refetch: () => Promise.all(all.map((q) => q.refetch())) };
}
