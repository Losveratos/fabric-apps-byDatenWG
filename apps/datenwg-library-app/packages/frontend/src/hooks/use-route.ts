import { useCallback, useEffect, useState } from 'react';

import { parseHash, toHash, type RouteState } from '@/lib/route';

/** Two-way binding between the URL hash and the app's view state. */
export function useRoute() {
  const [route, setRouteState] = useState<RouteState>(() =>
    parseHash(window.location.hash)
  );

  useEffect(() => {
    const onHash = () => setRouteState(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setRoute = useCallback((patch: Partial<RouteState>) => {
    setRouteState((prev) => {
      const next = { ...prev, ...patch };
      const hash = toHash(next);
      if (hash !== window.location.hash) {
        // pushState keeps the browser back button useful without re-rendering twice.
        window.history.pushState(null, '', hash || window.location.pathname);
      }
      return next;
    });
  }, []);

  return { route, setRoute };
}
