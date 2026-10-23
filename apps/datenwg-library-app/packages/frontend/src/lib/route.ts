// Shareable view state in the URL hash, e.g.
//   #n=tool:direct-lake&v=graph&t=12m&s=youtube
// Every node reference in the UI is a real link so views can be bookmarked
// and shared, also when the app runs embedded in the Fabric portal.

import type { TimeRange } from './library';

export type View = 'start' | 'graph' | 'timeline' | 'list';

export interface RouteState {
  node: string | null;
  view: View;
  range: TimeRange;
  sources: string[]; // subset of ['youtube', 'markdown']
  query: string;
  focus: boolean;
}

export const DEFAULT_ROUTE: RouteState = {
  node: null,
  view: 'start',
  range: 'all',
  sources: ['youtube', 'markdown'],
  query: '',
  focus: false,
};

const VIEWS: View[] = ['start', 'graph', 'timeline', 'list'];
const RANGES: TimeRange[] = ['all', '3m', '12m', '2026', '2025', '2024'];

export function parseHash(hash: string): RouteState {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const p = new URLSearchParams(raw);
  const view = p.get('v') as View | null;
  const range = p.get('t') as TimeRange | null;
  const s = p.get('s');
  return {
    node: p.get('n'),
    view: view && VIEWS.includes(view) ? view : DEFAULT_ROUTE.view,
    range: range && RANGES.includes(range) ? range : DEFAULT_ROUTE.range,
    sources: s ? s.split(',').filter(Boolean) : DEFAULT_ROUTE.sources,
    query: p.get('q') ?? '',
    focus: p.get('f') === '1',
  };
}

export function toHash(r: RouteState): string {
  const p = new URLSearchParams();
  if (r.node) p.set('n', r.node);
  if (r.view !== DEFAULT_ROUTE.view) p.set('v', r.view);
  if (r.range !== DEFAULT_ROUTE.range) p.set('t', r.range);
  if (r.sources.length !== DEFAULT_ROUTE.sources.length)
    p.set('s', r.sources.join(','));
  if (r.query) p.set('q', r.query);
  if (r.focus) p.set('f', '1');
  const s = p.toString();
  return s ? '#' + s : '';
}

export function nodeHref(r: RouteState, node: string, view?: View): string {
  return toHash({ ...r, node, view: view ?? r.view, query: '' }) || '#';
}
