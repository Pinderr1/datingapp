import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { success, failure } from './result';

let authInitPromise;

export async function waitForAuthInit() {
  if (!authInitPromise) {
    authInitPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe();
        resolve();
      });
    });
  }
  await authInitPromise;
  return success();
}

export async function ensureAuth() {
  await waitForAuthInit();
  const user = auth.currentUser;
  if (!user) {
    return failure('no-auth');
  }

  try {
    await user.reload();
  } catch (error) {
    console.warn('Failed to reload auth user.', error);
  }

  const refreshedUser = auth.currentUser;
  if (!refreshedUser) {
    return failure('no-auth');
  }

  if (!refreshedUser.emailVerified) {
    return failure('email-not-verified');
  }

  return success({ user: refreshedUser });
}

export function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }

  return email.trim().toLowerCase();
}
