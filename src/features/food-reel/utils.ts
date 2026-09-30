export function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

/** Breaks a dish name into at most two balanced lines for display type. */
export function splitName(name: string): string[] {
  const words = name.split(' ');
  if (words.length < 3 || name.length < 12) return [name];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

/** Ingredient nodes sit on an ellipse around the dish, leaving the lower arc for copy. */
export function orbitPositions(count: number, size: number): { x: number; y: number }[] {
  const rx = size * 0.7;
  const ry = size * 0.56;
  const spread = 290;
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const deg = -90 - spread / 2 + t * spread;
    const a = (deg * Math.PI) / 180;
    return { x: Math.cos(a) * rx, y: Math.sin(a) * ry };
  });
}

/** Case- and accent-insensitive text for Vietnamese search ("bun bo" finds "Bún bò"). */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}
