import { Pause, Play, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../i18n';
import type { ReelDish } from '../foodReel.types';
import { normalizeYoutubeVideos } from '../data/youtubeVideos';
import { ReviewBrowser } from './ReviewBrowser';

interface FoodVideoProps {
  dish: ReelDish;
  /** False under reduced motion or Save-Data: the video never starts by itself. */
  autoplay: boolean;
  /** Becomes true ~700 ms after the story opened (choreography gate). */
  opened: boolean;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  hidden?: boolean;
  active?: boolean;
}

/**
 * Real footage when a dish has it; otherwise an honest poster. A still photo
 * is never zoomed and presented as a video.
 */
export function FoodVideo(props: FoodVideoProps) {
  // A keyed session resets selection synchronously, even when reused outside FoodStory.
  return <VideoSession key={props.dish.id} {...props} />;
}

function VideoSession(props: FoodVideoProps) {
  const [selection, setSelection] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const active = props.active !== false;
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) {
      setSelection(null);
      setOpen(false);
    }
  }
  return (
    <div className="fr-video-selection">
      <LocalFoodVideo
        {...props}
        active={active && !open}
        autoplay={props.autoplay && active && !open}
        opened={props.opened && active && !open}
      />
      {
        <button
          ref={trigger}
          type="button"
          className="fr-youtube-trigger"
          disabled={!active}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            setSelection(null);
            setOpen(true);
          }}
        >
          <Play aria-hidden="true" size={16} /> Xem review quán theo tỉnh
        </button>
      }
      {open && active && (
        <YoutubeDialog
          trigger={trigger}
          onClose={() => {
            setOpen(false);
            setSelection(null);
          }}
          dishName={props.dish.name}
        >
          <ReviewBrowser dishId={props.dish.id} onReset={setSelection}>
            {(videos, province) => {
              const selected = videos.find((video) => `${province}:${video.videoId}` === selection);
              return (
                <>
                  {selected && (
                    <YoutubeStage key={`${province}:${selected.videoId}`} video={selected} />
                  )}
                  <ul className="fr-youtube__list">
                    {videos.map((video, index) => (
                      <li key={video.videoId} style={{ '--card-index': index } as CSSProperties}>
                        <button
                          type="button"
                          className="fr-youtube__card"
                          disabled={!active}
                          onPointerMove={(event) => {
                            if (
                              event.pointerType !== 'mouse' ||
                              window.matchMedia('(prefers-reduced-motion: reduce)').matches
                            )
                              return;
                            const rect = event.currentTarget.getBoundingClientRect();
                            const x = (event.clientX - rect.left) / rect.width;
                            const y = (event.clientY - rect.top) / rect.height;
                            event.currentTarget.style.setProperty(
                              '--tilt-x',
                              `${(0.5 - y) * 4}deg`,
                            );
                            event.currentTarget.style.setProperty(
                              '--tilt-y',
                              `${(x - 0.5) * 4}deg`,
                            );
                          }}
                          onPointerLeave={(event) => {
                            event.currentTarget.style.removeProperty('--tilt-x');
                            event.currentTarget.style.removeProperty('--tilt-y');
                          }}
                          aria-pressed={selected?.videoId === video.videoId}
                          onClick={() => setSelection(`${province}:${video.videoId}`)}
                          aria-label={t.reel.video.play(video.title)}
                        >
                          <span className="fr-youtube__thumbnail">
                            <img
                              src={video.thumbnail}
                              alt=""
                              width={320}
                              height={180}
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.hidden = true;
                              }}
                            />
                            <span className="fr-youtube__play" aria-hidden="true">
                              ▶
                            </span>
                            <span className="fr-youtube__indicator">
                              {selected?.videoId === video.videoId
                                ? t.reel.video.selected
                                : t.reel.video.clip(String(index + 1).padStart(2, '0'))}
                            </span>
                          </span>
                          <span className="fr-youtube__copy">
                            <small>{video.channelTitle}</small>
                            <span className="fr-youtube__title">{video.title}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              );
            }}
          </ReviewBrowser>
        </YoutubeDialog>
      )}
    </div>
  );
}

function YoutubeDialog({
  children,
  onClose,
  trigger,
  dishName,
}: {
  children: import('react').ReactNode;
  onClose: () => void;
  trigger: import('react').RefObject<HTMLButtonElement | null>;
  dishName: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const el = panel.current!;
    const opener = trigger.current;
    const parent = opener?.closest<HTMLElement>('.fr-story__scroll');
    const story = opener?.closest<HTMLElement>('.fr-story');
    const previousInert = story?.inert;
    const locks = [document.body, ...(parent ? [parent] : [])];
    const overflow = locks.map((node) => node.style.overflow);
    locks.forEach((node) => {
      node.style.overflow = 'hidden';
    });
    if (story) story.inert = true;
    el.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    const onFocus = (event: FocusEvent) => {
      if (!el.contains(event.target as Node)) el.querySelector<HTMLElement>('button')?.focus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        close.current();
      } else if (event.key === 'Tab') {
        event.stopImmediatePropagation();
        const items = Array.from(
          el.querySelectorAll<HTMLElement>(
            'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], iframe, [tabindex="0"]',
          ),
        );
        const first = items[0];
        const last = items.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first || !el.contains(document.activeElement))
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !el.contains(document.activeElement))
        ) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocus);
      locks.forEach((node, index) => {
        node.style.overflow = overflow[index]!;
      });
      if (story) story.inert = previousInert ?? false;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [trigger]);
  return createPortal(
    <div
      className="fr-youtube-layer"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className="fr-youtube-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="fr-youtube-dialog__bar">
          <h2 id={titleId}>{t.reel.video.dialogTitle(dishName)}</h2>
          <button
            type="button"
            className="fr-youtube-trigger"
            aria-label={t.reel.video.closeLabel}
            onClick={onClose}
          >
            {t.reel.video.close}
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function YoutubeStage({
  video,
  hidden,
}: {
  video: ReturnType<typeof normalizeYoutubeVideos>[number];
  hidden?: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  useEffect(() => {
    const timeout = window.setTimeout(
      () => setStatus((current) => (current === 'loading' ? 'error' : current)),
      20000,
    );
    const onMessage = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== 'https://www.youtube-nocookie.com'
      )
        return;
      let data;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.event === 'onError') {
        window.clearTimeout(timeout);
        setStatus('error');
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
    };
  }, []);
  return (
    <div className={`fr-youtube-stage ${hidden ? 'is-hidden' : ''}`}>
      <figure className="fr-media fr-media--youtube">
        <iframe
          ref={frame}
          src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
          title={video.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => {
            setStatus('loaded');
            frame.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'listening', id: video.videoId }),
              'https://www.youtube-nocookie.com',
            );
            frame.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onError'] }),
              'https://www.youtube-nocookie.com',
            );
          }}
          onError={() => setStatus('error')}
        />
      </figure>
      <div className="fr-youtube-stage__caption">
        <small>{video.channelTitle}</small>
        <strong>{video.title}</strong>
      </div>
      <p className="fr-youtube-stage__status" role="status" aria-live="polite">
        {status === 'loading'
          ? t.reel.video.loading
          : status === 'error'
            ? t.reel.video.error
            : t.reel.video.loaded}
      </p>
      {status !== 'error' ? (
        <button type="button" className="fr-youtube-stage__help" onClick={() => setStatus('error')}>
          {t.reel.video.help}
        </button>
      ) : (
        <a
          className="fr-youtube-stage__fallback"
          href={`https://www.youtube.com/watch?v=${video.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.reel.video.fallback}
        </a>
      )}
    </div>
  );
}

function LocalFoodVideo({
  dish,
  autoplay,
  opened,
  muted,
  onMutedChange,
  hidden,
  active = true,
}: FoodVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const video = dish.video;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!active) {
      el.pause();
      return;
    }
    if (!video || !autoplay || !opened) return;
    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => setPlaying(false));
  }, [video, autoplay, opened, active]);

  useEffect(() => {
    const el = ref.current;
    return () => el?.pause();
  }, []);

  if (!video) {
    return (
      <figure className={`fr-media fr-media--poster ${hidden ? 'is-hidden' : ''}`}>
        <img
          src={dish.image}
          alt={`${dish.name} — ${dish.subtitle}`}
          width={768}
          height={768}
          decoding="async"
        />
        <figcaption className="fr-media__note">
          <span className="fr-media__dot" aria-hidden="true" />
          {t.reel.video.posterNote}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className={`fr-media fr-media--video ${hidden ? 'is-hidden' : ''}`}>
      <video
        ref={ref}
        className="fr-media__video"
        poster={video.poster}
        muted={muted}
        loop
        playsInline
        preload={autoplay ? 'metadata' : 'none'}
        aria-label={t.reel.video.storyLabel(dish.name)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        {video.webm && <source src={video.webm} type="video/webm" />}
        <source src={video.src} type="video/mp4" />
      </video>
      <div className="fr-media__controls">
        <button
          type="button"
          className="fr-media__btn"
          aria-label={playing ? t.reel.video.pause : t.reel.video.playVideo}
          disabled={!active}
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            if (el.paused) void el.play()?.catch(() => undefined);
            else el.pause();
          }}
        >
          {playing ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}
        </button>
        <button
          type="button"
          className="fr-media__btn"
          aria-pressed={!muted}
          aria-label={muted ? t.reel.video.unmute : t.reel.video.mute}
          onClick={() => onMutedChange(!muted)}
        >
          {muted ? (
            <SpeakerSlash aria-hidden="true" size={18} />
          ) : (
            <SpeakerHigh aria-hidden="true" size={18} />
          )}
        </button>
      </div>
      {video.credit && <figcaption className="fr-media__credit">{video.credit}</figcaption>}
    </figure>
  );
}
