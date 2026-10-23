import { Moon, Search, Sun, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DetailPanel } from './components/DetailPanel';
import { Btn, Skeleton } from './components/ui';
import { AppContext, type MonthPick } from './hooks/app.context';
import { useTheme } from './hooks/theme.context';
import { useLibrary } from './hooks/use-library';
import { useRoute } from './hooks/use-route';
import type { DocFilter, Library, TimeRange } from './lib/library';
import type { View } from './lib/route';
import { cn } from './lib/utils';
import { GraphView } from './views/GraphView';
import { ListView } from './views/ListView';
import { StartView } from './views/StartView';
import { TimelineView } from './views/TimelineView';

const VIEWS: { id: View; label: string }[] = [
  { id: 'start', label: 'Start' },
  { id: 'graph', label: 'Graph' },
  { id: 'timeline', label: 'Zeitstrahl' },
  { id: 'list', label: 'Liste' },
];

const RANGES: { id: TimeRange; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: '3m', label: '3 Monate' },
  { id: '12m', label: '12 Monate' },
  { id: '2026', label: '2026' },
  { id: '2025', label: '2025' },
];

function App() {
  const state = useLibrary();
  const { route, setRoute } = useRoute();
  const { isDark, toggleTheme } = useTheme();
  const [monthPick, setMonthPick] = useState<MonthPick | null>(null);
  const [draft, setDraft] = useState(route.query);
  const [seenQuery, setSeenQuery] = useState(route.query);
  if (route.query !== seenQuery) {
    // The URL changed from outside (back button, shared link): adopt its query.
    setSeenQuery(route.query);
    setDraft(route.query);
  }

  // Debounced search → URL (so result views are shareable).
  useEffect(() => {
    const t = setTimeout(() => {
      if (draft !== route.query) setRoute({ query: draft });
    }, 250);
    return () => clearTimeout(t);
  }, [draft, route.query, setRoute]);

  // "/" focuses the search box, Escape clears selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA)$/.test(target.tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        document.getElementById('library-search')?.focus();
      } else if (e.key === 'Escape' && !typing) {
        setMonthPick(null);
        setRoute({ node: null, query: '' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setRoute]);

  const filter: DocFilter = useMemo(
    () => ({ range: route.range, sources: new Set(route.sources) }),
    [route.range, route.sources]
  );

  const select = useCallback(
    (id: string | null, view?: View) => {
      setMonthPick(null);
      setRoute({ node: id, query: '', ...(view ? { view } : {}), ...(id ? {} : { focus: false }) });
    },
    [setRoute]
  );

  const toggleSource = (s: string) => {
    const set = new Set(route.sources);
    if (set.has(s)) set.delete(s);
    else set.add(s);
    if (set.size === 0) return;
    setRoute({ sources: ['youtube', 'markdown'].filter((x) => set.has(x)) });
  };

  const panelOpen = !!route.node || route.query.trim().length >= 2 || !!monthPick;

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header role="banner" className="border-b border-border bg-card">
        <div className="flex flex-wrap items-center gap-300 px-400 py-300">
          <div className="flex items-center gap-200">
            <h1 className="flex items-center gap-200 font-heading text-400 font-bold tracking-tight">
              <span className="inline-block size-300 rounded-sm bg-warm" aria-hidden="true" />
              DatenWG Library
            </h1>
            <span className="rounded-sm bg-accent px-200-nudge py-100-nudge font-monospace text-100 font-medium text-accent-foreground">
              Fabric App
            </span>
          </div>

          <nav aria-label="Ansichten" className="flex rounded-md bg-muted p-100">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-current={route.view === v.id ? 'page' : undefined}
                onClick={() => setRoute({ view: v.id })}
                className={cn(
                  'rounded-sm px-300 py-100 text-200 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                  route.view === v.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {v.label}
              </button>
            ))}
          </nav>

          <form
            role="search"
            className="relative min-w-[220px] flex-1 md:max-w-[420px]"
            onSubmit={(e) => {
              e.preventDefault();
              setRoute({ query: draft });
            }}
          >
            <Search className="pointer-events-none absolute top-1/2 left-300 icon-size-200 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="library-search"
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Thema, Tool, Person, Folge oder Aussage … ( / )"
              aria-label="Bibliothek durchsuchen"
              className="h-800 w-full rounded-md border border-input bg-background pr-800 pl-800 text-300 placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
            />
            {draft && (
              <button
                type="button"
                aria-label="Suche leeren"
                onClick={() => {
                  setDraft('');
                  setRoute({ query: '' });
                }}
                className="absolute top-1/2 right-200 -translate-y-1/2 rounded-sm p-100 text-muted-foreground hover:text-foreground"
              >
                <X className="icon-size-200" />
              </button>
            )}
          </form>

          <div className="ml-auto flex items-center gap-200">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Helles Design' : 'Dunkles Design'}
              title={isDark ? 'Helles Design' : 'Dunkles Design'}
              className="rounded-md border border-border p-200 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {isDark ? <Sun className="icon-size-200" /> : <Moon className="icon-size-200" />}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-200 border-t border-border px-400 py-200">
          <span className="font-monospace text-100 uppercase tracking-wide text-muted-foreground">Zeitraum</span>
          {RANGES.map((r) => (
            <Btn key={r.id} tone="chip" active={route.range === r.id} onClick={() => setRoute({ range: r.id })} className="h-600 px-200">
              {r.label}
            </Btn>
          ))}
          <span className="ml-300 font-monospace text-100 uppercase tracking-wide text-muted-foreground">Quelle</span>
          <Btn tone="chip" active={route.sources.includes('youtube')} onClick={() => toggleSource('youtube')} className="h-600 px-200">
            Folgen
          </Btn>
          <Btn tone="chip" active={route.sources.includes('markdown')} onClick={() => toggleSource('markdown')} className="h-600 px-200">
            Kitchen-Seiten
          </Btn>
          {state.status === 'ready' && (
            <span className="ml-auto font-monospace text-100 text-muted-foreground">
              {state.library.docs.length} Dokumente · {state.library.claims.length} Kernaussagen · geladen{' '}
              {state.library.loadedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </header>

      {state.status === 'loading' && <LoadingShell />}
      {state.status === 'error' && (
        <div className="flex flex-1 items-center justify-center p-500">
          <div role="alert" className="max-w-[520px] rounded-lg border border-destructive/40 bg-card p-500">
            <h2 className="font-heading text-400 font-semibold">Bibliothek nicht erreichbar</h2>
            <p className="mt-200 text-300 text-muted-foreground">{state.message}</p>
            <Btn className="mt-400" tone="primary" onClick={() => window.location.reload()}>
              Neu laden
            </Btn>
          </div>
        </div>
      )}
      {state.status === 'ready' && (
        <Shell lib={state.library} filter={filter} route={route} setRoute={setRoute} select={select} monthPick={monthPick} setMonthPick={setMonthPick} panelOpen={panelOpen} />
      )}
    </div>
  );
}

function Shell({
  lib,
  filter,
  route,
  setRoute,
  select,
  monthPick,
  setMonthPick,
  panelOpen,
}: {
  lib: Library;
  filter: DocFilter;
  route: ReturnType<typeof useRoute>['route'];
  setRoute: ReturnType<typeof useRoute>['setRoute'];
  select: (id: string | null, view?: View) => void;
  monthPick: MonthPick | null;
  setMonthPick: (m: MonthPick | null) => void;
  panelOpen: boolean;
}) {
  const ctx = useMemo(
    () => ({ lib, route, filter, setRoute, select, monthPick, setMonthPick }),
    [lib, route, filter, setRoute, select, monthPick, setMonthPick]
  );
  return (
    <AppContext.Provider value={ctx}>
      <div className={cn('grid min-h-0 flex-1', panelOpen ? 'lg:grid-cols-[1fr_440px]' : 'grid-cols-1')}>
        <main className="min-h-0 overflow-auto">
          {route.view === 'start' && <StartView />}
          {route.view === 'graph' && <GraphView />}
          {route.view === 'timeline' && <TimelineView />}
          {route.view === 'list' && <ListView />}
        </main>
        {panelOpen && (
          <aside aria-label="Details" className="min-h-0 overflow-auto border-t border-border bg-card lg:border-t-0 lg:border-l">
            <DetailPanel />
          </aside>
        )}
      </div>
    </AppContext.Provider>
  );
}

function LoadingShell() {
  return (
    <div className="flex-1 p-500" aria-busy="true" aria-live="polite">
      <p className="mb-400 text-300 text-muted-foreground">Die Bibliothek wird aus dem Lakehouse geladen …</p>
      <div className="grid gap-300 md:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-[160px]" />
        <div className="grid grid-cols-2 gap-300">
          <Skeleton className="h-[72px]" />
          <Skeleton className="h-[72px]" />
          <Skeleton className="h-[72px]" />
          <Skeleton className="h-[72px]" />
        </div>
      </div>
      <div className="mt-500 grid grid-cols-2 gap-300 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[84px]" />
        ))}
      </div>
    </div>
  );
}

export default App;
