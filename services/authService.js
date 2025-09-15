import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '../firebaseConfig';

let authInitPromise;

export async function waitForAuthInit(timeout = 500) {
  if (auth.currentUser) return;
  if (!authInitPromise) {
    authInitPromise = new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, () => {
        unsub();
        resolve();
      });
      setTimeout(() => {
        unsub();
        resolve();
      }, timeout);
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
