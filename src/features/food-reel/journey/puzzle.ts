/** A cookbook photo comes in this many slices; each cook uncovers one. */
export const PUZZLE_PIECES = 8;

export const piecesShown = (cooked: number) => Math.min(Math.max(cooked, 0), PUZZLE_PIECES);

/**
 * The order a recipe's slices uncover in: a fixed shuffle seeded by its id, so
 * every page fills differently but the same way on every device.
 */
export function pieceOrder(recipeId: string): number[] {
  let h = 2166136261;
  for (const c of recipeId) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const order = Array.from({ length: PUZZLE_PIECES }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}
