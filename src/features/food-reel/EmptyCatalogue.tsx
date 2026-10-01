import { BRAND, t } from '../../i18n';

/** Shown when the database answers but has no publishable dish yet. */
export function EmptyCatalogue() {
  return (
    <main className="fr-empty">
      <p className="fr-empty__brand">{BRAND}</p>
      <h1 className="fr-empty__title">{t.reel.empty.title}</h1>
      <p className="fr-empty__text">{t.reel.empty.text}</p>
      <a className="fr-empty__cta" href="/admin/#/dishes/new">
        {t.reel.empty.cta}
      </a>
    </main>
  );
}
