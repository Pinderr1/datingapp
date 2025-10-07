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

export async function ensureAuth(options = {}) {
  const { allowUnverified = false, includeVerificationStatus = true } = options;
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

  const verifiedPayload = includeVerificationStatus
    ? { user: refreshedUser, verification: { emailVerified: true } }
    : { user: refreshedUser };

  if (refreshedUser.emailVerified) {
    return success(verifiedPayload);
  }

  if (allowUnverified) {
    const unverifiedPayload = includeVerificationStatus
      ? { user: refreshedUser, verification: { emailVerified: false } }
      : { user: refreshedUser };
    return success(unverifiedPayload);
  }

  const details = includeVerificationStatus ? { verification: { emailVerified: false } } : undefined;

  return failure(
    'email-verification-required',
    'Please verify your email address to continue.',
    details,
  );
}

export function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }

  return email.trim().toLowerCase();
}
