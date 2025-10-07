const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { setGlobalOptions } = require('firebase-functions/v2');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { sendVerificationEmail } = require('./mailer');

setGlobalOptions({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 60,
});

admin.initializeApp();

const config = functions.config();
const enforceAppCheck =
  !!config.security &&
  typeof config.security.enforce_app_check !== 'undefined' &&
  String(config.security.enforce_app_check).toLowerCase() === 'true';

function assertAppCheck(req) {
  if (enforceAppCheck && !req.app?.appId) {
    throw new HttpsError('failed-precondition', 'App Check required');
  }
}

const PUBLIC_USER_FIELDS = [
  'name',
  'photoURL',
  'age',
  'gender',
  'bio',
  'image',
  'address',
  'distance',
  'profession',
  'isFavorite',
];

const VERIFICATION_COLLECTION = 'emailVerifications';
const DEFAULT_COOLDOWN_SECONDS = 60;
const MIN_COOLDOWN_SECONDS = 30;
const MAX_COOLDOWN_SECONDS = 3600;

function getVerificationDoc(db, uid) {
  return db.collection(VERIFICATION_COLLECTION).doc(uid);
}

function resolveCooldownSeconds(value) {
  if (value === undefined || value === null) {
    return DEFAULT_COOLDOWN_SECONDS;
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new HttpsError('invalid-argument', 'cooldownSeconds must be a number');
  }

  const rounded = Math.round(value);

  if (rounded <= 0) {
    throw new HttpsError('invalid-argument', 'cooldownSeconds must be positive');
  }

  return Math.min(Math.max(rounded, MIN_COOLDOWN_SECONDS), MAX_COOLDOWN_SECONDS);
}

async function ensureVerificationDoc(db, uid) {
  const docRef = getVerificationDoc(db, uid);
  const snapshot = await docRef.get();

  if (snapshot.exists) {
    return { ref: docRef, data: snapshot.data() || {} };
  }

  const now = admin.firestore.Timestamp.now();
  const initialData = {
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    tokenHash: null,
    lastError: null,
  };

  await docRef.set(initialData);

  return { ref: docRef, data: initialData };
}

async function updateVerificationDoc(docRef, metadata, update) {
  await docRef.set(update, { merge: true });
  return { ...(metadata || {}), ...update };
}

function timestampToMillis(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function toIsoString(value) {
  const millis = timestampToMillis(value);
  return millis ? new Date(millis).toISOString() : null;
}

function sanitizeError(error) {
  if (!error) {
    return null;
  }

  return {
    code: typeof error.code === 'string' ? error.code : 'unknown',
    message: typeof error.message === 'string' ? error.message : '',
    at: toIsoString(error.at),
  };
}

function sanitizeDelivery(delivery) {
  if (!delivery) {
    return null;
  }

  return {
    source: delivery.source ?? null,
    generatedAt: toIsoString(delivery.generatedAt),
    failed: delivery.failed ?? false,
  };
}

function validateCooldown(metadata, nowMillis, cooldownMillis) {
  const lastSentMillis = Math.max(
    timestampToMillis(metadata?.lastSentAt) ?? 0,
    timestampToMillis(metadata?.lastRequestedAt) ?? 0,
  );

  if (!lastSentMillis) {
    return {
      allowed: true,
      remainingMillis: 0,
      cooldownEndsAt: nowMillis,
    };
  }

  const cooldownEndsAt = lastSentMillis + cooldownMillis;

  if (nowMillis >= cooldownEndsAt) {
    return {
      allowed: true,
      remainingMillis: 0,
      cooldownEndsAt,
    };
  }

  return {
    allowed: false,
    remainingMillis: cooldownEndsAt - nowMillis,
    cooldownEndsAt,
  };
}

function buildVerificationResponse(metadata = {}, options = {}) {
  const cooldown = options.cooldown;
  const cooldownSeconds = options.cooldownSeconds ?? null;
  const status = options.status ?? metadata.status ?? 'pending';
  const emailVerified =
    options.emailVerified !== undefined
      ? options.emailVerified
      : status === 'verified';

  const response = {
    status,
    emailVerified,
    email: options.email ?? null,
    createdAt: toIsoString(metadata.createdAt),
    updatedAt: toIsoString(metadata.updatedAt),
    verifiedAt: toIsoString(options.verifiedAt ?? metadata.verifiedAt),
    lastRequestedAt: toIsoString(metadata.lastRequestedAt),
    lastSentAt: toIsoString(metadata.lastSentAt),
    lastError: sanitizeError(options.lastError ?? metadata.lastError),
    lastDelivery: sanitizeDelivery(metadata.lastDelivery),
    cooldownSeconds,
    cooldownRemainingSeconds: cooldown
      ? Math.max(0, Math.ceil((cooldown.remainingMillis ?? 0) / 1000))
      : 0,
    cooldownEndsAt: cooldown?.cooldownEndsAt
      ? new Date(cooldown.cooldownEndsAt).toISOString()
      : null,
    canRequest: options.canRequest !== undefined
      ? options.canRequest
      : status !== 'verified' && (cooldown ? cooldown.allowed : true),
  };

  if (status === 'verified') {
    response.canRequest = false;
  }

  if (options.additional) {
    Object.entries(options.additional).forEach(([key, value]) => {
      if (value !== undefined) {
        response[key] = value;
      }
    });
  }

  return response;
}

async function sendVerificationLink(docRef, metadata, email, source) {
  const generatedAt = admin.firestore.Timestamp.now();

  try {
    const link = await admin.auth().generateEmailVerificationLink(email);
    const update = {
      status: 'sent',
      updatedAt: generatedAt,
      lastRequestedAt: generatedAt,
      lastSentAt: generatedAt,
      lastError: null,
      lastDelivery: {
        source,
        generatedAt,
        failed: false,
      },
    };

    const nextMetadata = await updateVerificationDoc(docRef, metadata, update);

    return { metadata: nextMetadata, link, error: null };
  } catch (error) {
    const errorAt = admin.firestore.Timestamp.now();
    const update = {
      status: 'failed',
      updatedAt: errorAt,
      lastRequestedAt: errorAt,
      lastError: {
        code: error.code || 'unknown',
        message: error.message || 'Failed to generate verification link',
        at: errorAt,
      },
      lastDelivery: {
        source,
        generatedAt: errorAt,
        failed: true,
      },
    };

    const nextMetadata = await updateVerificationDoc(docRef, metadata, update);

    return { metadata: nextMetadata, link: null, error };
  }
}

function mapPublicUserDoc(doc) {
  const data = doc.data() || {};

  return {
    id: doc.id,
    name: data.name ?? '',
    photoURL: data.photoURL ?? null,
    age: data.age ?? null,
    gender: data.gender ?? null,
    bio: data.bio ?? '',
    image: data.image ?? '',
    address: data.address ?? '',
    distance: data.distance ?? null,
    profession: data.profession ?? '',
    isFavorite: data.isFavorite ?? false,
  };
}

exports.getPublicUsers = onCall(async (request) => {
  const data = request.data ?? {};

  assertAppCheck(request);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }

  const { limit = 20, startAfter } = data;

  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit <= 0) {
    throw new HttpsError('invalid-argument', 'limit must be a positive integer');
  }

  const clampedLimit = Math.min(limit, 100);
  const fetchLimit = Math.min(clampedLimit + 1, 101);

  let startAfterId = null;
  if (startAfter !== undefined && startAfter !== null) {
    if (typeof startAfter !== 'string') {
      throw new HttpsError('invalid-argument', 'startAfter must be a string');
    }

    const trimmed = startAfter.trim();
    if (trimmed.length > 0) {
      startAfterId = trimmed;
    }
  }

  try {
    const currentUserId = request.auth.uid;

    let query = admin
      .firestore()
      .collection('users')
      .orderBy(admin.firestore.FieldPath.documentId())
      .select(...PUBLIC_USER_FIELDS)
      .limit(fetchLimit);

    if (startAfterId) {
      query = query.startAfter(startAfterId);
    }

    const snapshot = await query.get();
    const filteredDocs = snapshot.docs.filter((doc) => doc.id !== currentUserId);
    const limitedDocs = filteredDocs.slice(0, clampedLimit);
    const users = limitedDocs.map(mapPublicUserDoc);

    const hasMore =
      (snapshot.docs.length === fetchLimit || filteredDocs.length > limitedDocs.length) &&
      limitedDocs.length > 0;
    const lastReturnedDoc = limitedDocs[limitedDocs.length - 1];
    const nextCursor = hasMore && lastReturnedDoc ? lastReturnedDoc.id : null;

    return { users, nextCursor };
  } catch (err) {
    console.error('getPublicUsers error', err);
    if (err instanceof HttpsError) {
      throw err;
    }
    throw new HttpsError('internal', 'Failed to fetch users');
  }
});

exports.getSwipeCandidates = onCall(async (request) => {
  const data = request.data ?? {};

  assertAppCheck(request);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }

  const { limit = 20, startAfter, cooldownDays } = data;

  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit <= 0) {
    throw new HttpsError('invalid-argument', 'limit must be a positive integer');
  }

  if (
    cooldownDays !== undefined &&
    (typeof cooldownDays !== 'number' || Number.isNaN(cooldownDays) || cooldownDays < 0)
  ) {
    throw new HttpsError('invalid-argument', 'cooldownDays must be a non-negative number');
  }

  const clampedLimit = Math.min(limit, 100);
  const fetchLimit = Math.min(clampedLimit + 1, 101);
  const cd = Math.max(5, cooldownDays ?? 7);
  const cooldownMillis = cd * 24 * 60 * 60 * 1000;

  let startAfterId = null;
  if (startAfter !== undefined && startAfter !== null) {
    if (typeof startAfter !== 'string') {
      throw new HttpsError('invalid-argument', 'startAfter must be a string');
    }

    const trimmed = startAfter.trim();
    if (trimmed.length > 0) {
      startAfterId = trimmed;
    }
  }

  try {
    const db = admin.firestore();
    const currentUserId = request.auth.uid;
    const excludedIds = new Set([currentUserId]);
    const swipeMap = new Map();

    const [swipesSnapshot, matchesSnapshot] = await Promise.all([
      db.collection('swipes').where('from', '==', currentUserId).get(),
      db.collection('matches').where('users', 'array-contains', currentUserId).get(),
    ]);

    swipesSnapshot.forEach((doc) => {
      const swipeData = doc.data() || {};
      const toUserId = swipeData.to;
      if (typeof toUserId === 'string' && toUserId) {
        swipeMap.set(toUserId, {
          liked: swipeData.liked,
          createdAt: swipeData.createdAt ?? null,
        });
      }
    });

    matchesSnapshot.forEach((doc) => {
      const users = doc.get('users');
      if (Array.isArray(users)) {
        users.forEach((uid) => {
          if (typeof uid === 'string' && uid !== currentUserId) {
            excludedIds.add(uid);
          }
        });
      }
    });

    const baseQuery = db
      .collection('users')
      .orderBy(admin.firestore.FieldPath.documentId())
      .select(...PUBLIC_USER_FIELDS)
      .limit(fetchLimit);

    const maxScans = Math.min(fetchLimit * 5, 500);
    const users = [];
    let totalScanned = 0;
    let cursor = startAfterId ?? null;
    let lastScannedDocId = cursor;
    let morePagesAvailable = false;

    while (users.length < clampedLimit && totalScanned < maxScans) {
      let pageQuery = baseQuery;
      if (cursor) {
        pageQuery = pageQuery.startAfter(cursor);
      }

      const snapshot = await pageQuery.get();

      if (snapshot.empty) {
        if (cursor) {
          lastScannedDocId = cursor;
        }
        morePagesAvailable = false;
        break;
      }

      totalScanned += snapshot.docs.length;

      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      if (lastDoc) {
        lastScannedDocId = lastDoc.id;
      }

      const filteredDocs = snapshot.docs.filter((doc) => {
        const candidateId = doc.id;
        if (excludedIds.has(candidateId)) {
          return false;
        }

        const swipeInfo = swipeMap.get(candidateId);

        if (!swipeInfo) {
          return true;
        }

        if (swipeInfo.liked === true) {
          return false;
        }

        if (swipeInfo.liked === false) {
          const { createdAt } = swipeInfo;
          let createdAtDate = null;

          if (createdAt && typeof createdAt.toDate === 'function') {
            createdAtDate = createdAt.toDate();
          } else if (createdAt instanceof Date) {
            createdAtDate = createdAt;
          }

          if (!createdAtDate) {
            return false;
          }

          const elapsed = Date.now() - createdAtDate.getTime();

          if (elapsed < cooldownMillis) {
            return false;
          }
        }

        return true;
      });
      const usersBefore = users.length;
      for (const doc of filteredDocs) {
        if (users.length >= clampedLimit) {
          break;
        }
        users.push(mapPublicUserDoc(doc));
      }
      const addedFromPage = users.length - usersBefore;

      const pageHasMore = snapshot.docs.length === fetchLimit;
      const hasExtraFiltered = filteredDocs.length > addedFromPage;

      if (users.length >= clampedLimit) {
        morePagesAvailable = pageHasMore || hasExtraFiltered;
        break;
      }

      if (totalScanned >= maxScans) {
        morePagesAvailable = pageHasMore;
        break;
      }

      if (!pageHasMore) {
        morePagesAvailable = hasExtraFiltered;
        break;
      }

      cursor = lastScannedDocId;
    }

    const nextCursor = morePagesAvailable && lastScannedDocId ? lastScannedDocId : null;

    return { users, nextCursor };
  } catch (err) {
    console.error('getSwipeCandidates error', err);
    if (err instanceof HttpsError) {
      throw err;
    }

    throw new HttpsError('internal', 'Failed to fetch swipe candidates');
  }
});

exports.likeUser = onCall(async (request) => {
  const data = request.data ?? {};

  assertAppCheck(request);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }

  const { targetUserId, liked } = data || {};

  if (typeof targetUserId !== 'string' || targetUserId.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'targetUserId must be a non-empty string'
    );
  }

  if (typeof liked !== 'boolean') {
    throw new HttpsError('invalid-argument', 'liked must be a boolean');
  }

  const db = admin.firestore();
  const fromUserId = request.auth.uid;
  const toUserId = targetUserId.trim();

  if (fromUserId === toUserId) {
    throw new HttpsError('invalid-argument', 'Users cannot like themselves');
  }

  const swipeRef = db
    .collection('swipes')
    .doc(`${fromUserId}_${toUserId}`);
  const reciprocalSwipeRef = db
    .collection('swipes')
    .doc(`${toUserId}_${fromUserId}`);
  const [firstUser, secondUser] = [fromUserId, toUserId].sort();
  const matchRef = db
    .collection('matches')
    .doc(`${firstUser}_${secondUser}`);
  const fromUserRef = db.collection('users').doc(fromUserId);
  const toUserRef = db.collection('users').doc(toUserId);

  try {
    const match = await db.runTransaction(async (transaction) => {
      const [
        swipeDoc,
        reciprocalSwipeDoc,
        existingMatchDoc,
        fromUserDoc,
        toUserDoc,
      ] = await Promise.all([
        transaction.get(swipeRef),
        transaction.get(reciprocalSwipeRef),
        transaction.get(matchRef),
        transaction.get(fromUserRef),
        transaction.get(toUserRef),
      ]);
      const swipeData = { from: fromUserId, to: toUserId, liked };
      if (swipeDoc.exists) {
        const updates = { ...swipeData };
        // Reset cooldown window on every pass
        if (liked === false) {
          updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
        }
        transaction.set(swipeRef, updates, { merge: true });
      } else {
        transaction.set(swipeRef, {
          ...swipeData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      if (!liked) {
        return false;
      }

      const hasReciprocalLike =
        reciprocalSwipeDoc.exists &&
        reciprocalSwipeDoc.get('liked') === true;

      if (!hasReciprocalLike) {
        return false;
      }

      const fromProfileData = fromUserDoc.exists ? fromUserDoc.data() : {};
      const toProfileData = toUserDoc.exists ? toUserDoc.data() : {};

      let createdMatch = false;

      if (!existingMatchDoc.exists) {
        transaction.set(matchRef, {
          users: [firstUser, secondUser],
          matchedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        createdMatch = true;
      }

      transaction.set(
        matchRef,
        {
          profiles: {
            [fromUserId]: {
              name: fromProfileData?.name ?? '',
              photoURL: fromProfileData?.photoURL ?? null,
            },
            [toUserId]: {
              name: toProfileData?.name ?? '',
              photoURL: toProfileData?.photoURL ?? null,
            },
          },
        },
        { merge: true }
      );

      return createdMatch;
    });
    return { match };
  } catch (err) {
    console.error('likeUser error', err);
    if (err instanceof HttpsError) {
      throw err;
    }
    throw new HttpsError('internal', 'Failed to process like');
  }
});

exports.sendMessage = onCall(async (request) => {
  const data = request.data ?? {};

  assertAppCheck(request);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }

  const { matchId, content } = data || {};

  if (typeof matchId !== 'string' || matchId.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'matchId must be a non-empty string');
  }

  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'content must be a non-empty string');
  }

  const db = admin.firestore();
  const uid = request.auth.uid;
  const trimmedMatchId = matchId.trim();

  try {
    const matchRef = db.collection('matches').doc(trimmedMatchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      throw new HttpsError('not-found', 'Match not found');
    }

    const users = matchDoc.get('users');
    if (!Array.isArray(users) || !users.includes(uid)) {
      throw new HttpsError(
        'permission-denied',
        'User is not part of the match'
      );
    }

    const messagesRef = matchRef.collection('messages');
    await messagesRef.add({
      senderId: uid,
      content: content.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (err) {
    console.error('sendMessage error', err);
    if (err instanceof HttpsError) {
      throw err;
    }

    throw new HttpsError('internal', 'Failed to send message');
  }
});

exports.requestEmailVerification = onCall(async (request) => {
  assertAppCheck(request);

  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }

  const data = request.data ?? {};
  const cooldownSeconds = resolveCooldownSeconds(data.cooldownSeconds);
  const cooldownMillis = cooldownSeconds * 1000;
  const uid = request.auth.uid;
  const db = admin.firestore();

  try {
    const authClient = admin.auth();
    const userRecord = await authClient.getUser(uid);

    if (!userRecord.email) {
      throw new HttpsError('failed-precondition', 'User is missing an email address');
    }

    let { ref: docRef, data: metadata } = await ensureVerificationDoc(db, uid);

    if (!metadata.createdAt) {
      const nowTs = admin.firestore.Timestamp.now();
      metadata = await updateVerificationDoc(docRef, metadata, {
        createdAt: nowTs,
        updatedAt: nowTs,
      });
    }

    if (userRecord.emailVerified) {
      const nowTs = admin.firestore.Timestamp.now();
      metadata = await updateVerificationDoc(docRef, metadata, {
        status: 'verified',
        verifiedAt: metadata.verifiedAt ?? nowTs,
        updatedAt: nowTs,
        lastError: null,
      });

      const cooldown = validateCooldown(metadata, Date.now(), cooldownMillis);

      return buildVerificationResponse(metadata, {
        email: userRecord.email,
        emailVerified: true,
        cooldownSeconds,
        cooldown,
        canRequest: false,
      });
    }

    const cooldown = validateCooldown(metadata, Date.now(), cooldownMillis);

    if (!cooldown.allowed) {
      return buildVerificationResponse(metadata, {
        email: userRecord.email,
        emailVerified: false,
        cooldownSeconds,
        cooldown,
        canRequest: false,
      });
    }

    const sendResult = await sendVerificationLink(
      docRef,
      metadata,
      userRecord.email,
      'callable.requestEmailVerification',
    );

    metadata = sendResult.metadata;

    if (sendResult.error || !sendResult.link) {
      console.error(
        'requestEmailVerification generate link failed',
        uid,
        sendResult.error,
      );

      const failureCooldown = validateCooldown(metadata, Date.now(), cooldownMillis);
      const failureResponse = buildVerificationResponse(metadata, {
        email: userRecord.email,
        emailVerified: false,
        cooldownSeconds,
        cooldown: failureCooldown,
      });

      throw new HttpsError(
        'internal',
        'Failed to generate verification link. Please try again later.',
        failureResponse,
      );
    }

    try {
      await sendVerificationEmail({ to: userRecord.email, link: sendResult.link });

      const successAt = admin.firestore.Timestamp.now();
      const lastDeliveryMetadata = metadata.lastDelivery || {};
      const lastDelivery = {
        source: lastDeliveryMetadata.source || 'callable.requestEmailVerification',
        generatedAt:
          lastDeliveryMetadata.generatedAt || metadata.lastSentAt || successAt,
        failed: false,
      };

      metadata = await updateVerificationDoc(docRef, metadata, {
        status: 'sent',
        updatedAt: successAt,
        lastDelivery,
        lastError: null,
      });
    } catch (error) {
      const errorAt = admin.firestore.Timestamp.now();
      const lastDeliveryMetadata = metadata.lastDelivery || {};
      const failedDelivery = {
        source: lastDeliveryMetadata.source || 'callable.requestEmailVerification',
        generatedAt:
          lastDeliveryMetadata.generatedAt || metadata.lastSentAt || errorAt,
        failed: true,
      };

      metadata = await updateVerificationDoc(docRef, metadata, {
        status: 'failed',
        updatedAt: errorAt,
        lastDelivery: failedDelivery,
        lastError: {
          code: error.code || 'email/send-failed',
          message: error.message || 'Failed to send verification email',
          at: errorAt,
        },
      });

      console.error('requestEmailVerification email send failed', uid, error);

      const failureCooldown = validateCooldown(metadata, Date.now(), cooldownMillis);
      const failureResponse = buildVerificationResponse(metadata, {
        email: userRecord.email,
        emailVerified: false,
        cooldownSeconds,
        cooldown: failureCooldown,
      });

      throw new HttpsError(
        'internal',
        'Failed to send verification email. Please try again later.',
        failureResponse,
      );
    }

    const postCooldown = validateCooldown(metadata, Date.now(), cooldownMillis);

    return buildVerificationResponse(metadata, {
      email: userRecord.email,
      emailVerified: false,
      cooldownSeconds,
      cooldown: postCooldown,
    });
  } catch (err) {
    console.error('requestEmailVerification error', uid, err);
    if (err instanceof HttpsError) {
      throw err;
    }

    throw new HttpsError('internal', 'Failed to request verification email');
  }
});

exports.checkEmailVerificationStatus = onCall(async (request) => {
  assertAppCheck(request);

  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }

  const data = request.data ?? {};
  const cooldownSeconds = resolveCooldownSeconds(data.cooldownSeconds);
  const cooldownMillis = cooldownSeconds * 1000;
  const uid = request.auth.uid;
  const db = admin.firestore();

  try {
    const authClient = admin.auth();
    const userRecord = await authClient.getUser(uid);

    if (!userRecord.email) {
      throw new HttpsError('failed-precondition', 'User is missing an email address');
    }

    let { ref: docRef, data: metadata } = await ensureVerificationDoc(db, uid);

    const nowTs = admin.firestore.Timestamp.now();
    const updates = { updatedAt: nowTs };

    if (!metadata.createdAt) {
      updates.createdAt = nowTs;
    }

    if (userRecord.emailVerified) {
      updates.status = 'verified';
      if (!metadata.verifiedAt) {
        updates.verifiedAt = nowTs;
      }
      updates.lastError = null;
    } else if (!metadata.status) {
      updates.status = 'pending';
    } else if (metadata.status === 'verified' && !userRecord.emailVerified) {
      updates.status = metadata.lastSentAt ? 'sent' : 'pending';
    }

    metadata = await updateVerificationDoc(docRef, metadata, updates);

    const cooldown = validateCooldown(metadata, Date.now(), cooldownMillis);

    return buildVerificationResponse(metadata, {
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      cooldownSeconds,
      cooldown,
    });
  } catch (err) {
    console.error('checkEmailVerificationStatus error', uid, err);
    if (err instanceof HttpsError) {
      throw err;
    }

    throw new HttpsError('internal', 'Failed to check verification status');
  }
});

exports.handleAuthUserCreate = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const db = admin.firestore();

  try {
    let { ref: docRef, data: metadata } = await ensureVerificationDoc(db, uid);

    if (!metadata.createdAt) {
      const nowTs = admin.firestore.Timestamp.now();
      metadata = await updateVerificationDoc(docRef, metadata, {
        createdAt: nowTs,
        updatedAt: nowTs,
      });
    }

    if (user.emailVerified) {
      const nowTs = admin.firestore.Timestamp.now();
      await updateVerificationDoc(docRef, metadata, {
        status: 'verified',
        verifiedAt: metadata.verifiedAt ?? nowTs,
        updatedAt: nowTs,
        lastError: null,
      });
      return;
    }

    if (!user.email) {
      return;
    }

    const result = await sendVerificationLink(
      docRef,
      metadata,
      user.email,
      'auth.onCreate',
    );

    if (result.error || !result.link) {
      if (result.error) {
        console.error(
          'auth.onCreate verification link generation failed',
          uid,
          result.error,
        );
      }
      return;
    }

    try {
      await sendVerificationEmail({ to: user.email, link: result.link });

      const successAt = admin.firestore.Timestamp.now();
      const lastDeliveryMetadata = result.metadata.lastDelivery || {};
      const lastDelivery = {
        source: lastDeliveryMetadata.source || 'auth.onCreate',
        generatedAt:
          lastDeliveryMetadata.generatedAt || result.metadata.lastSentAt || successAt,
        failed: false,
      };

      await updateVerificationDoc(docRef, result.metadata, {
        status: 'sent',
        updatedAt: successAt,
        lastDelivery,
        lastError: null,
      });
    } catch (error) {
      const errorAt = admin.firestore.Timestamp.now();
      const lastDeliveryMetadata = result.metadata.lastDelivery || {};
      const failedDelivery = {
        source: lastDeliveryMetadata.source || 'auth.onCreate',
        generatedAt:
          lastDeliveryMetadata.generatedAt || result.metadata.lastSentAt || errorAt,
        failed: true,
      };

      await updateVerificationDoc(docRef, result.metadata, {
        status: 'failed',
        updatedAt: errorAt,
        lastDelivery: failedDelivery,
        lastError: {
          code: error.code || 'email/send-failed',
          message: error.message || 'Failed to send verification email',
          at: errorAt,
        },
      });

      console.error('auth.onCreate verification email send failed', uid, error);
    }
  } catch (err) {
    console.error('auth.onCreate handler error', uid, err);
  }
});

