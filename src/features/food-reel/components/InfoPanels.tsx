import { ArrowUpRight, Trash } from '@phosphor-icons/react';
import { Sheet } from '../../../components/ui/Sheet';
import { LanguageSwitcher } from '../../../components/ui/LanguageSwitcher';
import { BRAND, t } from '../../../i18n';
import { formatReelPrice, getReelDish, reelCount, REGION_LABEL } from '../data/reelCatalogue';

export function SavedPanel({
  open,
  onClose,
  saved,
  onOpenDish,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  saved: string[];
  onOpenDish: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const dishes = saved.map((id) => getReelDish(id)).filter((d) => !!d);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.reel.saved.title}
      description={t.reel.saved.description}
      variant="dark"
    >
      {dishes.length === 0 ? (
        <p className="fr-panel-note">{t.reel.saved.empty}</p>
      ) : (
        <ul className="fr-saved">
          {dishes.map((d) => (
            <li key={d.id} className="fr-saved__item">
              <img src={d.thumbnail} alt="" width={64} height={64} className="fr-saved__img" />
              <span className="fr-saved__text">
                <span className="fr-saved__name">{d.name}</span>
                <span className="fr-saved__meta">
                  {REGION_LABEL[d.region]} · {formatReelPrice(d.price)}
                </span>
              </span>
              <button
                type="button"
                className="fr-ghost fr-ghost--sm"
                onClick={() => onOpenDish(d.id)}
                aria-label={t.reel.saved.open(d.name)}
              >
                <ArrowUpRight aria-hidden="true" size={16} />
              </button>
              <button
                type="button"
                className="fr-ghost fr-ghost--sm"
                onClick={() => onRemove(d.id)}
                aria-label={t.reel.saved.remove(d.name)}
              >
                <Trash aria-hidden="true" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

export function AboutPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={t.reel.about.title} variant="dark">
      <div className="fr-about">
        <p>
          <strong>{BRAND}</strong>
          {t.reel.about.lead(reelCount())}
        </p>
        <p>{t.reel.about.fair}</p>
        <p>
          {t.reel.about.farmBefore}
          <em>{t.reel.about.farmEm}</em>
          {t.reel.about.farmAfter}
        </p>
        <div className="fr-about__lang">
          <span className="fr-about__lang-label" aria-hidden="true">
            {t.reel.about.language}
          </span>
          <LanguageSwitcher variant="full" />
        </div>
        <p>
          <a href={t.common.privacyUrl} target="_blank" rel="noopener">
            {t.reel.about.privacy(BRAND)}
          </a>
        </p>
        <p className="fr-panel-note">{t.reel.about.note}</p>
      </div>
    </Sheet>
  );
}

export function BootScreen({ progress }: { progress: number }) {
  return (
    <div className="fr-boot" role="status" aria-live="polite">
      <span className="fr-logo__mark fr-boot__mark" aria-hidden="true" />
      <p className="fr-boot__text">{t.reel.boot}</p>
      <span className="fr-boot__bar" aria-hidden="true">
        <span
          className="fr-boot__fill"
          style={{ transform: `scaleX(${Math.max(0.05, progress)})` }}
        />
      </span>
    </div>
  );
}
