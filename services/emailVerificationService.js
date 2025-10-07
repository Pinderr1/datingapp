import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { success, failure } from './result';

export async function sendVerificationEmail(user = auth.currentUser) {
  if (!user) {
    return failure('no-auth', 'Please sign in again to continue.');
  }

  try {
    await sendEmailVerification(user);
    return success();
  } catch (error) {
    console.warn('Failed to send verification email.', error);
    const message = error?.message || 'We were unable to send a verification email. Please try again later.';
    return failure('email-verification-send-failed', message);
  }
}
