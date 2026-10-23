// dwg: Typen und reine Hilfsfunktionen für Seiten aus einer App-Spec.
// Von `dwg app page` geschrieben, wird bei jedem Lauf ersetzt.

import {
  col,
  type Bindings,
  type DaxFilter,
  type DaxValue,
  type SelectionKey,
  type VisualKind,
  type VisualObjects,
} from '../vendor/dwg-visuals/dwg-visuals.js';

export interface DwgTileSpec {
  id: string;
  visual: VisualKind;
  /** x, y, Breite, Höhe in Seitenpixeln (wie in Power BI) */
  rect: [number, number, number, number];
  title?: string;
  subtitle?: string;
  bindings: Bindings;
  objects?: VisualObjects;
  sortBy?: Record<string, string>;
  showItemsWithNoData?: boolean;
  displayNames?: Record<string, string>;
}

export interface DwgPageSpec {
  name: string;
  width: number;
  height: number;
  background?: string;
  filters?: DaxFilter[];
  tiles: DwgTileSpec[];
}

export interface DwgSelection {
  tile: string;
  keys: SelectionKey[];
}

/** `Kalender[Monat]` → ['Kalender', 'Monat']; Measure-Spalten (`[actual]`) → null */
function splitColumn(name: string): [string, string] | null {
  const m = /^(.+)\[(.+)\]$/.exec(name);
  return m ? [m[1], m[2]] : null;
}

/** Auswahl in einer Kachel → TREATAS-Filter für die anderen Kacheln (eine Liste je Spalte). */
export function selectionFilters(sel: DwgSelection | null): DaxFilter[] {
  if (!sel) return [];
  const byColumn = new Map<string, DaxValue[]>();
  for (const key of sel.keys) {
    for (const [name, value] of Object.entries(key)) {
      const parts = splitColumn(name);
      if (!parts) continue;
      const ref = col(parts[0], parts[1]);
      const list = byColumn.get(ref) ?? [];
      if (!list.includes(value as DaxValue)) list.push(value as DaxValue);
      byColumn.set(ref, list);
    }
  }
  return [...byColumn].map(([column, values]) => ({ column, values }));
}

/** Text für den Filter-Chip: erste Spalte der Auswahl mit bis zu drei Werten. */
export function selectionLabel(sel: DwgSelection | null): string {
  if (!sel || !sel.keys.length) return '';
  const [name] = Object.keys(sel.keys[0]);
  const parts = name ? splitColumn(name) : null;
  if (!parts) return '';
  const values = [...new Set(sel.keys.map((k) => String(k[name] ?? '(leer)')))];
  const more = values.length > 3 ? ` +${values.length - 3}` : '';
  return `${parts[1]}: ${values.slice(0, 3).join(', ')}${more}`;
}

/** Filter einer Kachel: Seitenfilter plus Auswahl aus einer anderen Kachel. */
export function tileFilters(page: DwgPageSpec, tileId: string, sel: DwgSelection | null): DaxFilter[] {
  const own = page.filters ?? [];
  return sel && sel.tile !== tileId ? [...own, ...selectionFilters(sel)] : own;
}

/** Position wie in Power BI („An Breite anpassen“); unter `narrowBelow` untereinander. */
export function tileBox(
  tile: DwgTileSpec,
  page: DwgPageSpec,
  width: number,
  narrowBelow = 900
): { position: 'absolute' | 'relative'; left?: number; top?: number; width: number; height: number } {
  const [x, y, w, h] = tile.rect;
  if (width > 0 && width < narrowBelow) {
    return { position: 'relative', width, height: Math.round(Math.max(260, (h * width) / w / 1.6)) };
  }
  const s = width / page.width;
  return { position: 'absolute', left: x * s, top: y * s, width: w * s, height: h * s };
}
