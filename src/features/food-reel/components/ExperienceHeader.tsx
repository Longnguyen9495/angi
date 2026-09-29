import {
  BookmarkSimple,
  Compass,
  Info,
  SpeakerHigh,
  SpeakerSlash,
  User,
} from '@phosphor-icons/react';

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

/** Minimal chrome: logo left, three quiet actions right (plus Journey once earned). */
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
  return (
    <header className="fr-header">
      <a className="fr-logo" href="/">
        <span className="fr-logo__mark" aria-hidden="true" />
        <span className="fr-logo__word">Bếp Việt</span>
        <span className="fr-logo__tag">Food reel</span>
      </a>
      <nav className="fr-header__nav" aria-label="Tiện ích">
        <button
          type="button"
          className="fr-chrome"
          aria-pressed={sound}
          onClick={onToggleSound}
          aria-label={sound ? 'Âm thanh: bật. Nhấn để tắt' : 'Âm thanh: tắt. Nhấn để bật'}
        >
          {sound ? (
            <SpeakerHigh aria-hidden="true" size={16} />
          ) : (
            <SpeakerSlash aria-hidden="true" size={16} />
          )}
          <span className="fr-chrome__label">Âm thanh</span>
        </button>
        <button type="button" className="fr-chrome" onClick={onAbout}>
          <Info aria-hidden="true" size={16} />
          <span className="fr-chrome__label">Về dự án</span>
        </button>
        <button type="button" className="fr-chrome" onClick={onSaved}>
          <BookmarkSimple aria-hidden="true" size={16} />
          <span className="fr-chrome__label">Đã lưu</span>{' '}
          <span className="fr-chrome__count">{savedCount}</span>{' '}
          <span className="sr-only">món</span>
        </button>
        <button type="button" className="fr-chrome fr-chrome--journey" onClick={onJourney}>
          <Compass aria-hidden="true" size={16} />
          <span className="fr-chrome__badge" aria-hidden="true">
            {journey.level}
          </span>
          <span className="fr-chrome__label">Hành trình</span>{' '}
          <span className="fr-chrome__stats">
            Cấp {journey.level} · {journey.streak} ngày
          </span>
          {journey.pendingCheckIn && (
            <>
              {' '}
              <span className="fr-chrome__dot" aria-hidden="true" />
              <span className="sr-only">, chờ check-in</span>
            </>
          )}
        </button>
        <button
          type="button"
          className="fr-chrome fr-chrome--icon"
          onClick={onProfile}
          aria-label="Hồ sơ và cài đặt"
        >
          <User aria-hidden="true" size={16} />
        </button>
      </nav>
    </header>
  );
}
