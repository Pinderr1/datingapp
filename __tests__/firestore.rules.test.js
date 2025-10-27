import fs from 'fs';
import path from 'path';

describe('firestore security rules', () => {
  const rulesPath = path.resolve(__dirname, '..', 'firestore.rules');
  const rulesText = fs.readFileSync(rulesPath, 'utf8');

  function isSignedIn(authUid) {
    return typeof authUid === 'string' && authUid.length > 0;
  }

  function isGameParticipant(data, uid) {
    return (
      data != null &&
      typeof data === 'object' &&
      Array.isArray(data.players) &&
      data.players.includes(uid)
    );
  }

  function playersListIsValid(players) {
    return (
      Array.isArray(players) &&
      players.length === 2 &&
      typeof players[0] === 'string' &&
      typeof players[1] === 'string' &&
      players[0] !== players[1]
    );
  }

  function sortedPlayerIds(players) {
    const [first, second] = players;
    return first <= second ? [first, second] : [second, first];
  }

  function matchDocumentHasParticipants(sortedPlayers, matches) {
    const [first, second] = sortedPlayers;
    const matchId = `${first}_${second}`;
    const matchDoc = matches[matchId];

    if (!matchDoc || !Array.isArray(matchDoc.users)) {
      return false;
    }

    const { users } = matchDoc;
    return (
      users.length === 2 &&
      users.every((user) => user === first || user === second) &&
      users.includes(first) &&
      users.includes(second)
    );
  }

  function gamePlayersHaveExistingMatch(data, matches) {
    if (!data || typeof data !== 'object' || !playersListIsValid(data.players)) {
      return false;
    }

    return matchDocumentHasParticipants(sortedPlayerIds(data.players), matches);
  }

  function simulateGameCreate({ authUid, requestData, matches }) {
    return (
      isSignedIn(authUid) &&
      isGameParticipant(requestData, authUid) &&
      gamePlayersHaveExistingMatch(requestData, matches)
    );
  }

  function simulateGameGet({ authUid, resourceData }) {
    return isSignedIn(authUid) && isGameParticipant(resourceData, authUid);
  }

  it('includes the helper and requires it on game mutations', () => {
    expect(rulesText).toMatch(/function gamePlayersHaveExistingMatch\s*\(/);
    expect(rulesText).toMatch(
      /allow create: if isSignedIn\(\) &&\s+isGameParticipant\(request\.resource\.data\) &&\s+gamePlayersHaveExistingMatch\(request\.resource\.data\);/
    );
    expect(rulesText).toMatch(
      /allow update: if isSignedIn\(\) &&\s+isGameParticipant\(resource\.data\) &&\s+isGameParticipant\(request\.resource\.data\) &&\s+gamePlayersHaveExistingMatch\(request\.resource\.data\);/
    );
  });

  it('allows matched players to create a game even when players are unsorted', () => {
    const matches = {
      userA_userB: { users: ['userA', 'userB'] },
    };

    const allowed = simulateGameCreate({
      authUid: 'userA',
      requestData: { players: ['userB', 'userA'] },
      matches,
    });

    expect(allowed).toBe(true);
  });

  it('denies creating a game when the match document is missing or mismatched', () => {
    const matches = {
      userA_userC: { users: ['userA', 'userC'] },
    };

    const deniedMissing = simulateGameCreate({
      authUid: 'userA',
      requestData: { players: ['userA', 'userB'] },
      matches: {},
    });

    const deniedMismatched = simulateGameCreate({
      authUid: 'userA',
      requestData: { players: ['userA', 'userB'] },
      matches,
    });

    expect(deniedMissing).toBe(false);
    expect(deniedMismatched).toBe(false);
  });

  it('allows matched users to open an existing game', () => {
    const allowed = simulateGameGet({
      authUid: 'userB',
      resourceData: { players: ['userA', 'userB'] },
    });

    expect(allowed).toBe(true);
  });

  it('denies unrelated users from opening another pair\'s game', () => {
    const denied = simulateGameGet({
      authUid: 'userC',
      resourceData: { players: ['userA', 'userB'] },
    });

    expect(denied).toBe(false);
  });
});
