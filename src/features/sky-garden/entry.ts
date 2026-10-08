/**
 * Until G2 ships the real way up (plans/vuon-may.md §0.3, §0.8), the farm menu links to the
 * Vườn Mây motion demo only where the team looks at it: the dev server and the local copies
 * (localhost, angi.local). Players on the live site never see the entry.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'angi.local']);

export const SKY_DEMO_PATH = '/sky-garden-test';

export function showSkyDemoEntry(
  host = typeof location === 'undefined' ? '' : location.hostname,
  dev = import.meta.env.DEV,
): boolean {
  return dev || LOCAL_HOSTS.has(host);
}
