import { bots } from '../../ai/botMoves';

describe('bots.ticTacToe', () => {
  test.only('returns null when the board is full', () => {
    const G = {
      cells: ['0', '1', '0', '0', '1', '0', '1', '0', '1'],
    };

    const result = bots.ticTacToe(G, '0');

    expect(result).toBeNull();
  });
});
