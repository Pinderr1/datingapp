const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.getPublicUsers = functions.https.onCall(async (data = {}, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const { limit = 20, startAfter } = data;

  let query = admin.firestore().collection('users').orderBy('uid').limit(limit);
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
    };
  });

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const nextCursor = lastDoc ? lastDoc.get('uid') : null;

  return { users, nextCursor };
});

