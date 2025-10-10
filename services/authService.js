import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
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
  let onboardingComplete = false;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnapshot = await getDoc(userDocRef);
    if (userDocSnapshot.exists()) {
      const data = userDocSnapshot.data();
      onboardingComplete = Boolean(data?.onboardingComplete);
    }
  } catch (error) {
    console.error('Failed to fetch user onboarding status', error);
  }

  return success({ user, onboardingComplete });
}
