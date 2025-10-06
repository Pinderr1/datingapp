import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { success, failure } from './result';
import { checkEmailVerificationStatus, deriveVerificationCode } from './emailVerificationService';

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

  if (refreshedUser.emailVerified) {
    return success({ user: refreshedUser });
  }

  if (!includeVerificationStatus) {
    return allowUnverified
      ? success({ user: refreshedUser })
      : failure('email-verification-required');
  }

  const statusResult = await checkEmailVerificationStatus();

  if (!statusResult.ok) {
    if (allowUnverified) {
      return success({ user: refreshedUser, verification: null });
    }

    const error = statusResult.error;
    return failure(
      error?.code || 'email-verification-status-failed',
      error?.message || 'We could not verify your email status. Please try again.',
      error?.details,
    );
  }

  const verification = statusResult.data;

  if (verification.emailVerified) {
    return success({ user: auth.currentUser ?? refreshedUser });
  }

  if (allowUnverified) {
    return success({ user: refreshedUser, verification });
  }

  const code = deriveVerificationCode(verification);

  let message = 'Please verify your email address to continue.';
  if (code === 'email-verification-cooldown') {
    message = 'Please check your inbox. You can request another verification email once the cooldown ends.';
  } else if (code === 'email-verification-delivery-failed') {
    message =
      'We had trouble sending a verification email to your address. Please try resending it from the verification screen.';
  }

  return failure(code, message, { verification });
}

export function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }

  return email.trim().toLowerCase();
}
