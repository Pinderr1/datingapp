const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const config = functions.config();
const enforceAppCheck =
  !!config.security &&
  typeof config.security.enforce_app_check !== 'undefined' &&
  String(config.security.enforce_app_check).toLowerCase() === 'true';

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
    const fetchLimit = Math.min(clampedLimit + 1, 101);

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
      const currentUserId = context.auth.uid;

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
      if (err instanceof functions.https.HttpsError) {
        throw err;
      }
      throw new functions.https.HttpsError(
        'internal',
        'Failed to fetch users'
      );
    }
  });

exports.getSwipeCandidates = functions
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
    const fetchLimit = Math.min(clampedLimit + 1, 101);

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
      const db = admin.firestore();
      const currentUserId = context.auth.uid;
      const excludedIds = new Set([currentUserId]);

      const [swipesSnapshot, matchesSnapshot] = await Promise.all([
        db.collection('swipes').where('from', '==', currentUserId).get(),
        db.collection('matches').where('users', 'array-contains', currentUserId).get(),
      ]);

      swipesSnapshot.forEach((doc) => {
        const toUserId = doc.get('to');
        if (typeof toUserId === 'string' && toUserId) {
          excludedIds.add(toUserId);
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

        const filteredDocs = snapshot.docs.filter(
          (doc) => !excludedIds.has(doc.id)
        );
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

      const nextCursor =
        morePagesAvailable && lastScannedDocId ? lastScannedDocId : null;

      return { users, nextCursor };
    } catch (err) {
      console.error('getSwipeCandidates error', err);
      if (err instanceof functions.https.HttpsError) {
        throw err;
      }

      throw new functions.https.HttpsError(
        'internal',
        'Failed to fetch swipe candidates'
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

