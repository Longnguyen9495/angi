import { Pause, Play, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import type { ReelDish } from '../foodReel.types';

interface FoodVideoProps {
  dish: ReelDish;
  /** False under reduced motion or Save-Data: the video never starts by itself. */
  autoplay: boolean;
  /** Becomes true ~700 ms after the story opened (choreography gate). */
  opened: boolean;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  hidden?: boolean;
}

/**
 * Real footage when a dish has it; otherwise an honest poster. A still photo
 * is never zoomed and presented as a video.
 */
export function FoodVideo({
  dish,
  autoplay,
  opened,
  muted,
  onMutedChange,
  hidden,
}: FoodVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const video = dish.video;

  useEffect(() => {
    const el = ref.current;
    if (!el || !video || !autoplay || !opened) return;
    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => setPlaying(false));
  }, [video, autoplay, opened]);

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
          Food story đang được hoàn thiện
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
        aria-label={`Video câu chuyện món ${dish.name}`}
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
          aria-label={playing ? 'Tạm dừng video' : 'Phát video'}
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
          aria-label={muted ? 'Bật tiếng video' : 'Tắt tiếng video'}
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
