// dwg: eine Seite aus der App-Spec. Jede Kachel fragt das Semantikmodell per DAX ab
// (daxQuery), ein Klick in einer Kachel filtert die anderen (TREATAS), der Filter-Chip
// hebt die Auswahl auf. Von `dwg app page` geschrieben, wird bei jedem Lauf ersetzt.

import { useEffect, useMemo, useRef, useState } from 'react';

import { useSemanticModelQuery } from '@/hooks/use-semantic-model-query';

import { daxQuery, type SelectionKey } from '../vendor/dwg-visuals/dwg-visuals.js';
import {
  selectionLabel,
  tileBox,
  tileFilters,
  type DwgPageSpec,
  type DwgSelection,
  type DwgTileSpec,
} from './dwg-page';
import { DwgVisual } from './DwgVisual';

function friendly(message: string): string {
  if (/401|403|forbidden|permission|unauthori/i.test(message))
    return 'Keine Berechtigung auf das Semantikmodell (Lesen und Erstellen nötig).';
  if (/capacity|429|throttl/i.test(message))
    return 'Die Fabric-Kapazität ist gerade ausgelastet. Bitte gleich neu laden.';
  return message;
}

interface TileProps {
  tile: DwgTileSpec;
  page: DwgPageSpec;
  connection: string;
  selection: DwgSelection | null;
  clearToken: number;
  isDark: boolean;
  onSelect: (tile: string, keys: SelectionKey[]) => void;
}

function DwgTile({ tile, page, connection, selection, clearToken, isDark, onSelect }: TileProps) {
  const filters = useMemo(() => tileFilters(page, tile.id, selection), [page, tile.id, selection]);
  const q = useMemo(
    () =>
      daxQuery(tile.visual, tile.bindings, {
        filters,
        sortBy: tile.sortBy,
        showItemsWithNoData: tile.showItemsWithNoData,
      }),
    [tile, filters]
  );
  const { data, isLoading, error, refetch } = useSemanticModelQuery({ connection, query: q.query });
  const table = data?.status === 'success' ? data.table : undefined;
  // Fehler beim Rendern (z. B. Ergebnis passt nicht zu den Rollen), je Abfrage
  const [renderError, setRenderError] = useState<{ query: string; message: string } | null>(null);
  const message = error
    ? friendly(error.message)
    : data?.status === 'error'
      ? friendly(data.error.message)
      : renderError?.query === q.query
        ? renderError.message
        : null;
  const displayNames = useMemo(() => ({ ...q.displayNames, ...tile.displayNames }), [q.displayNames, tile.displayNames]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }} data-dwg-tile={tile.id}>
      {table && (
        <DwgVisual
          visual={tile.visual}
          table={table}
          bindings={q.bindings}
          displayNames={displayNames}
          objects={tile.objects}
          isDark={isDark}
          clearToken={clearToken}
          onSelect={(keys) => onSelect(tile.id, keys)}
          onError={(err) => setRenderError({ query: q.query, message: err instanceof Error ? err.message : String(err) })}
        />
      )}
      {isLoading && (
        <div className="absolute top-200 right-200 rounded-full bg-accent px-300 py-100 text-100 text-accent-foreground">
          lädt …
        </div>
      )}
      {message && (
        <div role="alert" className="absolute inset-0 grid place-items-center p-400 text-center text-200">
          <div>
            <p className="mb-200 font-semibold">{tile.title ?? tile.id}: Daten fehlen</p>
            <p className="mb-300 text-foreground/70">{message}</p>
            <button type="button" className="rounded-md border border-border px-300 py-100" onClick={() => void refetch()}>
              Erneut versuchen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DwgPage({ page, connection, isDark }: { page: DwgPageSpec; connection: string; isDark: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [selection, setSelection] = useState<DwgSelection | null>(null);
  const [clearToken, setClearToken] = useState(0);

  useEffect(() => {
    const node = box.current;
    if (!node) return;
    // Breite 0 (Seite kurz unsichtbar) ignorieren: sonst hängen die Kacheln aus und fragen neu ab
    const measure = () => {
      const w = Math.floor(node.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    if (typeof ResizeObserver === 'undefined') {
      // z. B. jsdom in Tests: einmal messen und auf Fenstergröße reagieren
      const frame = requestAnimationFrame(measure);
      window.addEventListener('resize', measure);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', measure);
      };
    }
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const onSelect = (tile: string, keys: SelectionKey[]) => setSelection(keys.length ? { tile, keys } : null);
  const clear = () => {
    setSelection(null);
    setClearToken((t) => t + 1);
  };
  const narrow = width > 0 && width < 900;
  const label = selectionLabel(selection);

  return (
    <div className="flex flex-col gap-300">
      <div className="flex min-h-[32px] flex-wrap items-center gap-200" aria-live="polite">
        {label && (
          <button
            type="button"
            className="rounded-full border border-primary px-300 py-100 text-200 text-primary"
            title="Filter aufheben"
            onClick={clear}
          >
            {label} ×
          </button>
        )}
      </div>
      <div
        ref={box}
        style={
          narrow
            ? { display: 'flex', flexDirection: 'column', gap: 12 }
            : { position: 'relative', height: width ? (page.height * width) / page.width : page.height }
        }
      >
        {width > 0 &&
          page.tiles.map((tile) => (
            <section
              key={tile.id}
              aria-label={tile.title ?? tile.id}
              className="overflow-hidden rounded-lg border border-border bg-card p-200"
              style={{ ...tileBox(tile, page, width), boxSizing: 'border-box' }}
            >
              <DwgTile
                tile={tile}
                page={page}
                connection={connection}
                selection={selection}
                clearToken={clearToken}
                isDark={isDark}
                onSelect={onSelect}
              />
            </section>
          ))}
      </div>
    </div>
  );
}
