const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const config = functions.config();
const enforceAppCheck =
  !!config.security &&
  typeof config.security.enforce_app_check !== 'undefined' &&
  String(config.security.enforce_app_check).toLowerCase() === 'true';

exports.getPublicUsers = functions
  .region('us-central1')
  .runWith({ memory: '256MB', timeoutSeconds: 60 })
  .https.onCall(async (data = {}, context) => {
  if (enforceAppCheck && !context.app) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'App Check required'
    );
  }
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const { limit = 20, startAfter } = data;

  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit <= 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'limit must be a positive integer'
    );
  }
  const clampedLimit = Math.min(limit, 100);

  let startAfterId = null;
  if (startAfter !== undefined && startAfter !== null) {
    if (typeof startAfter !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'startAfter must be a string'
      );
    }

    const trimmed = startAfter.trim();
    if (trimmed.length > 0) {
      startAfterId = trimmed;
    }
  }

  try {
    let query = admin
      .firestore()
      .collection('users')
      .orderBy(admin.firestore.FieldPath.documentId())
      .select(
        'name',
        'photoURL',
        'age',
        'gender',
        'bio',
        'image',
        'address',
        'distance',
        'profession',
        'isFavorite'
      )
      .limit(clampedLimit);

    if (startAfterId) {
      query = query.startAfter(startAfterId);
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name ?? '',
        photoURL: d.photoURL ?? null,
        age: d.age ?? null,
        gender: d.gender ?? null,
        bio: d.bio ?? '',
        image: d.image ?? '',
        address: d.address ?? '',
        distance: d.distance ?? null,
        profession: d.profession ?? '',
        isFavorite: d.isFavorite ?? false,
      };
    });

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor = lastDoc ? lastDoc.id : null;

    return { users, nextCursor };
  } catch (err) {
    console.error('getPublicUsers error', err);
    if (err instanceof functions.https.HttpsError) {
      throw err;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch users'
    );
  }
});

exports.likeUser = functions
  .region('us-central1')
  .runWith({ memory: '256MB', timeoutSeconds: 60 })
  .https.onCall(async (data = {}, context) => {
    if (enforceAppCheck && !context.app) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'App Check required'
      );
    }

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }

    const { targetUserId, liked } = data || {};

    if (typeof targetUserId !== 'string' || targetUserId.trim().length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'targetUserId must be a non-empty string'
      );
    }

    if (typeof liked !== 'boolean') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'liked must be a boolean'
      );
    }

    const db = admin.firestore();
    const fromUserId = context.auth.uid;
    const toUserId = targetUserId.trim();

    if (fromUserId === toUserId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Users cannot like themselves'
      );
    }

    const swipeRef = db
      .collection('swipes')
      .doc(`${fromUserId}_${toUserId}`);

    try {
      const match = await db.runTransaction(async (transaction) => {
        const swipeDoc = await transaction.get(swipeRef);
        const swipeData = {
          from: fromUserId,
          to: toUserId,
          liked,
        };

        if (swipeDoc.exists) {
          transaction.set(swipeRef, swipeData, { merge: true });
        } else {
          transaction.set(swipeRef, {
            ...swipeData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        if (!liked) {
          return false;
        }

        const reciprocalSwipeRef = db
          .collection('swipes')
          .doc(`${toUserId}_${fromUserId}`);
        const reciprocalSwipeDoc = await transaction.get(reciprocalSwipeRef);
        const hasReciprocalLike =
          reciprocalSwipeDoc.exists &&
          reciprocalSwipeDoc.get('liked') === true;

        if (!hasReciprocalLike) {
          return false;
        }

        const [firstUser, secondUser] = [fromUserId, toUserId].sort();
        const matchRef = db
          .collection('matches')
          .doc(`${firstUser}_${secondUser}`);
        const existingMatchDoc = await transaction.get(matchRef);

        if (existingMatchDoc.exists) {
          return false;
        }

        transaction.set(matchRef, {
          users: [firstUser, secondUser],
          matchedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return true;
      });

      return { match };
    } catch (err) {
      console.error('likeUser error', err);
      if (err instanceof functions.https.HttpsError) {
        throw err;
      }
      throw new functions.https.HttpsError('internal', 'Failed to process like');
    }
  });

exports.sendMessage = functions
  .region('us-central1')
  .runWith({ memory: '256MB', timeoutSeconds: 60 })
  .https.onCall(async (data = {}, context) => {
    if (enforceAppCheck && !context.app) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'App Check required'
      );
    }

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }

    const { matchId, content } = data || {};

    if (typeof matchId !== 'string' || matchId.trim().length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'matchId must be a non-empty string'
      );
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'content must be a non-empty string'
      );
    }

    const db = admin.firestore();
    const uid = context.auth.uid;
    const trimmedMatchId = matchId.trim();

    try {
      const matchRef = db.collection('matches').doc(trimmedMatchId);
      const matchDoc = await matchRef.get();

      if (!matchDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Match not found');
      }

      const users = matchDoc.get('users');
      if (!Array.isArray(users) || !users.includes(uid)) {
        throw new functions.https.HttpsError(
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
      if (err instanceof functions.https.HttpsError) {
        throw err;
      }

      throw new functions.https.HttpsError('internal', 'Failed to send message');
    }
  });

