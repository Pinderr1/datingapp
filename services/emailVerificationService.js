import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { success, failure } from './result';

function normalizeTimestamp(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (typeof value.toMillis === 'function') {
    return new Date(value.toMillis()).toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  return null;
}

function toPositiveInteger(value, defaultValue = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return defaultValue;
  }

  const rounded = Math.round(value);
  return rounded > 0 ? rounded : defaultValue;
}

function normalizeErrorPayload(error) {
  if (!error) {
    return null;
  }

  return {
    code: typeof error.code === 'string' ? error.code : 'unknown',
    message: typeof error.message === 'string' ? error.message : '',
    at: normalizeTimestamp(error.at),
  };
}

function normalizeDeliveryPayload(delivery) {
  if (!delivery) {
    return null;
  }

  return {
    source: delivery.source ?? null,
    generatedAt: normalizeTimestamp(delivery.generatedAt),
    failed: Boolean(delivery.failed),
  };
}

function normalizeVerificationData(data = {}) {
  return {
    status: typeof data.status === 'string' ? data.status : 'pending',
    email: typeof data.email === 'string' ? data.email : null,
    emailVerified: Boolean(data.emailVerified),
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
    verifiedAt: normalizeTimestamp(data.verifiedAt),
    lastRequestedAt: normalizeTimestamp(data.lastRequestedAt),
    lastSentAt: normalizeTimestamp(data.lastSentAt),
    cooldownSeconds: toPositiveInteger(data.cooldownSeconds, null),
    cooldownRemainingSeconds: toPositiveInteger(data.cooldownRemainingSeconds, 0),
    cooldownEndsAt: normalizeTimestamp(data.cooldownEndsAt),
    canRequest: Boolean(data.canRequest),
    lastError: normalizeErrorPayload(data.lastError),
    lastDelivery: normalizeDeliveryPayload(data.lastDelivery),
    link: typeof data.link === 'string' ? data.link : null,
  };
}

function mapCallableError(error, fallbackCode, fallbackMessage) {
  const rawCode = typeof error?.code === 'string' ? error.code : 'unknown';
  const code = rawCode.startsWith('functions/') ? rawCode.replace('functions/', '') : rawCode;

  switch (code) {
    case 'unauthenticated':
      return failure('no-auth', 'Please sign in again to continue.');
    case 'failed-precondition':
      return failure(
        'email-verification-precondition',
        error?.message || 'We were unable to send a verification email because your account is missing information.'
      );
    case 'invalid-argument':
      return failure('email-verification-invalid-request', error?.message || 'The verification request was invalid.');
    case 'permission-denied':
      return failure('email-verification-permission-denied', error?.message || 'You do not have permission to perform this action.');
    default:
      console.error('Email verification callable failed', error);
      return failure(fallbackCode, fallbackMessage);
  }
}

export async function requestEmailVerification(options = {}) {
  const callable = httpsCallable(functions, 'requestEmailVerification');

  try {
    const result = await callable(options);
    return success(normalizeVerificationData(result.data));
  } catch (error) {
    return mapCallableError(
      error,
      'email-verification-request-failed',
      'We were unable to send a verification email. Please try again later.'
    );
  }
}

export async function checkEmailVerificationStatus(options = {}) {
  const callable = httpsCallable(functions, 'checkEmailVerificationStatus');

  try {
    const result = await callable(options);
    return success(normalizeVerificationData(result.data));
  } catch (error) {
    return mapCallableError(
      error,
      'email-verification-status-failed',
      'We were unable to check your verification status. Please try again later.'
    );
  }
}

export function deriveVerificationCode(verification) {
  if (!verification) {
    return 'email-verification-required';
  }

  if (verification.emailVerified) {
    return 'email-verified';
  }

  if (verification.status === 'failed' || verification.lastDelivery?.failed) {
    return 'email-verification-delivery-failed';
  }

  if (!verification.canRequest && verification.cooldownRemainingSeconds > 0) {
    return 'email-verification-cooldown';
  }

  return 'email-verification-pending';
}
