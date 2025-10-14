import { getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { handleLike } from '../utils/matchUtils';

jest.mock('expo-router', () => ({
  useRouter: () => ({}),
}));

const noop = () => {};

describe('handleLike', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDoc.mockImplementation(async () => ({ exists: () => false, data: () => null }));
    serverTimestamp.mockImplementation(() => ({ __firestoreServerTimestamp: true }));
  });

  it('creates a match document with required timestamps on mutual like', async () => {
    const currentUser = { uid: 'alice' };
    const targetUser = { id: 'bob', displayName: 'Bob', age: 30, images: ['img'] };
    const firestore = { __mockDb: true };
    const addMatch = jest.fn();

    const timestamp = { __mockTimestamp: true };
    serverTimestamp.mockImplementation(() => timestamp);

    getDoc
      .mockImplementationOnce(async () => ({ exists: () => true, data: () => ({}) }))
      .mockImplementationOnce(async () => ({ exists: () => false, data: () => null }));

    await handleLike({
      currentUser,
      targetUser,
      firestore,
      showNotification: noop,
      setLikesUsed: noop,
      addMatch,
      setMatchedUser: noop,
      setMatchLine: noop,
      setMatchGame: noop,
      play: noop,
      setShowFireworks: noop,
    });

    expect(setDoc).toHaveBeenCalled();
    const matchCall = setDoc.mock.calls.find(([, data]) => data && Array.isArray(data.users));
    expect(matchCall).toBeTruthy();
    const [matchRef, matchData] = matchCall;
    expect(matchRef.id).toBe('alice_bob');
    expect(matchData).toMatchObject({
      users: ['alice', 'bob'],
      createdAt: timestamp,
      updatedAt: timestamp,
      matchedAt: timestamp,
    });
    expect(matchData).not.toHaveProperty('lastMessage');
    expect(updateDoc).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'alice_bob' }),
      expect.objectContaining({ matchedAt: expect.anything() })
    );
    expect(addMatch).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'alice_bob', displayName: 'Bob', matchedAt: expect.anything() })
    );
  });
});
