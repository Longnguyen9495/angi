import { PUZZLE_PIECES, pieceOrder, piecesShown } from './puzzle';

describe('dish puzzle', () => {
  it('uncovers one slice per cook and stops at eight', () => {
    expect(piecesShown(0)).toBe(0);
    expect(piecesShown(3)).toBe(3);
    expect(piecesShown(20)).toBe(PUZZLE_PIECES);
  });

  it('shuffles every slice once, the same way for the same recipe', () => {
    const order = pieceOrder('canh-chua-ca');
    expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(pieceOrder('canh-chua-ca')).toEqual(order);
    expect(pieceOrder('pho-bo')).not.toEqual(order);
  });
});
