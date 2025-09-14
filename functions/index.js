const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.getPublicUsers = functions.https.onCall(async (data = {}, context) => {
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

  if (startAfter !== undefined && startAfter !== null && typeof startAfter !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'startAfter must be a string'
    );
  }

  try {
    let query = admin
      .firestore()
      .collection('users')
      .orderBy('uid')
      .limit(clampedLimit);
    if (startAfter) {
      query = query.startAfter(startAfter);
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
    const nextCursor = lastDoc ? lastDoc.get('uid') : null;

    return { users, nextCursor };
  } catch (err) {
    console.error('getPublicUsers error', err);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch users'
    );
  }
});

