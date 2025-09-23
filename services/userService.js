import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { ensureAuth } from './authService';
import { success, failure } from './result';

export async function fetchUsers({ limit = 20, startAfter } = {}) {
  const authResult = await ensureAuth();
  if (!authResult.ok) {
    return authResult;
  }

  const getPublicUsers = httpsCallable(functions, 'getPublicUsers');
  try {
    const result = await getPublicUsers({ limit, startAfter });
    const { users, nextCursor } = result.data;
    return success({ users, nextCursor });
  } catch (e) {
    console.error('Failed to fetch users. Please try again later.', e);
    return failure('fetch-users-failed', 'Failed to fetch users. Please try again later.');
  }
}

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
