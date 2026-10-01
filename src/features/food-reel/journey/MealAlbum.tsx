import { Camera, Trash } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { getDish } from '../../../data/dishes';
import { deletePhoto, listPhotos, type MealPhoto } from '../../../services/photoStore';
import { formatDate, t } from '../../../i18n';
import { useGame } from '../../../state/hooks';

interface Shown extends MealPhoto {
  url: string;
}

const msg = t.journey.album;

/** "2026-09-30:lunch" → "Trưa 30/9" (day/month order follows the language). */
function slotLabel(slotKey: string): string {
  const [date = '', slot = ''] = slotKey.split(':');
  const [y, m, d] = date.split('-').map(Number);
  const day =
    y && m && d ? formatDate(new Date(y, m - 1, d), { day: 'numeric', month: 'numeric' }) : '';
  return msg.when(msg.slot[slot] ?? '', day);
}

/** Check-in photos kept on this device. Deleting one never takes XP back. */
export function MealAlbum() {
  const { state, dispatch } = useGame();
  const [photos, setPhotos] = useState<Shown[] | null>(null);
  // Re-read when a photo is added or removed anywhere (check-in sheet, reset).
  const key = state.photos.join('|');

  useEffect(() => {
    let alive = true;
    let urls: string[] = [];
    listPhotos()
      .then((list) => {
        if (!alive) return;
        const shown = list.map((p) => ({ ...p, url: URL.createObjectURL(p.blob) }));
        urls = shown.map((p) => p.url);
        setPhotos(shown);
      })
      .catch(() => alive && setPhotos([]));
    return () => {
      alive = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [key]);

  if (photos === null) return null;
  if (photos.length === 0) {
    return (
      <p className="fj-note">
        <Camera aria-hidden="true" size={16} /> {msg.empty}
      </p>
    );
  }
  return (
    <ul className="fj-album" aria-label={msg.label}>
      {photos.map((p) => {
        const name = getDish(p.dishId)?.name ?? msg.fallbackName;
        return (
          <li key={p.slotKey} className="fj-album__item">
            <img
              src={p.url}
              alt={msg.photoAlt(name, slotLabel(p.slotKey))}
              width={p.width}
              height={p.height}
              loading="lazy"
            />
            <span className="fj-album__caption">
              <span className="fj-album__name">{name}</span>
              <span className="fj-album__when">{slotLabel(p.slotKey)}</span>
            </span>
            <button
              type="button"
              className="fj-album__delete"
              aria-label={msg.delete(name, slotLabel(p.slotKey))}
              onClick={async () => {
                await deletePhoto(p.slotKey).catch(() => undefined);
                dispatch({ type: 'REMOVE_PHOTO', slotKey: p.slotKey });
                setPhotos((list) => list?.filter((x) => x.slotKey !== p.slotKey) ?? null);
              }}
            >
              <Trash aria-hidden="true" size={16} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
