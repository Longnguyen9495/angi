import { useCallback, useEffect, useState } from 'react';

export type Route = { name: 'reel' } | { name: 'dish'; slug: string } | { name: 'journey' };

export function parseRoute(pathname: string): Route {
  const dish = /^\/mon\/([a-z0-9-]+)\/?$/.exec(pathname);
  if (dish) return { name: 'dish', slug: dish[1]! };
  if (/^\/journey\/?$/.test(pathname)) return { name: 'journey' };
  return { name: 'reel' };
}

export function pathFor(route: Route): string {
  if (route.name === 'dish') return `/mon/${route.slug}`;
  if (route.name === 'journey') return '/journey';
  return '/';
}

/**
 * Minimal history router: Apache already serves index.html for deep links
 * (FallbackResource), so /mon/<slug> and /journey survive a refresh.
 */
export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((next: Route, opts: { replace?: boolean } = {}) => {
    const path = pathFor(next);
    if (path !== window.location.pathname) {
      if (opts.replace) window.history.replaceState({ fr: true }, '', path);
      else window.history.pushState({ fr: true }, '', path);
    }
    setRoute(next);
  }, []);

  /** Goes back if the previous entry is ours, otherwise replaces with `fallback`. */
  const back = useCallback(
    (fallback: Route) => {
      const state = window.history.state as { fr?: boolean } | null;
      if (state?.fr && window.history.length > 1) window.history.back();
      else navigate(fallback, { replace: true });
    },
    [navigate],
  );

  return { route, navigate, back };
}
