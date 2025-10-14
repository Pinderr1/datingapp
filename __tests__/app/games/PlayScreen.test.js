import { deriveRegistryId } from '../../../app/games/PlayScreen';
import { games as gameRegistry } from '../../../app/games/registry';
import { allGames } from '../../../data/games';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
}));

describe('deriveRegistryId', () => {
  it('returns the registry id mapped from the catalog game id', () => {
    const ticTacToeGame = allGames.find(
      (game) => game.title === gameRegistry.ticTacToe.meta.title,
    );

    expect(deriveRegistryId(ticTacToeGame)).toBe(gameRegistry.ticTacToe.meta.id);
  });

  it('matches registry entries by title when the catalog id differs', () => {
    const matchingByTitle = {
      id: 'custom-tic-tac-toe',
      title: gameRegistry.ticTacToe.meta.title,
    };

    expect(deriveRegistryId(matchingByTitle)).toBe(gameRegistry.ticTacToe.meta.id);
  });

  it('falls back to ticTacToe when no registry match exists', () => {
    expect(
      deriveRegistryId({
        id: 'brand-new-game',
        title: 'Made Up Game',
      }),
    ).toBe('ticTacToe');
  });

  it('uses ticTacToe when no game is provided', () => {
    expect(deriveRegistryId(undefined)).toBe('ticTacToe');
  });
});
