import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';

export async function fetchUsers({ limit = 20, startAfter } = {}) {
  const getPublicUsers = httpsCallable(functions, 'getPublicUsers');
  try {
    const result = await getPublicUsers({ limit, startAfter });
    const { users, nextCursor } = result.data;
    users.nextCursor = nextCursor;
    return users;
  } catch (e) {
    throw new Error('Failed to fetch users. Please try again later.');
  }
}

