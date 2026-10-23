import { useEffect, useState } from 'react';

import { loadLibrary, type Library } from '@/lib/library';

export type LibraryState =
  | { status: 'loading' }
  | { status: 'ready'; library: Library }
  | { status: 'error'; message: string };

function describe(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/401|403|unauthori|forbidden|permission/i.test(msg))
    return 'Kein Zugriff auf das Lakehouse „DatenWGLibrary". Du brauchst Leserechte im Workspace „DatenWG Library".';
  if (/SELECTION_REQUIRED|GraphQL|schema/i.test(msg))
    return 'Die Datenabfrage passt nicht zum veröffentlichten Schema. Bitte die App neu deployen.';
  if (/network|fetch|timeout/i.test(msg))
    return 'Das Lakehouse antwortet gerade nicht. Bitte in einer Minute neu laden.';
  return `Die Bibliothek konnte nicht geladen werden: ${msg}`;
}

/** Loads the whole knowledge graph once per session. */
export function useLibrary(): LibraryState {
  const [state, setState] = useState<LibraryState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadLibrary()
      .then((library) => {
        if (!cancelled) setState({ status: 'ready', library });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: describe(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
