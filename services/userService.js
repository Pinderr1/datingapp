import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { ensureAuth } from './authService';
import { success, failure } from './result';

export async function fetchSwipeCandidates({ limit = 20, startAfter } = {}) {
  const authResult = await ensureAuth();
  if (!authResult.ok) {
    return authResult;
  }

  const getSwipeCandidates = httpsCallable(functions, 'getSwipeCandidates');
  try {
    const result = await getSwipeCandidates({ limit, startAfter });
    const { users, nextCursor } = result.data;
    return success({ users, nextCursor });
  } catch (e) {
    console.error('Failed to load swipe candidates.', e);
    return failure(
      'fetch-candidates-failed',
      'We were unable to load new people to show you. Please try again in a moment.'
    );
  }
}

export const fetchUsers = fetchSwipeCandidates;

export async function likeUser({ targetUserId, liked }) {
  const authResult = await ensureAuth();
  if (!authResult.ok) {
    return authResult;
  }

  const likeUserCallable = httpsCallable(functions, 'likeUser');
  try {
    const result = await likeUserCallable({ targetUserId, liked });
    return success(result.data);
  } catch (e) {
    console.error('Failed to update user like status. Please try again later.', e);
    return failure('like-user-failed', 'Failed to update user like status. Please try again later.');
  }
}

export async function sendMessage(matchId, content) {
  const authResult = await ensureAuth();
  if (!authResult.ok) {
    return authResult;
  }

  const sendMessageCallable = httpsCallable(functions, 'sendMessage');
  try {
    const result = await sendMessageCallable({ matchId, content });
    return success(result.data);
  } catch (e) {
    console.error('Failed to send message. Please try again later.', e);
    return failure('send-message-failed', 'Failed to send message. Please try again later.');
  }
}
