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
