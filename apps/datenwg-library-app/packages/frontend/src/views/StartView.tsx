import { VegaVisual, useCssTheme } from '@microsoft/fabric-visuals';
import type { VisualizationSpec } from '@microsoft/fabric-visuals';
import { useMemo } from 'react';

import { ConceptChip, NodeLink } from '@/components/ui';
import { TYPE_BG } from '@/lib/node-types';
import { useApp } from '@/hooks/app.context';
import { docActive, fmtDate, speakers, thumbnail } from '@/lib/library';
import { cn } from '@/lib/utils';

const BUCKET_CLASS: Record<string, string> = {
  'bucket:bucket-1': 'bg-node-doc',
  'bucket:bucket-2': 'bg-node-tool',
  'bucket:bucket-3': 'bg-node-topic',
  'bucket:bucket-4': 'bg-destructive',
  'bucket:bucket-5': 'bg-node-person',
  'bucket:bucket-6': 'bg-primary',
  'bucket:bucket-7': 'bg-node-person',
  'bucket:bucket-8': 'bg-node-org',
  'bucket:bucket-9': 'bg-node-bucket',
};

import monthsBase from '../queries/documents-per-month.vl.json';

/** Static spec (schema-validated) plus the current month counts as inline values. */
const monthsSpec = (values: { Monat: string; Dokumente: number }[]): VisualizationSpec =>
  ({ ...monthsBase, data: { values } }) as VisualizationSpec;

/** Landing view: numbers, themed entry points and the newest episodes. */
export function StartView() {
  const { lib, filter, setRoute, select } = useApp();
  const theme = useCssTheme();

  const active = useMemo(() => lib.docs.filter((d) => docActive(d, filter)), [lib, filter]);
  const episodes = active.filter((d) => d.source === 'youtube').length;
  const pages = active.length - episodes;
  const claims = useMemo(
    () => lib.claims.filter((c) => lib.docById.get(c.docId) && docActive(lib.docById.get(c.docId)!, filter)),
    [lib, filter]
  );
  const onSecond = claims.filter((c) => c.precision === 'word').length;

  const buckets = useMemo(
    () =>
      lib.buckets
        .map((b) => ({
          b,
          n: active.filter((d) => lib.bucketOfDoc.get(d.id) === b.id).length,
        }))
        .filter((x) => x.n > 0),
    [lib, active]
  );

  const topExplained = useMemo(
    () =>
      lib.concepts
        .filter((c) => c.type !== 'Person')
        .map((c) => ({
          c,
          n: (lib.explainsByConcept.get(c.id) ?? []).filter((e) => {
            const d = lib.docById.get(e.docId);
            return d && docActive(d, filter);
          }).length,
        }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n)
        .slice(0, 14),
    [lib, filter]
  );

  const people = useMemo(
    () =>
      lib.concepts
        .filter((c) => c.type === 'Person')
        .map((c) => ({
          c,
          n: (lib.speaksByPerson.get(c.id) ?? []).filter((s) => {
            const d = lib.docById.get(s.docId);
            return d && docActive(d, filter);
          }).length,
        }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n)
        .slice(0, 10),
    [lib, filter]
  );

  const monthValues = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of active) {
      if (!d.published) continue;
      const k = d.published.slice(0, 7) + '-01';
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, n]) => ({ Monat: k, Dokumente: n }));
  }, [active]);
  const monthSpec = useMemo<VisualizationSpec>(() => monthsSpec(monthValues), [monthValues]);

  const newest = active.filter((d) => d.source === 'youtube').slice(0, 6);

  return (
    <div className="mx-auto max-w-[1100px] p-500 lg:p-700">
      <section className="grid gap-400 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-monospace text-100 uppercase tracking-widest text-warm">Daten-WG · Knowledge Kitchen</p>
          <h1 className="mt-200 font-heading text-hero-800 leading-hero-800 font-bold tracking-tight lg:text-hero-900 lg:leading-hero-900">
            Was wurde wann von wem gesagt?
          </h1>
          <p className="mt-300 max-w-[52ch] text-400 leading-500 text-muted-foreground">
            Jede Folge der Daten-WG als Wissensgraph: Themen, Tools, Personen und Kernaussagen mit Sprung ins
            Video auf die Sekunde. Live aus dem Fabric Lakehouse.
          </p>
          <div className="mt-400 flex flex-wrap gap-200">
            <button
              type="button"
              className="rounded-md bg-primary px-400 py-200 text-300 font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => setRoute({ view: 'graph' })}
            >
              Graph öffnen
            </button>
            <button
              type="button"
              className="rounded-md border border-border bg-card px-400 py-200 text-300 font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => setRoute({ view: 'timeline' })}
            >
              Zeitstrahl
            </button>
            <button
              type="button"
              className="rounded-md border border-border bg-card px-400 py-200 text-300 font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => select('tool:direct-lake', 'graph')}
            >
              Wer erklärt Direct Lake?
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-300 self-start">
          <Stat n={episodes} label="Folgen" />
          <Stat n={pages} label="Seiten" />
          <Stat n={claims.length} label="Kernaussagen" sub={`${onSecond} auf die Sekunde`} />
          <Stat n={lib.concepts.length} label="Knoten" sub={`${lib.relates.length} Verbindungen`} />
        </div>
      </section>

      <section className="mt-700">
        <h2 className="font-heading text-500 font-semibold">Themenbereiche</h2>
        <div className="mt-300 grid grid-cols-2 gap-300 sm:grid-cols-3 lg:grid-cols-5">
          {buckets.map(({ b, n }) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setRoute({ view: 'list', node: null, query: '' })}
              className="group flex flex-col items-start rounded-lg border border-border bg-card p-300 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className={cn('mb-200 h-100 w-[32px] rounded-full', BUCKET_CLASS[b.id] ?? 'bg-node-bucket')} />
              <span className="text-300 font-medium leading-400">{b.name}</span>
              <span className="mt-100 font-monospace text-100 text-muted-foreground">{n} Folgen</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-700 grid gap-500 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="font-heading text-500 font-semibold">Am häufigsten erklärt</h2>
          <p className="mt-100 text-200 text-muted-foreground">Belegte Erklärungen aus Kernaussagen, nicht nur Erwähnungen.</p>
          <div className="mt-300 flex flex-wrap gap-200">
            {topExplained.map(({ c, n }) => (
              <ConceptChip key={c.id} c={c} count={n} />
            ))}
          </div>
          <h2 className="mt-600 font-heading text-500 font-semibold">Wer spricht</h2>
          <div className="mt-300 flex flex-wrap gap-200">
            {people.map(({ c, n }) => (
              <ConceptChip key={c.id} c={c} count={n} />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-400">
          <h2 className="font-heading text-300 font-semibold">Dokumente pro Monat</h2>
          <div className="mt-200 h-[220px]">
            {monthValues.length > 0 ? (
              <VegaVisual spec={monthSpec} theme={theme} style={{ height: 220 }} />
            ) : (
              <p className="text-200 text-muted-foreground">Keine datierten Dokumente im Filter.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-700">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-500 font-semibold">Neueste Folgen</h2>
          <button type="button" className="text-200 text-primary hover:underline" onClick={() => setRoute({ view: 'list' })}>
            Alle in der Liste
          </button>
        </div>
        <div className="mt-300 grid gap-300 sm:grid-cols-2 lg:grid-cols-3">
          {newest.map((d) => {
            const thumb = thumbnail(d);
            const sp = speakers(lib, d.id)
              .map((x) => x.person.name)
              .join(', ');
            const bucket = lib.bucketById.get(lib.bucketOfDoc.get(d.id) ?? '');
            return (
              <article key={d.id} className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary">
                {thumb && (
                  <NodeLink id={d.id} className="block">
                    <img src={thumb} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                  </NodeLink>
                )}
                <div className="p-300">
                  {bucket && (
                    <span className={cn('mb-200 inline-block rounded-sm px-200-nudge py-100-nudge font-monospace text-100 font-medium text-white', BUCKET_CLASS[bucket.id] ?? TYPE_BG.Bucket)}>
                      {bucket.name}
                    </span>
                  )}
                  <NodeLink id={d.id} className="line-clamp-2 text-300 leading-400">
                    {d.title}
                  </NodeLink>
                  <p className="mt-200 text-200 text-muted-foreground">
                    {sp || 'Solo'} · <span className="font-monospace text-100">{fmtDate(d.published)}</span>
                    {d.nClaims > 0 && <> · {d.nClaims} Kernaussagen</>}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="mt-800 border-t border-border pt-400 text-200 text-muted-foreground">
        Stand der Daten: {fmtDate(lib.docs.find((d) => d.published)?.published ?? '')} · Quelle: Lakehouse
        „DatenWGLibrary" · Kernaussagen sind automatisch extrahiert und nicht redaktionell geprüft.
      </footer>
    </div>
  );
}

function Stat({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-300">
      <div className="font-numeric text-hero-700 leading-hero-700 font-semibold tabular-nums">{n.toLocaleString('de-DE')}</div>
      <div className="text-200 font-medium">{label}</div>
      {sub && <div className="font-monospace text-100 text-muted-foreground">{sub}</div>}
    </div>
  );
}
