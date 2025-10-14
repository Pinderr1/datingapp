/**
 * @jest-environment node
 */

jest.mock('../firebaseConfig', () => ({ db: 'mock-db' }));

const serverTimestampValue = { __type: 'serverTimestamp' };
const timestampNowValue = { __type: 'timestampNow', toMillis: () => 42 };

const collectionMock = jest.fn((...segments) => segments.join('/'));
const docMock = jest.fn((...segments) => segments.join('/'));
const getDocMock = jest.fn();
const setDocMock = jest.fn();
const serverTimestampMock = jest.fn(() => serverTimestampValue);
const timestampNowMock = jest.fn(() => timestampNowValue);
const queryMock = jest.fn();
const whereMock = jest.fn();
const orderByMock = jest.fn();
const limitMock = jest.fn();
const startAfterMock = jest.fn();
const getDocsMock = jest.fn();
const documentIdMock = jest.fn();
const addDocMock = jest.fn();
const updateDocMock = jest.fn();
const onSnapshotMock = jest.fn();
const limitToLastMock = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: (...args) => collectionMock(...args),
  doc: (...args) => docMock(...args),
  getDoc: (...args) => getDocMock(...args),
  setDoc: (...args) => setDocMock(...args),
  serverTimestamp: () => serverTimestampMock(),
  Timestamp: { now: () => timestampNowMock() },
  query: (...args) => queryMock(...args),
  where: (...args) => whereMock(...args),
  orderBy: (...args) => orderByMock(...args),
  limit: (...args) => limitMock(...args),
  startAfter: (...args) => startAfterMock(...args),
  getDocs: (...args) => getDocsMock(...args),
  documentId: (...args) => documentIdMock(...args),
  addDoc: (...args) => addDocMock(...args),
  updateDoc: (...args) => updateDocMock(...args),
  onSnapshot: (...args) => onSnapshotMock(...args),
  limitToLast: (...args) => limitToLastMock(...args),
}));

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('../services/authService', () => ({
  ensureAuth: jest.fn(() => Promise.resolve({ ok: true, data: { user: { uid: 'alice' } } })),
}));

const { handleLike } = require('../utils/matchUtils');
const { likeUser } = require('../services/userService');

const resetMocks = () => {
  collectionMock.mockClear();
  docMock.mockClear();
  getDocMock.mockClear();
  setDocMock.mockClear();
  serverTimestampMock.mockClear();
  timestampNowMock.mockClear();
  queryMock.mockClear();
  whereMock.mockClear();
  orderByMock.mockClear();
  limitMock.mockClear();
  startAfterMock.mockClear();
  getDocsMock.mockClear();
  documentIdMock.mockClear();
  addDocMock.mockClear();
  updateDocMock.mockClear();
  onSnapshotMock.mockClear();
  limitToLastMock.mockClear();
};

beforeEach(() => {
  resetMocks();
});

describe('match creation flows', () => {
  it('handleLike writes match document with timestamps', async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => true });

    const addMatch = jest.fn();
    const play = jest.fn();
    const setShowFireworks = jest.fn();

    const result = await handleLike({
      currentUser: { uid: 'alice' },
      targetUser: { id: 'bob', displayName: 'Bob', age: 30, images: ['img'] },
      navigation: { navigate: jest.fn() },
      likesUsed: 0,
      isPremiumUser: false,
      devMode: false,
      setLikesUsed: jest.fn((fn) => fn(0)),
      showNotification: jest.fn(),
      addMatch,
      setMatchedUser: jest.fn(),
      setMatchLine: jest.fn(),
      setMatchGame: jest.fn(),
      play,
      setShowFireworks,
    });

    expect(result).toBe(true);

    const matchCall = setDocMock.mock.calls.find(([ref]) => String(ref).includes('matches'));
    expect(matchCall).toBeDefined();
    const [, matchData, matchOptions] = matchCall;
    expect(matchData).toEqual({
      users: ['alice', 'bob'],
      createdAt: serverTimestampValue,
      updatedAt: serverTimestampValue,
      matchedAt: serverTimestampValue,
    });
    expect(matchOptions).toEqual({ merge: true });

    expect(addMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        matchedAt: timestampNowValue,
        createdAt: timestampNowValue,
        updatedAt: timestampNowValue,
      })
    );

    expect(serverTimestampMock).toHaveBeenCalled();
    expect(timestampNowMock).toHaveBeenCalled();
  });

  it('likeUser sets match timestamps when creating match', async () => {
    setDocMock.mockResolvedValue(undefined);

    const response = await likeUser({ targetUserId: 'bob', liked: true });

    expect(response.ok).toBe(true);
    expect(response.data).toEqual({ match: true, matchId: 'alice_bob' });

    const matchCall = setDocMock.mock.calls.find(([ref]) => String(ref).includes('matches'));
    expect(matchCall).toBeDefined();
    const [, matchData, matchOptions] = matchCall;
    expect(matchData).toEqual({
      users: ['alice', 'bob'],
      createdAt: serverTimestampValue,
      updatedAt: serverTimestampValue,
      matchedAt: serverTimestampValue,
    });
    expect(matchOptions).toEqual({ merge: true });
  });
});
