import type { YoutubeVideo } from '../foodReel.types';

/** Treat API/cache metadata as untrusted; never use supplied URLs. */
export function normalizeYoutubeVideos(input: unknown): YoutubeVideo[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const result: YoutubeVideo[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const v = entry as Record<string, unknown>;
    const fields = ['videoId', 'title', 'channelId', 'channelTitle', 'publishedAt', 'duration'];
    if (
      !fields.every(
        (key) =>
          typeof v[key] === 'string' &&
          (v[key] as string).trim().length > 0 &&
          (v[key] as string).length <= 2000,
      )
    )
      continue;
    const { videoId, title, channelId, channelTitle, publishedAt, duration } =
      v as unknown as YoutubeVideo;
    if (
      !/^[A-Za-z0-9_-]{11}$/.test(videoId) ||
      !/^UC[A-Za-z0-9_-]{22}$/.test(channelId) ||
      !/^P[0-9TDHMS.]+$/.test(duration) ||
      !Number.isFinite(Date.parse(publishedAt)) ||
      seen.has(videoId)
    )
      continue;
    seen.add(videoId);
    result.push({
      videoId,
      title,
      channelId,
      channelTitle,
      publishedAt,
      duration,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
    if (result.length === 5) break;
  }
  return result;
}
