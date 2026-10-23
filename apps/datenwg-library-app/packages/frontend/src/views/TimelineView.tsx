import { interpolateRgb } from 'd3-interpolate';
import { useEffect, useMemo, useRef } from 'react';

import { TYPE_VAR } from '@/lib/node-types';
import { useApp } from '@/hooks/app.context';
import { docActive, docCount, relatedConcepts, speakers, type Concept, type Doc } from '@/lib/library';
import { cn } from '@/lib/utils';

const LABEL_W = 160;
const TOP = 28;
const ROW_H = 26;

/** Heatmap: rows = concepts, columns = months, cell = documents of that month mentioning the concept. */
export function TimelineView() {
  const { lib, filter, route, select, setMonthPick } = useApp();
  const scroller = useRef<HTMLDivElement>(null);
  const selected = route.node ? lib.conceptById.get(route.node) : undefined;

  const rows: Concept[] = useMemo(() => {
    if (selected) {
      return [selected, ...relatedConcepts(lib, selected.id, 11).map((r) => r.other)];
    }
    return lib.concepts
      .map((c) => ({ c, n: docCount(lib, c.id, filter) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 12)
      .map((x) => x.c);
  }, [lib, selected, filter]);

  const data = useMemo(() => {
    const docs = lib.docs.filter((d) => docActive(d, filter) && d.published);
    if (docs.length === 0) return null;
    const keys = docs.map((d) => d.published.slice(0, 7)).sort();
    const months: string[] = [];
    let [y, m] = keys[0].split('-').map(Number);
    const end = keys[keys.length - 1];
    for (;;) {
      const k = `${y}-${String(m).padStart(2, '0')}`;
      months.push(k);
      if (k >= end) break;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    const byMonth = new Map<string, Doc[]>();
    for (const d of docs) {
      const k = d.published.slice(0, 7);
      const arr = byMonth.get(k);
      if (arr) arr.push(d);
      else byMonth.set(k, [d]);
    }
    const cell = (c: Concept, k: string) =>
      (byMonth.get(k) ?? []).filter((d) =>
        c.type === 'Person'
          ? speakers(lib, d.id).some((s) => s.person.id === c.id)
          : (lib.mentionsByDoc.get(d.id) ?? []).some((mm) => mm.conceptId === c.id && mm.share >= 0.05)
      );
    const grid = rows.map((c) => months.map((k) => cell(c, k)));
    const max = Math.max(1, ...grid.flat().map((x) => x.length));
    return { months, byMonth, grid, max };
  }, [lib, filter, rows]);

  // Newest months first in view.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [data]);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center p-500 text-300 text-muted-foreground">
        Keine datierten Dokumente im Filter.
      </div>
    );
  }

  const { months, byMonth, grid, max } = data;
  const colW = 30;
  const W = LABEL_W + colW * months.length + 20;
  const H = TOP + ROW_H * (rows.length + 1) + 10;
  const paper = getComputedStyle(document.documentElement).getPropertyValue('--color-muted').trim() || '#f4f1e8';
  const colorFor = (c: Concept, v: number) => interpolateRgb(paper, cssVar(TYPE_VAR[c.type]))(0.25 + (0.75 * v) / max);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-500 py-300 text-200 text-muted-foreground">
        {selected ? (
          <>
            Zeile 1 ist <strong className="text-foreground">{selected.name}</strong>, darunter die stärksten
            Nachbarn. Zelle anklicken zeigt die Dokumente des Monats.
          </>
        ) : (
          <>Top 12 Knoten nach Dokumenten im Filter. Knoten anklicken, dann zeigt der Zeitstrahl seine Nachbarn.</>
        )}
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto p-300">
        <svg width={W} height={H} role="img" aria-label="Zeitstrahl der Themen nach Monaten" className="block">
          {months.map((k, i) =>
            +k.slice(5) === 1 && i > 0 ? (
              <line
                key={'y' + k}
                x1={LABEL_W + i * colW - 1}
                x2={LABEL_W + i * colW - 1}
                y1={TOP - 6}
                y2={H - 8}
                stroke="var(--color-border)"
              />
            ) : null
          )}
          {months.map((k, i) => {
            const mm = +k.slice(5);
            if (mm === 1 || i === 0)
              return (
                <text key={'l' + k} x={LABEL_W + i * colW + 2} y={14} className="fill-muted-foreground font-monospace" fontSize={11}>
                  {k.slice(0, 4)}
                </text>
              );
            if (mm % 3 === 1)
              return (
                <text key={'l' + k} x={LABEL_W + i * colW + 2} y={14} className="fill-muted-foreground font-monospace" fontSize={10}>
                  {mm}
                </text>
              );
            return null;
          })}
          <text x={LABEL_W - 8} y={TOP + ROW_H - 8} textAnchor="end" className="fill-muted-foreground font-base" fontSize={12}>
            alle Dokumente
          </text>
          {months.map((k, i) => {
            const ds = byMonth.get(k) ?? [];
            return (
              <rect
                key={'a' + k}
                x={LABEL_W + i * colW}
                y={TOP}
                width={colW - 2}
                height={ROW_H - 2}
                rx={3}
                fill={interpolateRgb(paper, cssVar('var(--color-node-page)'))(Math.min(1, ds.length / 6))}
                className="cursor-pointer"
                onClick={() => setMonthPick({ conceptId: null, month: k })}
              >
                <title>{`${k}: ${ds.length} Dokumente`}</title>
              </rect>
            );
          })}
          {rows.map((c, r) => (
            <g key={c.id}>
              <text
                x={LABEL_W - 8}
                y={TOP + ROW_H * (r + 1) + ROW_H - 8}
                textAnchor="end"
                className={cn('cursor-pointer fill-foreground font-base hover:fill-primary', c.id === route.node && 'font-semibold')}
                fontSize={12}
                onClick={() => select(c.id)}
              >
                {c.name.length > 24 ? c.name.slice(0, 23) + '…' : c.name}
              </text>
              {months.map((k, i) => {
                const ds = grid[r][i];
                return (
                  <rect
                    key={k}
                    x={LABEL_W + i * colW}
                    y={TOP + ROW_H * (r + 1)}
                    width={colW - 2}
                    height={ROW_H - 2}
                    rx={3}
                    fill={ds.length ? colorFor(c, ds.length) : 'var(--color-card)'}
                    stroke="var(--color-border)"
                    strokeWidth={0.5}
                    className="cursor-pointer"
                    onClick={() => setMonthPick({ conceptId: c.id, month: k })}
                  >
                    <title>{`${c.name} · ${k}: ${ds.length}`}</title>
                  </rect>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function cssVar(v: string): string {
  const m = /var\((--[\w-]+)\)/.exec(v);
  if (!m) return v;
  return getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#6b6b6b';
}
