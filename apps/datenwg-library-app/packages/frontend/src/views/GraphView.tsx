import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { select as d3select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TYPE_VAR } from '@/lib/node-types';
import { useApp } from '@/hooks/app.context';
import {
  docActive,
  docCount,
  neighbourDocs,
  shortTitle,
  type Concept,
  type Doc,
  type NodeType,
} from '@/lib/library';
import { cn } from '@/lib/utils';

interface GNode extends SimulationNodeDatum {
  id: string;
  name: string;
  type: NodeType;
  r: number;
  doc?: Doc;
}

interface GLink extends SimulationLinkDatum<GNode> {
  key: string;
  kind: 'co' | 'explains' | 'mentions' | 'speaks';
  w: number;
}

const MAX_NODES = 90;

/** Force-directed knowledge graph: topics, tools, persons and (in focus) documents. */
export function GraphView() {
  const { lib, filter, route, select } = useApp();
  const [minW, setMinW] = useState(8);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [size, setSize] = useState({ w: 900, h: 600 });
  const wrapRef = useRef<HTMLDivElement>(null);

  // Track the container size so the layout fills the available space.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 50 && height > 50) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selected = route.node;
  const selConcept = selected ? lib.conceptById.get(selected) : undefined;
  const focus = route.focus && !!selConcept;

  // --- Build the graph for the current filter / focus ---
  const graph = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of lib.concepts) counts.set(c.id, docCount(lib, c.id, filter));

    let concepts: Concept[];
    const docs: Doc[] = [];
    if (focus && selConcept) {
      const rel = (lib.relatesByConcept.get(selConcept.id) ?? [])
        .map((r) => ({ id: r.a === selConcept.id ? r.b : r.a, w: r.weight }))
        .filter((x) => (counts.get(x.id) ?? 0) > 0)
        .sort((a, b) => b.w - a.w)
        .slice(0, 14)
        .map((x) => lib.conceptById.get(x.id)!)
        .filter(Boolean);
      concepts = [selConcept, ...rel];
      for (const x of neighbourDocs(lib, selConcept.id, filter).slice(0, 8)) docs.push(x.doc);
    } else {
      concepts = lib.concepts
        .filter((c) => (counts.get(c.id) ?? 0) > 0)
        .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
        .slice(0, MAX_NODES);
      if (selConcept && !concepts.includes(selConcept)) concepts.push(selConcept);
      if (selected && !selConcept) {
        const d = lib.docById.get(selected);
        if (d && docActive(d, filter)) docs.push(d);
      }
    }
    const ids = new Set(concepts.map((c) => c.id));
    const nodes: GNode[] = concepts.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      r: 5 + Math.sqrt(counts.get(c.id) || 1) * 2.2,
    }));
    for (const d of docs)
      nodes.push({ id: d.id, name: shortTitle(d.title, 40), type: 'Document', r: 6, doc: d });

    const links: GLink[] = [];
    const seen = new Set<string>();
    const add = (l: GLink) => {
      if (!seen.has(l.key)) {
        seen.add(l.key);
        links.push(l);
      }
    };
    const threshold = focus ? 3 : minW;
    for (const r of lib.relates) {
      if (r.weight >= threshold && ids.has(r.a) && ids.has(r.b))
        add({ key: `${r.a}|${r.b}|co`, source: r.a, target: r.b, kind: 'co', w: r.weight });
    }
    for (const d of docs) {
      for (const e of lib.explainsByDoc.get(d.id) ?? [])
        if (ids.has(e.conceptId))
          add({ key: `${d.id}|${e.conceptId}|ex`, source: d.id, target: e.conceptId, kind: 'explains', w: 6 });
      for (const m of lib.mentionsByDoc.get(d.id) ?? [])
        if (ids.has(m.conceptId) && m.share >= 0.08)
          add({ key: `${d.id}|${m.conceptId}|me`, source: d.id, target: m.conceptId, kind: 'mentions', w: m.share * 10 });
      for (const s of lib.speaksByDoc.get(d.id) ?? [])
        if (ids.has(s.personId))
          add({ key: `${s.personId}|${d.id}|sp`, source: s.personId, target: d.id, kind: 'speaks', w: 3 });
    }
    return { nodes, links, counts };
  }, [lib, filter, focus, selConcept, selected, minW]);

  // --- Layout (synchronous ticks keep the result deterministic and testable) ---
  const layout = useMemo(() => {
    const nodes = graph.nodes.map((n) => ({ ...n }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links = graph.links
      .map((l) => ({ ...l, source: byId.get(l.source as string)!, target: byId.get(l.target as string)! }))
      .filter((l) => l.source && l.target);
    const sim = forceSimulation<GNode>(nodes)
      .force('charge', forceManyBody().strength(-220).distanceMax(320))
      .force('collide', forceCollide<GNode>().radius((d) => d.r + 6))
      .force(
        'link',
        forceLink<GNode, GLink>(links)
          .id((d) => d.id)
          .distance((l) => (l.kind === 'co' ? 90 : 60))
          .strength((l) => Math.min(1, 0.15 + l.w / 60))
      )
      .force('x', forceX(size.w / 2).strength(0.06))
      .force('y', forceY(size.h / 2).strength(0.08))
      .stop();
    for (let i = 0; i < 260; i++) sim.tick();
    return { nodes, links };
  }, [graph, size.w, size.h]);

  // --- Zoom / pan + fit ---
  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (e) => g.setAttribute('transform', e.transform.toString()));
    d3select(svg).call(z).on('dblclick.zoom', null);
    zoomRef.current = z;
  }, []);

  const fit = (animate: boolean) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (!svg || !z || layout.nodes.length === 0) return;
    const xs = layout.nodes.map((n) => n.x ?? 0);
    const ys = layout.nodes.map((n) => n.y ?? 0);
    const x0 = Math.min(...xs) - 60,
      x1 = Math.max(...xs) + 140,
      y0 = Math.min(...ys) - 30,
      y1 = Math.max(...ys) + 30;
    let k = Math.min(2, 0.92 / Math.max((x1 - x0) / size.w, (y1 - y0) / size.h));
    if (!Number.isFinite(k) || k <= 0.05) k = 0.6;
    const t = zoomIdentity.translate(size.w / 2 - (k * (x0 + x1)) / 2, size.h / 2 - (k * (y0 + y1)) / 2).scale(k);
    const sel = d3select(svg);
    void animate;
    sel.call(z.transform, t);
  };
  useEffect(() => {
    fit(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const zoomBy = (f: number) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (svg && z) d3select(svg).call(z.scaleBy, f);
  };

  // --- Highlight neighbourhood of the selection ---
  const nb = useMemo(() => {
    const s = new Set<string>();
    if (!selected) return s;
    s.add(selected);
    for (const l of layout.links) {
      if (l.source.id === selected) s.add(l.target.id);
      if (l.target.id === selected) s.add(l.source.id);
    }
    return s;
  }, [layout, selected]);

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-background">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        role="img"
        aria-label="Wissensgraph der Daten-WG"
        className="block h-full w-full cursor-grab active:cursor-grabbing"
      >
        <g ref={gRef}>
          <g>
            {layout.links.map((l) => {
              const hl = selected && (l.source.id === selected || l.target.id === selected);
              return (
                <line
                  key={l.key}
                  x1={l.source.x}
                  y1={l.source.y}
                  x2={l.target.x}
                  y2={l.target.y}
                  stroke={l.kind === 'co' ? 'var(--color-line-co)' : 'var(--color-line-typed)'}
                  strokeDasharray={l.kind === 'co' ? '4 3' : undefined}
                  strokeWidth={Math.max(0.8, Math.min(6, Math.sqrt(l.w)))}
                  className={cn(selected && !hl && 'link-dim', hl && 'link-hl')}
                >
                  <title>
                    {l.kind === 'co'
                      ? `Ko-Vorkommen: ${l.w} gemeinsame Segmente`
                      : l.kind === 'explains'
                        ? 'erklärt · belegt'
                        : l.kind === 'speaks'
                          ? 'spricht in'
                          : 'erwähnt'}
                  </title>
                </line>
              );
            })}
          </g>
          <g>
            {layout.nodes.map((n) => {
              const dim = selected && !nb.has(n.id);
              const isSel = n.id === selected;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  tabIndex={0}
                  role="button"
                  aria-label={n.name}
                  className={cn('cursor-pointer outline-none', dim && 'node-dim')}
                  onClick={() => select(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      select(n.id);
                    }
                  }}
                >
                  <circle
                    r={n.r}
                    fill={n.type === 'Document' ? (n.doc?.source === 'markdown' ? 'var(--color-node-page)' : 'var(--color-node-doc)') : TYPE_VAR[n.type]}
                    stroke={isSel ? 'var(--color-foreground)' : 'var(--color-background)'}
                    strokeWidth={isSel ? 3 : 1.5}
                  />
                  <text
                    x={n.r + 4}
                    dy={3}
                    className="pointer-events-none select-none fill-foreground font-base"
                    fontSize={n.type === 'Document' ? 10 : 11}
                    fontWeight={isSel ? 600 : 400}
                  >
                    {n.name}
                  </text>
                  <title>
                    {n.name} · {n.type === 'Document' ? 'Dokument' : `${graph.counts.get(n.id) ?? 0} Dokumente`}
                  </title>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Controls */}
      <div className="absolute top-300 left-300 flex flex-wrap items-center gap-200 rounded-lg border border-border bg-card/90 p-200 text-200 shadow-sm backdrop-blur">
        {!focus && (
          <label className="flex items-center gap-200">
            <span className="text-muted-foreground">Kanten ab</span>
            <input
              type="range"
              min={2}
              max={40}
              value={minW}
              onChange={(e) => setMinW(Number(e.target.value))}
              aria-label="Mindestgewicht der Ko-Vorkommen-Kanten"
              className="w-[120px] accent-primary"
            />
            <span className="font-monospace text-100 text-muted-foreground">{minW}</span>
          </label>
        )}
        <span className="font-monospace text-100 text-muted-foreground">
          {layout.nodes.length} Knoten · {layout.links.length} Kanten{focus ? ' · Fokus' : ''}
        </span>
      </div>
      <div className="absolute right-300 bottom-300 flex flex-col gap-100 rounded-lg border border-border bg-card/90 p-100 shadow-sm backdrop-blur">
        <IconBtn label="Vergrößern" onClick={() => zoomBy(1.4)}>
          <Plus className="icon-size-200" />
        </IconBtn>
        <IconBtn label="Verkleinern" onClick={() => zoomBy(1 / 1.4)}>
          <Minus className="icon-size-200" />
        </IconBtn>
        <IconBtn label="Einpassen" onClick={() => fit(true)}>
          <Maximize2 className="icon-size-200" />
        </IconBtn>
      </div>
      <div className="absolute bottom-300 left-300 flex flex-wrap gap-300 rounded-lg border border-border bg-card/90 px-300 py-200 font-monospace text-100 text-muted-foreground shadow-sm backdrop-blur">
        <Legend color="var(--color-node-topic)" label="Thema" />
        <Legend color="var(--color-node-tool)" label="Tool" />
        <Legend color="var(--color-node-person)" label="Person" />
        <Legend color="var(--color-node-doc)" label="Folge" />
        <span>
          <span className="mr-100 inline-block w-[18px] border-t-2 border-dashed border-line-co align-middle" />
          Ko-Vorkommen
        </span>
        <span>
          <span className="mr-100 inline-block w-[18px] border-t-2 border-line-typed align-middle" />
          belegt
        </span>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-md p-200 text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
    >
      {children}
    </button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-100">
      <span className="inline-block size-200 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
