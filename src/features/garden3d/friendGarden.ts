import { CROPS } from '../../data/game';
import type { CropId } from '../../data/types';
import type { Plot } from '../../domain/progress';
import type { FriendGarden, FriendPlot } from '../../services/account';

const REWATER_MS = 60 * 60 * 1000;

/** The server snapshot, trusted only as far as our own ids go. */
export function friendPlots(garden: FriendGarden): Plot[] {
  return garden.plots.map((p) => ({
    id: p.id,
    crop: p.crop && p.crop in CROPS ? (p.crop as CropId) : null,
    plantedAt: p.plantedAt,
    readyAt: p.readyAt,
    wateredAt: p.wateredAt,
    sourceDishId: null,
  }));
}

/** Same rule as the server: growing, and not watered in the last hour. */
export function friendCanWater(p: FriendPlot | Plot, now: number): boolean {
  return (
    p.crop !== null &&
    p.readyAt !== null &&
    p.readyAt > now &&
    (p.wateredAt === null || now - p.wateredAt >= REWATER_MS)
  );
}
