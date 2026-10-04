/*
 * Keeps the document head in step with the open dish while the app navigates
 * (Google renders the app and reads these). Link unfurlers don't run JS: for them
 * server/web/share.php writes the same tags into /mon/<slug> before it is served.
 * The first call remembers the home values, so passing no dish restores them.
 */

interface PageMeta {
  title: string;
  /** Omit for the shell's own description. */
  description?: string;
  /** Path below the site origin, e.g. "/mon/pho-bo"; omit for the home page. */
  path?: string;
}

type Defaults = { description: string; canonical: string; origin: string };
let defaults: Defaults | null = null;

function meta(selector: string): HTMLMetaElement | null {
  return document.head.querySelector<HTMLMetaElement>(selector);
}

function readDefaults(): Defaults {
  const canonical =
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ??
    `${location.origin}/`;
  let origin = location.origin;
  try {
    origin = new URL(canonical).origin;
  } catch {
    /* keep the page's own origin */
  }
  // On /mon/<slug> the server has already swapped the content in; data-home keeps the shell's.
  const description = meta('meta[name="description"]');
  return {
    description: description?.dataset.home ?? description?.content ?? '',
    canonical: `${origin}/`,
    origin,
  };
}

export function setPageMeta({ title, description, path }: PageMeta): void {
  defaults ??= readDefaults();
  document.title = title;
  const url = path ? `${defaults.origin}${path}` : defaults.canonical;
  const desc = description?.trim() || defaults.description;
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', url);
  meta('meta[property="og:url"]')?.setAttribute('content', url);
  meta('meta[property="og:title"]')?.setAttribute('content', title);
  if (desc) {
    meta('meta[name="description"]')?.setAttribute('content', desc);
    meta('meta[property="og:description"]')?.setAttribute('content', desc);
  }
}
