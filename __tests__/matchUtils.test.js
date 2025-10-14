jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));

const collectionMock = jest.fn((dbArg, ...segments) => ({
  type: 'collection',
  path: [dbArg, ...segments].filter(Boolean).join('/'),
}));

const docMock = jest.fn((refOrDb, ...segments) => {
  if (refOrDb && typeof refOrDb === 'object' && refOrDb.type === 'collection') {
    const id = segments[0] ?? `auto_${docMock.mock.calls.length}`;
    return { type: 'doc', id, path: `${refOrDb.path}/${id}` };
  }
  const allSegments = [refOrDb, ...segments].filter(
    (segment) => typeof segment === 'string' && segment.length > 0
  );
  const id = allSegments[allSegments.length - 1] ?? `auto_${docMock.mock.calls.length}`;
  return { type: 'doc', id, path: allSegments.join('/') };
});

const serverTimestampMock = jest.fn(() => ({
  __type: 'serverTimestamp',
  call: serverTimestampMock.mock.calls.length,
}));

const setDocMock = jest.fn(() => Promise.resolve());
const getDocMock = jest.fn(() => Promise.resolve({ exists: true }));

jest.mock('../firebaseConfig', () => ({
  db: 'mock-db',
}));

jest.mock('firebase/firestore', () => ({
  collection: (...args) => collectionMock(...args),
  doc: (...args) => docMock(...args),
  getDoc: (...args) => getDocMock(...args),
  serverTimestamp: (...args) => serverTimestampMock(...args),
  setDoc: (...args) => setDocMock(...args),
}));

const { handleLike } = require('../utils/matchUtils');

describe('handleLike match creation', () => {
  beforeEach(() => {
    collectionMock.mockClear();
    docMock.mockClear();
    serverTimestampMock.mockClear();
    setDocMock.mockClear();
    getDocMock.mockClear();
  });

  it('creates a match document with required timestamps', async () => {
    getDocMock.mockResolvedValueOnce({ exists: true });

    const addMatch = jest.fn();
    const play = jest.fn();
    const setMatchLine = jest.fn();
    const setMatchGame = jest.fn();
    const setShowFireworks = jest.fn();
    const setMatchedUser = jest.fn();

    const result = await handleLike({
      currentUser: { uid: 'userA' },
      targetUser: {
        id: 'userB',
        displayName: 'Target User',
        age: 28,
        images: ['image.png'],
      },
      navigation: { navigate: jest.fn() },
      likesUsed: 0,
      isPremiumUser: true,
      devMode: false,
      setLikesUsed: jest.fn(),
      showNotification: jest.fn(),
      addMatch,
      setMatchedUser,
      setMatchLine,
      setMatchGame,
      play,
      setShowFireworks,
    });

    expect(result).toBe(true);

    const matchSetCall = setDocMock.mock.calls.find(
      ([ref]) => ref?.path?.startsWith('mock-db/matches')
    );

    expect(matchSetCall).toBeDefined();
    const [, matchData, options] = matchSetCall;

    expect(matchData).toMatchObject({
      users: ['userA', 'userB'],
    });
    expect(matchData).toHaveProperty('createdAt');
    expect(matchData).toHaveProperty('updatedAt');
    expect(matchData).toHaveProperty('matchedAt');
    expect(matchData).not.toHaveProperty('profiles');
    expect(options).toBeUndefined();

    expect(addMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        matchedAt: 'now',
      })
    );
  });
});
