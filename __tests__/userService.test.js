import { getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { likeUser } from '../services/userService';
import { ensureAuth } from '../services/authService';
import { success } from '../services/result';

jest.mock('../services/authService', () => ({
  ensureAuth: jest.fn(),
}));

describe('likeUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDoc.mockResolvedValue({ exists: () => false, data: () => null });
    serverTimestamp.mockImplementation(() => ({ __firestoreServerTimestamp: true }));
  });

  it('retains chat metadata when reliking an existing match', async () => {
    ensureAuth.mockResolvedValue(success({ user: { uid: 'userA' } }));

    const timestamp = { __mockTimestamp: true };
    serverTimestamp.mockImplementation(() => timestamp);

    getDoc.mockImplementation(async (ref) => {
      if (ref.path === 'matches/userA_userB') {
        return {
          exists: () => true,
          data: () => ({
            lastMessage: 'Already chatting',
            matchedAt: { seconds: 123, nanoseconds: 0 },
          }),
        };
      }
      return { exists: () => false, data: () => null };
    });

    const result = await likeUser({ targetUserId: 'userB', liked: true });

    expect(result).toMatchObject({ ok: true, data: { match: true, matchId: 'userA_userB' } });

    const matchSetCall = setDoc.mock.calls.find(([ref]) => ref.path.startsWith('matches/'));
    expect(matchSetCall).toBeUndefined();

    const matchUpdateCall = updateDoc.mock.calls.find(([ref]) => ref.path === 'matches/userA_userB');
    expect(matchUpdateCall).toBeDefined();

    const [, updatePayload] = matchUpdateCall;
    const updateKeys = Object.keys(updatePayload);
    expect(updateKeys.every((key) => ['updatedAt', 'matchedAt'].includes(key))).toBe(true);
    expect(updatePayload).not.toHaveProperty('lastMessage');
  });
});

