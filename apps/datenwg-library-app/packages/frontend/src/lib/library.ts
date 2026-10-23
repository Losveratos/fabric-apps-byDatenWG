// Data layer of the DatenWG Library app.
//
// Loads the knowledge graph tables from the Lakehouse SQL endpoint through the
// typed `library` connector and builds an in-memory graph with indexes. All
// tables are small (hundreds to a few thousand rows), so one load per session
// keeps every view instant. Segments (transcript text) are loaded on demand.

import { getRayfinClient } from './rayfin-client';

export type NodeType =
  | 'Document'
  | 'Topic'
  | 'Tool'
  | 'Person'
  | 'Organization'
  | 'Bucket';

export interface Doc {
  id: string;
  title: string;
  source: 'youtube' | 'markdown' | string;
  published: string; // ISO date or ''
  url: string;
  coverage: string;
  format: string;
  bucket: string;
  nClaims: number;
  nSegments: number;
  ytId: string | null;
}

export interface Concept {
  id: string;
  name: string;
  type: NodeType;
  aliases: string[];
  docCount: number;
}

export interface Claim {
  id: string;
  text: string;
  kind: string;
  docId: string;
  startS: number | null;
  precision: string;
  anchor: string;
  anchorScore: number | null;
  concepts: string[];
}

export interface Mention {
  docId: string;
  conceptId: string;
  share: number;
  segments: number;
}

export interface Explains {
  docId: string;
  conceptId: string;
  evidence: string;
}

export interface SpeaksIn {
  personId: string;
  docId: string;
  role: 'host' | 'guest' | string;
}

export interface RelatesTo {
  a: string;
  b: string;
  weight: number;
}

export interface Bucket {
  id: string;
  name: string;
}

export interface Segment {
  id: string;
  docId: string;
  ordinal: number;
  text: string;
  heading: string;
  startS: number | null;
  endS: number | null;
}

export interface Library {
  docs: Doc[];
  docById: Map<string, Doc>;
  concepts: Concept[]; // topics, tools, organisations and persons
  conceptById: Map<string, Concept>;
  buckets: Bucket[];
  bucketById: Map<string, Bucket>;
  claims: Claim[];
  claimById: Map<string, Claim>;
  mentions: Mention[];
  explains: Explains[];
  speaks: SpeaksIn[];
  relates: RelatesTo[];
  // indexes
  mentionsByConcept: Map<string, Mention[]>;
  mentionsByDoc: Map<string, Mention[]>;
  explainsByConcept: Map<string, Explains[]>;
  explainsByDoc: Map<string, Explains[]>;
  speaksByDoc: Map<string, SpeaksIn[]>;
  speaksByPerson: Map<string, SpeaksIn[]>;
  relatesByConcept: Map<string, RelatesTo[]>;
  claimsByDoc: Map<string, Claim[]>;
  claimsByConcept: Map<string, Claim[]>;
  bucketOfDoc: Map<string, string>;
  loadedAt: Date;
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const arr = m.get(k);
  if (arr) arr.push(v);
  else m.set(k, [v]);
}

/** Text columns may arrive as string, number, Date or null depending on the gateway. */
function str(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    const o = v as { value?: unknown; toString?: () => string };
    if ('value' in o) return str(o.value);
  }
  return String(v);
}

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function conceptType(kind: string | undefined, id: string): NodeType {
  const k = (kind ?? '').toLowerCase();
  if (k === 'tool' || id.startsWith('tool:')) return 'Tool';
  if (k === 'person' || id.startsWith('person:')) return 'Person';
  if (k === 'organization' || k === 'org' || id.startsWith('org:'))
    return 'Organization';
  return 'Topic';
}

/** Unbounded single page (every table is far below DAB's 100k row ceiling). */
const ALL = -1;

export async function loadLibrary(): Promise<Library> {
  const client = await getRayfinClient();
  const lib = client.connectors.library;

  const [
    docRows,
    conceptRows,
    personRows,
    bucketRows,
    claimRows,
    aboutRows,
    mentionRows,
    explainRows,
    speakRows,
    relateRows,
    inBucketRows,
  ] = await Promise.all([
    lib.LibDocument.select([
      'id',
      'title',
      'source',
      'published',
      'url',
      'coverage',
      'format',
      'bucket',
      'nClaims',
      'nSegments',
    ])
      .first(ALL)
      .execute(),
    lib.LibConcept.select(['id', 'name', 'kind', 'aliases', 'docCount'])
      .first(ALL)
      .execute(),
    lib.LibPerson.select(['id', 'name', 'docCount']).first(ALL).execute(),
    lib.LibBucket.select(['id', 'name']).first(ALL).execute(),
    lib.LibClaim.select([
      'id',
      'text',
      'kind',
      'docId',
      'startS',
      'precision',
      'anchor',
      'anchorScore',
    ])
      .first(ALL)
      .execute(),
    lib.EdgeAbout.select(['src', 'dst']).first(ALL).execute(),
    lib.EdgeMentions.select(['src', 'dst', 'share', 'segments'])
      .first(ALL)
      .execute(),
    lib.EdgeExplains.select(['src', 'dst', 'evidence']).first(ALL).execute(),
    lib.EdgeSpeaksIn.select(['src', 'dst', 'role']).first(ALL).execute(),
    lib.EdgeRelatesTo.select(['src', 'dst', 'weight']).first(ALL).execute(),
    lib.EdgeInBucket.select(['src', 'dst']).first(ALL).execute(),
  ]);

  const docs: Doc[] = docRows
    .filter((r) => r.id)
    .map((r) => ({
      id: str(r.id),
      title: str(r.title),
      source: str(r.source),
      published: str(r.published).slice(0, 10),
      url: str(r.url),
      coverage: str(r.coverage),
      format: str(r.format),
      bucket: str(r.bucket),
      nClaims: num(r.nClaims),
      nSegments: num(r.nSegments),
      ytId: str(r.id).startsWith('yt:') ? str(r.id).slice(3) : null,
    }));
  docs.sort((a, b) => b.published.localeCompare(a.published));
  const docById = new Map(docs.map((d) => [d.id, d]));

  const concepts: Concept[] = [
    ...conceptRows
      .filter((r) => r.id)
      .map((r) => ({
        id: str(r.id),
        name: str(r.name) || str(r.id),
        type: conceptType(str(r.kind), r.id!),
        aliases: (str(r.aliases))
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean),
        docCount: num(r.docCount),
      })),
    ...personRows
      .filter((r) => r.id)
      .map((r) => ({
        id: str(r.id),
        name: str(r.name) || str(r.id),
        type: 'Person' as NodeType,
        aliases: [],
        docCount: num(r.docCount),
      })),
  ];
  const conceptById = new Map(concepts.map((c) => [c.id, c]));

  const buckets: Bucket[] = bucketRows
    .filter((r) => r.id)
    .map((r) => ({ id: str(r.id), name: str(r.name) || str(r.id) }));
  const bucketById = new Map(buckets.map((b) => [b.id, b]));

  const claimsByConceptTmp = new Map<string, string[]>();
  for (const r of aboutRows) {
    if (r.src && r.dst) push(claimsByConceptTmp, str(r.src), str(r.dst));
  }
  const claims: Claim[] = claimRows
    .filter((r) => r.id)
    .map((r) => ({
      id: str(r.id),
      text: str(r.text),
      kind: str(r.kind),
      docId: str(r.docId),
      startS: numOrNull(r.startS),
      precision: str(r.precision),
      anchor: str(r.anchor),
      anchorScore: numOrNull(r.anchorScore),
      concepts: claimsByConceptTmp.get(str(r.id)) ?? [],
    }));
  claims.sort((a, b) => (a.startS ?? 0) - (b.startS ?? 0));
  const claimById = new Map(claims.map((c) => [c.id, c]));

  const mentions: Mention[] = mentionRows
    .filter((r) => r.src && r.dst)
    .map((r) => ({
      docId: str(r.src),
      conceptId: str(r.dst),
      share: num(r.share),
      segments: num(r.segments),
    }));
  const explains: Explains[] = explainRows
    .filter((r) => r.src && r.dst)
    .map((r) => ({
      docId: str(r.src),
      conceptId: str(r.dst),
      evidence: str(r.evidence),
    }));
  const speaks: SpeaksIn[] = speakRows
    .filter((r) => r.src && r.dst)
    .map((r) => ({ personId: str(r.src), docId: str(r.dst), role: str(r.role) }));
  const relates: RelatesTo[] = relateRows
    .filter((r) => r.src && r.dst)
    .map((r) => ({ a: str(r.src), b: str(r.dst), weight: num(r.weight) }));

  const mentionsByConcept = new Map<string, Mention[]>();
  const mentionsByDoc = new Map<string, Mention[]>();
  for (const m of mentions) {
    push(mentionsByConcept, m.conceptId, m);
    push(mentionsByDoc, m.docId, m);
  }
  const explainsByConcept = new Map<string, Explains[]>();
  const explainsByDoc = new Map<string, Explains[]>();
  for (const e of explains) {
    push(explainsByConcept, e.conceptId, e);
    push(explainsByDoc, e.docId, e);
  }
  const speaksByDoc = new Map<string, SpeaksIn[]>();
  const speaksByPerson = new Map<string, SpeaksIn[]>();
  for (const s of speaks) {
    push(speaksByDoc, s.docId, s);
    push(speaksByPerson, s.personId, s);
  }
  const relatesByConcept = new Map<string, RelatesTo[]>();
  for (const r of relates) {
    push(relatesByConcept, r.a, r);
    push(relatesByConcept, r.b, r);
  }
  const claimsByDoc = new Map<string, Claim[]>();
  const claimsByConcept = new Map<string, Claim[]>();
  for (const c of claims) {
    push(claimsByDoc, c.docId, c);
    for (const cid of c.concepts) push(claimsByConcept, cid, c);
  }
  const bucketOfDoc = new Map<string, string>();
  for (const r of inBucketRows) {
    if (r.src && r.dst) bucketOfDoc.set(str(r.src), str(r.dst));
  }

  return {
    docs,
    docById,
    concepts,
    conceptById,
    buckets,
    bucketById,
    claims,
    claimById,
    mentions,
    explains,
    speaks,
    relates,
    mentionsByConcept,
    mentionsByDoc,
    explainsByConcept,
    explainsByDoc,
    speaksByDoc,
    speaksByPerson,
    relatesByConcept,
    claimsByDoc,
    claimsByConcept,
    bucketOfDoc,
    loadedAt: new Date(),
  };
}

/** Transcript segments of one document, loaded on demand. */
export async function loadSegments(docId: string): Promise<Segment[]> {
  const client = await getRayfinClient();
  const rows = await client.connectors.library.LibSegment.select([
    'id',
    'docId',
    'ordinal',
    'text',
    'heading',
    'startS',
    'endS',
  ])
    .where({ docId: { eq: docId } })
    .orderBy({ ordinal: 'asc' })
    .first(2000)
    .execute();
  return rows
    .filter((r) => r.id)
    .map((r) => ({
      id: str(r.id),
      docId: str(r.docId) || docId,
      ordinal: num(r.ordinal),
      text: str(r.text),
      heading: str(r.heading),
      startS: numOrNull(r.startS),
      endS: numOrNull(r.endS),
    }));
}

// ---------- Filters and helpers ----------

export type TimeRange = 'all' | '3m' | '12m' | '2026' | '2025' | '2024';

export function timeRangeStart(range: TimeRange, now = new Date()): string {
  if (range === 'all') return '';
  if (range === '3m' || range === '12m') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (range === '3m' ? 3 : 12));
    return d.toISOString().slice(0, 10);
  }
  return `${range}-01-01`;
}

export function timeRangeEnd(range: TimeRange): string {
  if (/^\d{4}$/.test(range)) return `${range}-12-31`;
  return '9999-12-31';
}

export interface DocFilter {
  range: TimeRange;
  sources: Set<string>;
}

export function docActive(d: Doc, f: DocFilter): boolean {
  if (!f.sources.has(d.source)) return false;
  if (f.range === 'all') return true;
  if (!d.published) return false;
  return (
    d.published >= timeRangeStart(f.range) && d.published <= timeRangeEnd(f.range)
  );
}

/** Documents that mention a concept (or in which a person speaks), active filter, weighted. */
export function neighbourDocs(
  lib: Library,
  id: string,
  f: DocFilter
): { doc: Doc; share: number; segments: number; role?: string }[] {
  const c = lib.conceptById.get(id);
  if (!c) return [];
  if (c.type === 'Person') {
    return (lib.speaksByPerson.get(id) ?? [])
      .map((s) => ({ doc: lib.docById.get(s.docId)!, share: 1, segments: 0, role: s.role }))
      .filter((x) => x.doc && docActive(x.doc, f))
      .sort((a, b) => b.doc.published.localeCompare(a.doc.published));
  }
  return (lib.mentionsByConcept.get(id) ?? [])
    .map((m) => ({ doc: lib.docById.get(m.docId)!, share: m.share, segments: m.segments }))
    .filter((x) => x.doc && docActive(x.doc, f))
    .sort(
      (a, b) =>
        b.segments * (0.3 + b.share) - a.segments * (0.3 + a.share)
    );
}

export function docCount(lib: Library, id: string, f: DocFilter): number {
  return neighbourDocs(lib, id, f).length;
}

export function speakers(lib: Library, docId: string) {
  return (lib.speaksByDoc.get(docId) ?? [])
    .map((s) => ({ person: lib.conceptById.get(s.personId), role: s.role }))
    .filter((x): x is { person: Concept; role: string } => !!x.person);
}

export function relatedConcepts(lib: Library, id: string, limit = 10) {
  return (lib.relatesByConcept.get(id) ?? [])
    .map((r) => ({ other: lib.conceptById.get(r.a === id ? r.b : r.a), weight: r.weight }))
    .filter((x): x is { other: Concept; weight: number } => !!x.other)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

export function fmtDate(iso: string): string {
  if (!iso) return 'ohne Datum';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}.${m}.${y}` : iso;
}

export function fmtTime(s: number): string {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export function youtubeLink(doc: Doc, startS: number | null): string {
  if (doc.ytId) {
    const t = startS != null ? `&t=${Math.max(0, Math.floor(startS))}s` : '';
    return `https://www.youtube.com/watch?v=${doc.ytId}${t}`;
  }
  return doc.url;
}

export function thumbnail(doc: Doc): string | null {
  return doc.ytId ? `https://i.ytimg.com/vi/${doc.ytId}/hqdefault.jpg` : null;
}

export function shortTitle(t: string, n = 60): string {
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

// ---------- Search ----------

export interface SearchHit {
  kind: 'concept' | 'person' | 'doc' | 'claim';
  id: string;
  title: string;
  sub: string;
  score: number;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

export function search(lib: Library, query: string, f: DocFilter, limit = 40): SearchHit[] {
  const q = norm(query.trim());
  if (q.length < 2) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const matchAll = (s: string) => terms.every((t) => s.includes(t));
  const hits: SearchHit[] = [];
  for (const c of lib.concepts) {
    const hay = norm([c.name, ...c.aliases].join(' '));
    if (matchAll(hay)) {
      const exact = norm(c.name) === q || c.aliases.some((a) => norm(a) === q);
      hits.push({
        kind: c.type === 'Person' ? 'person' : 'concept',
        id: c.id,
        title: c.name,
        sub: `${c.type} · ${docCount(lib, c.id, f)} Dokumente`,
        score: (exact ? 100 : 60) + Math.min(20, c.docCount),
      });
    }
  }
  for (const d of lib.docs) {
    if (!docActive(d, f)) continue;
    if (matchAll(norm(d.title))) {
      hits.push({
        kind: 'doc',
        id: d.id,
        title: d.title,
        sub: `${d.source === 'youtube' ? 'Folge' : 'Seite'} · ${fmtDate(d.published)}`,
        score: 50,
      });
    }
  }
  let claimHits = 0;
  for (const c of lib.claims) {
    if (claimHits >= 60) break;
    const d = lib.docById.get(c.docId);
    if (!d || !docActive(d, f)) continue;
    if (matchAll(norm(c.text))) {
      claimHits++;
      hits.push({
        kind: 'claim',
        id: c.id,
        title: c.text,
        sub: `${shortTitle(d.title, 48)}${c.startS != null ? ' · ' + fmtTime(c.startS) : ''}`,
        score: 30,
      });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
