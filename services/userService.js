import { httpsCallable } from 'firebase/functions';
import { signInAnonymously } from 'firebase/auth';
import { functions, auth } from '../firebaseConfig';

export async function fetchUsers({ limit = 20, startAfter } = {}) {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  const getPublicUsers = httpsCallable(functions, 'getPublicUsers');
  try {
    const result = await getPublicUsers({ limit, startAfter });
    const { users, nextCursor } = result.data;
    return { users, nextCursor };
  } catch (e) {
    throw new Error('Failed to fetch users. Please try again later.');
  }
}

