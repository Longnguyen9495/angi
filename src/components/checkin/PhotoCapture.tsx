import { Camera, CheckCircle, ShieldCheck } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { XP } from '../../data/game';
import { currentTime } from '../../domain/time';
import { t } from '../../i18n';
import { compressPhoto, savePhoto } from '../../services/photoStore';
import { useFeedback, useGame } from '../../state/hooks';

/**
 * Optional last touch of a check-in: a photo of the meal, +5 XP once per meal.
 * The photo is compressed and stripped of EXIF (GPS included) on the device and
 * stays in this browser only.
 */
export function PhotoCapture({ slotKey, dishId }: { slotKey: string; dishId: string }) {
  const { state, dispatch } = useGame();
  const { announce } = useFeedback();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether the saved photo earned XP (decided before the state flips to 'already').
  const [earned, setEarned] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const already = state.photos.includes(slotKey);
  const m = t.account.photoCapture;

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { blob, width, height } = await compressPhoto(file);
      await savePhoto({ slotKey, dishId, blob, width, height, at: Date.now() });
      setEarned(!already);
      dispatch({ type: 'ATTACH_PHOTO', slotKey, now: currentTime() });
      setPreview(URL.createObjectURL(blob));
      announce(m.savedAnnounce(already ? null : XP.checkinPhoto));
    } catch (e) {
      setError(e instanceof Error ? e.message : m.saveFailed);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="photo-capture">
      {preview ? (
        <div className="photo-capture__done">
          <img src={preview} alt={m.previewAlt} className="photo-capture__img" />
          <p>
            <CheckCircle aria-hidden="true" size={18} weight="fill" /> {m.saved}
            {earned ? ` · +${XP.checkinPhoto} XP` : ''}
          </p>
        </div>
      ) : (
        <label className={`photo-capture__pick ${busy ? 'is-busy' : ''}`}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={busy}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <Camera aria-hidden="true" size={20} />
          <span>
            {busy ? m.saving : already ? m.replace : m.take}
            {!already && !busy && (
              <span className="photo-capture__xp">{m.optionalXp(XP.checkinPhoto)}</span>
            )}
          </span>
        </label>
      )}
      {error && (
        <p className="photo-capture__error" role="alert">
          {error}
        </p>
      )}
      <p className="photo-capture__note">
        <ShieldCheck aria-hidden="true" size={14} /> {m.privacy}
      </p>
    </div>
  );
}
