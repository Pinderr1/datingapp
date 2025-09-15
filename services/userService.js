import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { ensureAuth } from './authService';

export async function fetchUsers({ limit = 20, startAfter } = {}) {
  await ensureAuth();
  const getPublicUsers = httpsCallable(functions, 'getPublicUsers');
  try {
    const result = await getPublicUsers({ limit, startAfter });
    const { users, nextCursor } = result.data;
    return { users, nextCursor };
  } catch (e) {
    throw new Error('Failed to fetch users. Please try again later.');
  }
}

