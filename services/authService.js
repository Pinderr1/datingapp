import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '../firebaseConfig';

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
}

export async function ensureAuth() {
  await waitForAuthInit();
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}
