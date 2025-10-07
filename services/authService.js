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
  return success({ user });
}
