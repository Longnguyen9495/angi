import { useRef, type FocusEvent, type PointerEvent } from 'react';
import {
  BookmarkSimple,
  Compass,
  Info,
  SpeakerHigh,
  SpeakerSlash,
  User,
} from '@phosphor-icons/react';
import { LanguageSwitcher } from '../../../components/ui/LanguageSwitcher';
import { BRAND, t } from '../../../i18n';

interface ExperienceHeaderProps {
  sound: boolean;
  onToggleSound: () => void;
  onAbout: () => void;
  onSaved: () => void;
  savedCount: number;
  onJourney: () => void;
  journey: { level: number; streak: number; pendingCheckIn: boolean };
  onProfile: () => void;
}

/** Minimal chrome: logo left; on desktop the actions sit in one glass dock whose
    highlight glides to whichever button is hovered or focused. */
export function ExperienceHeader({
  sound,
  onToggleSound,
  onAbout,
  onSaved,
  savedCount,
  onJourney,
  journey,
  onProfile,
}: ExperienceHeaderProps) {
  const navRef = useRef<HTMLElement>(null);

  const glideTo = (target: EventTarget | null) => {
    const nav = navRef.current;
    const btn = (target as HTMLElement | null)?.closest?.('.fr-chrome') as HTMLElement | null;
    if (!nav || !btn || !nav.contains(btn)) return;
    nav.style.setProperty('--glide-x', `${btn.offsetLeft}px`);
    nav.style.setProperty('--glide-w', `${btn.offsetWidth}px`);
    nav.dataset.glide = nav.dataset.glide ? 'on' : 'enter';
  };
  const glideOut = () => {
    if (navRef.current) delete navRef.current.dataset.glide;
  };

  return (
    <header className="fr-header">
      <a className="fr-logo" href="/">
        <span className="fr-logo__mark" aria-hidden="true" />
        <span className="fr-logo__word">{BRAND}</span>
        <span className="fr-logo__tag">{t.reel.header.tag}</span>
      </a>
      <nav
        ref={navRef}
        className="fr-header__nav"
        aria-label={t.reel.header.navLabel}
        onPointerOver={(e: PointerEvent) => glideTo(e.target)}
        onPointerLeave={glideOut}
        onFocus={(e: FocusEvent) => glideTo(e.target)}
        onBlur={(e: FocusEvent) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) glideOut();
        }}
      >
        <span className="fr-dock__glide" aria-hidden="true" />
        <LanguageSwitcher variant="compact" className="fr-lang" />
        <span className="fr-dock__sep" aria-hidden="true" />
        <button
          type="button"
          className="fr-chrome fr-chrome--tip fr-chrome--sound"
          aria-pressed={sound}
          onClick={onToggleSound}
          aria-label={sound ? t.reel.header.soundOn : t.reel.header.soundOff}
          data-tip={t.reel.header.sound}
        >
          {sound ? (
            <SpeakerHigh aria-hidden="true" size={16} />
          ) : (
            <SpeakerSlash aria-hidden="true" size={16} />
          )}
          <span className="fr-chrome__eq" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="fr-chrome__label">{t.reel.header.sound}</span>
        </button>
        <button
          type="button"
          className="fr-chrome fr-chrome--tip"
          onClick={onAbout}
          data-tip={t.reel.header.about}
        >
          <Info aria-hidden="true" size={16} />
          <span className="fr-chrome__label">{t.reel.header.about}</span>
        </button>
        <span className="fr-dock__sep" aria-hidden="true" />
        <button type="button" className="fr-chrome fr-chrome--saved" onClick={onSaved}>
          <BookmarkSimple aria-hidden="true" size={16} weight={savedCount ? 'fill' : 'regular'} />
          <span className="fr-chrome__label">{t.reel.header.saved}</span>{' '}
          <span className="fr-chrome__count" key={savedCount}>
            {savedCount}
          </span>{' '}
          <span className="sr-only">{t.reel.header.savedUnit(savedCount)}</span>
        </button>
        <button type="button" className="fr-chrome fr-chrome--journey" onClick={onJourney}>
          <Compass aria-hidden="true" size={16} className="fr-chrome__compass" />
          <span className="fr-chrome__badge" aria-hidden="true">
            {journey.level}
          </span>
          <span className="fr-chrome__label">{t.reel.header.farm}</span>{' '}
          <span className="fr-chrome__stats">
            {t.reel.header.farmStats(journey.level, journey.streak)}
          </span>
          {journey.pendingCheckIn && (
            <>
              {' '}
              <span className="fr-chrome__dot" aria-hidden="true" />
              <span className="sr-only">{t.reel.header.pendingCheckIn}</span>
            </>
          )}
        </button>
        <button
          type="button"
          className="fr-chrome fr-chrome--icon"
          onClick={onProfile}
          aria-label={t.reel.header.profile}
        >
          <User aria-hidden="true" size={16} />
        </button>
      </nav>
    </header>
  );
}
