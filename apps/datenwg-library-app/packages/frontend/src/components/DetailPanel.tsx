import { ExternalLink, Play, Share2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useApp } from '@/hooks/app.context';
import {
  docActive,
  fmtDate,
  fmtTime,
  loadSegments,
  neighbourDocs,
  relatedConcepts,
  search,
  shortTitle,
  speakers,
  thumbnail,
  youtubeLink,
  type Claim,
  type Concept,
  type Doc,
  type Segment,
} from '@/lib/library';
import { toHash } from '@/lib/route';
import { cn } from '@/lib/utils';

import {
  Badge,
  Btn,
  ConceptChip,
  Empty,
  NodeLink,
  SectionTitle,
  TypeBadge,
} from './ui';

/** Right-hand panel: search results, a concept, a person, a document or a month. */
export function DetailPanel() {
  const { lib, route, monthPick, setMonthPick, select } = useApp();

  if (monthPick) {
    return (
      <MonthDetail
        conceptId={monthPick.conceptId}
        month={monthPick.month}
        onClose={() => setMonthPick(null)}
      />
    );
  }
  if (route.query.trim().length >= 2) return <SearchResults query={route.query} />;
  if (route.node) {
    const c = lib.conceptById.get(route.node);
    if (c) return <ConceptDetail key={c.id} c={c} />;
    const d = lib.docById.get(route.node);
    if (d) return <DocDetail key={d.id} d={d} />;
    return (
      <div className="p-500">
        <Empty>Diesen Knoten gibt es nicht (mehr).</Empty>
        <Btn onClick={() => select(null)}>Auswahl aufheben</Btn>
      </div>
    );
  }
  return <Intro />;
}

function Intro() {
  const { lib, filter, select } = useApp();
  const top = useMemo(
    () =>
      lib.concepts
        .filter((c) => c.type !== 'Person')
        .map((c) => ({ c, n: (lib.explainsByConcept.get(c.id) ?? []).length }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 8),
    [lib]
  );
  const active = lib.docs.filter((d) => docActive(d, filter)).length;
  return (
    <div className="p-500">
      <h2 className="font-heading text-500 font-semibold">Wähle einen Knoten</h2>
      <p className="mt-200 text-300 text-muted-foreground">
        Klick auf ein Thema, ein Tool, eine Person oder eine Folge. Hier erscheinen dann
        Belege, Kernaussagen und Sprungmarken ins Video.
      </p>
      <SectionTitle>Am häufigsten erklärt</SectionTitle>
      <div className="flex flex-wrap gap-200">
        {top.map(({ c, n }) => (
          <ConceptChip key={c.id} c={c} count={n} />
        ))}
      </div>
      <SectionTitle>Im Filter</SectionTitle>
      <p className="text-200 text-muted-foreground">
        {active} von {lib.docs.length} Dokumenten sichtbar.
      </p>
      <div className="mt-300">
        <Btn tone="primary" onClick={() => select('tool:direct-lake', 'graph')}>
          Beispiel: Direct Lake im Graph
        </Btn>
      </div>
    </div>
  );
}

function ShareButton() {
  const { route } = useApp();
  const [copied, setCopied] = useState(false);
  const url = `${location.origin}${location.pathname}${toHash(route)}`;
  return (
    <Btn
      title="Adresse dieser Sicht kopieren"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          window.prompt('Link kopieren:', url);
        }
      }}
    >
      <Share2 className="icon-size-100" aria-hidden="true" />
      {copied ? 'Kopiert' : 'Diese Sicht'}
    </Btn>
  );
}

function PanelHeader({
  title,
  badge,
  onClose,
}: {
  title: string;
  badge?: React.ReactNode;
  onClose?: () => void;
}) {
  const { select } = useApp();
  return (
    <div className="flex items-start justify-between gap-300">
      <h2 className="font-heading text-500 font-semibold leading-500">
        {title} {badge && <span className="ml-100 align-middle">{badge}</span>}
      </h2>
      <button
        type="button"
        aria-label="Schließen"
        className="rounded-md p-100 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => (onClose ? onClose() : select(null))}
      >
        <X className="icon-size-200" />
      </button>
    </div>
  );
}

function PrecisionBadge({ c }: { c: Claim }) {
  if (c.precision === 'word')
    return (
      <Badge tone="accent" title="Stelle im Transkript wiedergefunden, Sprung auf die Sekunde">
        auf die Sekunde
      </Badge>
    );
  if (c.startS != null)
    return <Badge title="Sprung auf den Anfang des Abschnitts">Abschnittsanfang</Badge>;
  return null;
}

function ClaimRow({ c, showDoc }: { c: Claim; showDoc?: boolean }) {
  const { lib } = useApp();
  const d = lib.docById.get(c.docId);
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-border py-300 last:border-0">
      <p className="text-300 leading-400">{c.text}</p>
      <div className="mt-200 flex flex-wrap items-center gap-200 text-200 text-muted-foreground">
        {d && c.startS != null && (
          <a
            href={youtubeLink(d, c.startS)}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-100 rounded-sm bg-warm px-200 py-100-nudge font-monospace text-100 font-medium text-warm-foreground hover:opacity-90"
          >
            <Play className="icon-size-100" aria-hidden="true" /> {fmtTime(c.startS)}
          </a>
        )}
        <Badge tone="outline">{c.kind || 'Aussage'}</Badge>
        <PrecisionBadge c={c} />
        {showDoc && d && <NodeLink id={d.id}>{shortTitle(d.title, 52)}</NodeLink>}
        {c.anchor && (
          <button
            type="button"
            className="text-200 underline-offset-2 hover:underline"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Zitat ausblenden' : 'Transkript-Zitat'}
          </button>
        )}
      </div>
      {open && c.anchor && (
        <blockquote className="mt-200 border-l-2 border-primary pl-300 text-200 italic text-muted-foreground">
          „{c.anchor}"
        </blockquote>
      )}
    </li>
  );
}

function DocRow({
  d,
  share,
  role,
  explains,
}: {
  d: Doc;
  share?: number;
  role?: string;
  explains?: boolean;
}) {
  const { lib } = useApp();
  const sp = speakers(lib, d.id)
    .map((x) => x.person.name)
    .join(', ');
  const thumb = thumbnail(d);
  return (
    <li className="flex gap-300 border-b border-border py-300 last:border-0">
      {thumb ? (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          className="h-[44px] w-[78px] shrink-0 rounded-sm object-cover"
        />
      ) : (
        <div className="flex h-[44px] w-[78px] shrink-0 items-center justify-center rounded-sm bg-muted font-monospace text-100 text-muted-foreground">
          Seite
        </div>
      )}
      <div className="min-w-0">
        <NodeLink id={d.id} className="line-clamp-2 text-300">
          {d.title}
        </NodeLink>
        <div className="mt-100 flex flex-wrap items-center gap-200 text-200 text-muted-foreground">
          <span>{sp || 'Solo'}</span>
          <span>·</span>
          <span className="font-monospace text-100">{fmtDate(d.published)}</span>
          {share != null && share > 0 && (
            <span className="font-monospace text-100">{Math.round(share * 100)} % der Segmente</span>
          )}
          {explains && <Badge tone="accent">erklärt</Badge>}
          {role && <Badge tone={role === 'host' ? 'warm' : 'muted'}>{role === 'host' ? 'Host' : 'Gast'}</Badge>}
        </div>
      </div>
    </li>
  );
}

function ConceptDetail({ c }: { c: Concept }) {
  const { lib, filter, route, setRoute } = useApp();
  const docs = useMemo(() => neighbourDocs(lib, c.id, filter), [lib, c.id, filter]);
  const explains = useMemo(
    () => new Set((lib.explainsByConcept.get(c.id) ?? []).map((e) => e.docId)),
    [lib, c.id]
  );
  const related = useMemo(() => relatedConcepts(lib, c.id, 12), [lib, c.id]);
  const claims = useMemo(
    () =>
      (lib.claimsByConcept.get(c.id) ?? []).filter((k) => {
        const d = lib.docById.get(k.docId);
        return d && docActive(d, filter);
      }),
    [lib, c.id, filter]
  );
  const segs = docs.reduce((a, x) => a + x.segments, 0);
  const [claimLimit, setClaimLimit] = useState(12);

  return (
    <div className="p-500">
      <PanelHeader title={c.name} badge={<TypeBadge type={c.type} />} />
      <p className="mt-200 text-200 text-muted-foreground">
        {docs.length} Dokumente im Zeitraum
        {c.type !== 'Person' && segs > 0 ? ` · ${segs} Segmente` : ''}
        {c.aliases.length > 0 && (
          <>
            {' '}
            · auch: <span className="font-monospace text-100">{c.aliases.join(', ')}</span>
          </>
        )}
      </p>
      <div className="mt-300 flex flex-wrap gap-200">
        <Btn
          active={route.view === 'graph' && route.focus}
          onClick={() => setRoute({ view: 'graph', focus: !route.focus })}
        >
          ⌖ Fokus im Graph
        </Btn>
        <Btn active={route.view === 'timeline'} onClick={() => setRoute({ view: 'timeline' })}>
          Zeitstrahl
        </Btn>
        <ShareButton />
      </div>

      {c.type === 'Person' && (
        <>
          <SectionTitle>Dabei in</SectionTitle>
          <ul>
            {docs.length === 0 && <Empty>keine im Zeitraum</Empty>}
            {docs.map((x) => (
              <DocRow key={x.doc.id} d={x.doc} role={x.role} explains={explains.has(x.doc.id)} />
            ))}
          </ul>
        </>
      )}

      {related.length > 0 && (
        <>
          <SectionTitle
            hint={
              <Badge title="Zwei Begriffe im selben Segment, gezählt, nicht bewertet">Heuristik</Badge>
            }
          >
            Ko-Vorkommen
          </SectionTitle>
          <div className="flex flex-wrap gap-200">
            {related.map((r) => (
              <ConceptChip key={r.other.id} c={r.other} count={r.weight} />
            ))}
          </div>
        </>
      )}

      {claims.length > 0 && (
        <>
          <SectionTitle
            hint={
              <Badge tone="accent" title="Automatisch aus dem Transkript extrahiert, nicht redaktionell geprüft">
                automatisch extrahiert
              </Badge>
            }
          >
            Kernaussagen ({claims.length})
          </SectionTitle>
          <ul>
            {claims.slice(0, claimLimit).map((k) => (
              <ClaimRow key={k.id} c={k} showDoc />
            ))}
          </ul>
          {claims.length > claimLimit && (
            <Btn className="mt-300" onClick={() => setClaimLimit((n) => n + 20)}>
              Mehr zeigen
            </Btn>
          )}
        </>
      )}

      {c.type !== 'Person' && (
        <>
          <SectionTitle>Dokumente (Stellen × Anteil)</SectionTitle>
          <ul>
            {docs.length === 0 && <Empty>keine im Zeitraum</Empty>}
            {docs.slice(0, 40).map((x) => (
              <DocRow key={x.doc.id} d={x.doc} share={x.share} explains={explains.has(x.doc.id)} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function DocDetail({ d }: { d: Doc }) {
  const { lib } = useApp();
  const sp = speakers(lib, d.id);
  const claims = lib.claimsByDoc.get(d.id) ?? [];
  const mentions = (lib.mentionsByDoc.get(d.id) ?? [])
    .map((m) => ({ c: lib.conceptById.get(m.conceptId), m }))
    .filter((x): x is { c: Concept; m: (typeof x)['m'] } => !!x.c)
    .sort((a, b) => b.m.segments - a.m.segments)
    .slice(0, 14);
  const explained = (lib.explainsByDoc.get(d.id) ?? [])
    .map((e) => lib.conceptById.get(e.conceptId))
    .filter((c): c is Concept => !!c);
  const bucket = lib.bucketById.get(lib.bucketOfDoc.get(d.id) ?? '');
  const [embed, setEmbed] = useState<number | null>(null);
  const [segments, setSegments] = useState<Segment[] | 'loading' | 'error' | null>(null);
  const thumb = thumbnail(d);

  async function showTranscript() {
    setSegments('loading');
    try {
      setSegments(await loadSegments(d.id));
    } catch {
      setSegments('error');
    }
  }

  return (
    <div className="p-500">
      <PanelHeader title={d.title} badge={<TypeBadge type="Document" />} />
      <div className="mt-200 flex flex-wrap items-center gap-200 text-200 text-muted-foreground">
        <span className="font-monospace text-100">{fmtDate(d.published)}</span>
        {bucket && <Badge tone="muted">{bucket.name}</Badge>}
        <Badge tone="outline">{d.source === 'youtube' ? 'Folge' : 'Seite'}</Badge>
        {d.nClaims > 0 && <Badge tone="accent">{d.nClaims} Kernaussagen</Badge>}
        {sp.map((x) => (
          <NodeLink key={x.person.id} id={x.person.id}>
            {x.person.name}
            <span className="ml-100 font-monospace text-100 text-muted-foreground">
              {x.role === 'host' ? 'Host' : 'Gast'}
            </span>
          </NodeLink>
        ))}
      </div>

      {d.ytId && (
        <div className="mt-300 overflow-hidden rounded-lg border border-border bg-muted">
          {embed != null ? (
            <iframe
              title={d.title}
              className="aspect-video w-full"
              src={`https://www.youtube-nocookie.com/embed/${d.ytId}?start=${Math.floor(embed)}&autoplay=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              className="group relative block w-full"
              onClick={() => setEmbed(0)}
              aria-label="Video laden"
            >
              {thumb && <img src={thumb} alt="" className="aspect-video w-full object-cover" />}
              <span className="absolute inset-0 flex items-center justify-center bg-foreground/30 transition-colors group-hover:bg-foreground/40">
                <span className="inline-flex items-center gap-200 rounded-full bg-warm px-400 py-200 text-300 font-semibold text-warm-foreground">
                  <Play className="icon-size-200" aria-hidden="true" /> Video laden
                </span>
              </span>
            </button>
          )}
        </div>
      )}

      <div className="mt-300 flex flex-wrap gap-200">
        <a
          href={d.url || youtubeLink(d, null)}
          target="_blank"
          rel="noopener"
          className="inline-flex h-800 items-center gap-200-nudge rounded-md border border-border bg-card px-300 text-200 font-medium hover:bg-accent"
        >
          <ExternalLink className="icon-size-100" aria-hidden="true" />
          {d.source === 'youtube' ? 'Auf YouTube öffnen' : 'Seite öffnen'}
        </a>
        <ShareButton />
      </div>

      {explained.length > 0 && (
        <>
          <SectionTitle>Erklärt</SectionTitle>
          <div className="flex flex-wrap gap-200">
            {explained.map((c) => (
              <ConceptChip key={c.id} c={c} />
            ))}
          </div>
        </>
      )}

      {mentions.length > 0 && (
        <>
          <SectionTitle>Themen in dieser Folge</SectionTitle>
          <div className="flex flex-wrap gap-200">
            {mentions.map((x) => (
              <ConceptChip key={x.c.id} c={x.c} count={x.m.segments} />
            ))}
          </div>
        </>
      )}

      {claims.length > 0 && (
        <>
          <SectionTitle
            hint={
              <Badge tone="accent" title="Automatisch aus dem Transkript extrahiert, nicht redaktionell geprüft">
                automatisch extrahiert
              </Badge>
            }
          >
            Kernaussagen im Verlauf ({claims.length})
          </SectionTitle>
          <ul>
            {claims.map((k) => (
              <li key={k.id} className="border-b border-border py-300 last:border-0">
                <div className="flex gap-300">
                  {k.startS != null && d.ytId ? (
                    <button
                      type="button"
                      title="Im Video an dieser Stelle starten"
                      onClick={() => setEmbed(k.startS!)}
                      className="h-fit shrink-0 rounded-sm bg-warm px-200 py-100-nudge font-monospace text-100 font-medium text-warm-foreground hover:opacity-90"
                    >
                      ▶ {fmtTime(k.startS)}
                    </button>
                  ) : (
                    <span className="h-fit shrink-0 rounded-sm bg-muted px-200 py-100-nudge font-monospace text-100 text-muted-foreground">
                      –
                    </span>
                  )}
                  <div>
                    <p className="text-300 leading-400">{k.text}</p>
                    <div className="mt-100 flex flex-wrap gap-200">
                      <Badge tone="outline">{k.kind || 'Aussage'}</Badge>
                      <PrecisionBadge c={k} />
                      {k.concepts
                        .map((id) => lib.conceptById.get(id))
                        .filter((c): c is Concept => !!c)
                        .slice(0, 3)
                        .map((c) => (
                          <NodeLink key={c.id} id={c.id} className="text-200 text-muted-foreground">
                            {c.name}
                          </NodeLink>
                        ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionTitle>Transkript</SectionTitle>
      {segments === null && (
        <Btn onClick={showTranscript}>
          {d.nSegments} Segmente laden
        </Btn>
      )}
      {segments === 'loading' && <Empty>Segmente werden geladen …</Empty>}
      {segments === 'error' && (
        <Empty>Die Segmente konnten nicht geladen werden. Bitte später erneut versuchen.</Empty>
      )}
      {Array.isArray(segments) && (
        <ol className="space-y-300">
          {segments.map((s) => (
            <li key={s.id} className="text-200 leading-300 text-muted-foreground">
              {s.heading && <div className="mb-100 font-medium text-foreground">{s.heading}</div>}
              {s.startS != null && d.ytId ? (
                <button
                  type="button"
                  onClick={() => setEmbed(s.startS!)}
                  className="mr-200 rounded-sm bg-muted px-200-nudge font-monospace text-100 hover:bg-accent hover:text-accent-foreground"
                >
                  ▶ {fmtTime(s.startS)}
                </button>
              ) : null}
              <span className={cn(s.text.length > 600 && 'line-clamp-6')}>{s.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function SearchResults({ query }: { query: string }) {
  const { lib, filter, select, setRoute } = useApp();
  const hits = useMemo(() => search(lib, query, filter), [lib, query, filter]);
  return (
    <div className="p-500">
      <PanelHeader title={`Suche: ${query}`} onClose={() => setRoute({ query: '' })} />
      {hits.length === 0 && (
        <Empty>Dazu gibt es in der Daten-WG keine Stelle. Versuch einen anderen Begriff.</Empty>
      )}
      <ul className="mt-300">
        {hits.map((h) => (
          <li key={h.kind + h.id} className="border-b border-border py-300 last:border-0">
            {h.kind === 'claim' ? (
              <button
                type="button"
                className="text-left"
                onClick={() => {
                  const c = lib.claimById.get(h.id);
                  if (c) select(c.docId);
                }}
              >
                <p className="text-300 leading-400">{h.title}</p>
                <p className="mt-100 text-200 text-muted-foreground">Kernaussage · {h.sub}</p>
              </button>
            ) : (
              <>
                <NodeLink id={h.id} className="text-300">
                  {h.title}
                </NodeLink>
                <p className="mt-100 text-200 text-muted-foreground">{h.sub}</p>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MonthDetail({
  conceptId,
  month,
  onClose,
}: {
  conceptId: string | null;
  month: string;
  onClose: () => void;
}) {
  const { lib, filter } = useApp();
  const c = conceptId ? lib.conceptById.get(conceptId) : undefined;
  const docs = lib.docs.filter((d) => docActive(d, filter) && d.published.startsWith(month));
  const explains = c ? new Set((lib.explainsByConcept.get(c.id) ?? []).map((e) => e.docId)) : new Set<string>();
  const rows = c
    ? docs.filter((d) =>
        c.type === 'Person'
          ? speakers(lib, d.id).some((s) => s.person.id === c.id)
          : (lib.mentionsByDoc.get(d.id) ?? []).some((m) => m.conceptId === c.id && m.share >= 0.05)
      )
    : docs;
  const [y, m] = month.split('-');
  const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  });
  return (
    <div className="p-500">
      <PanelHeader title={c ? `${c.name} · ${label}` : label} onClose={onClose} />
      <p className="mt-200 text-200 text-muted-foreground">{rows.length} Dokumente in diesem Monat</p>
      <ul className="mt-300">
        {rows.length === 0 && <Empty>keine</Empty>}
        {rows.map((d) => (
          <DocRow
            key={d.id}
            d={d}
            share={c ? (lib.mentionsByDoc.get(d.id) ?? []).find((x) => x.conceptId === c.id)?.share : undefined}
            explains={explains.has(d.id)}
          />
        ))}
      </ul>
    </div>
  );
}
