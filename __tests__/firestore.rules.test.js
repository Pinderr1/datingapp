/**
 * @jest-environment node
 */

import { readFileSync } from 'fs';

let initializeTestEnvironment;
let assertFails;
let assertSucceeds;
let testEnv;
let rulesTestingAvailable = true;

try {
  ({ initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing'));
} catch (error) {
  // eslint-disable-next-line no-console
  console.warn('Skipping Firestore security rules tests:', error.message);
  rulesTestingAvailable = false;
}

const describeIfAvailable = rulesTestingAvailable ? describe : describe.skip;

describeIfAvailable('firestore security rules - matches mutual likes', () => {
  const aliceUid = 'alice';
  const bobUid = 'bob';
  const charlieUid = 'charlie';

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'datingapp-test',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  test('allows creating a match when both users liked each other', async () => {
    const aliceContext = testEnv.authenticatedContext(aliceUid);
    const bobContext = testEnv.authenticatedContext(bobUid);

    const aliceDb = aliceContext.firestore();
    const bobDb = bobContext.firestore();

    await assertSucceeds(
      aliceDb.collection('likes').doc(aliceUid).collection('outgoing').doc(bobUid).set({ liked: true })
    );
    await assertSucceeds(
      bobDb.collection('likes').doc(bobUid).collection('outgoing').doc(aliceUid).set({ liked: true })
    );

    await assertSucceeds(
      aliceDb.collection('matches').doc('aliceBobMatch').set({ users: [aliceUid, bobUid] })
    );
  });

  test('rejects creating a match when only one user liked the other', async () => {
    const aliceContext = testEnv.authenticatedContext(aliceUid);
    const bobContext = testEnv.authenticatedContext(bobUid);

    const aliceDb = aliceContext.firestore();
    const bobDb = bobContext.firestore();

    await assertSucceeds(
      aliceDb.collection('likes').doc(aliceUid).collection('outgoing').doc(bobUid).set({ liked: true })
    );

    await assertFails(
      aliceDb.collection('matches').doc('aliceBobMatch').set({ users: [aliceUid, bobUid] })
    );

    await assertFails(
      bobDb.collection('matches').doc('aliceBobMatch').set({ users: [aliceUid, bobUid] })
    );
  });

  test('rejects updating match participants when mutual likes do not exist', async () => {
    const aliceContext = testEnv.authenticatedContext(aliceUid);
    const charlieContext = testEnv.authenticatedContext(charlieUid);

    const aliceDb = aliceContext.firestore();
    const charlieDb = charlieContext.firestore();

    await assertSucceeds(
      aliceDb.collection('likes').doc(aliceUid).collection('outgoing').doc(bobUid).set({ liked: true })
    );
    await assertSucceeds(
      charlieDb.collection('likes').doc(charlieUid).collection('outgoing').doc(aliceUid).set({ liked: true })
    );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection('matches')
        .doc('existingMatch')
        .set({ users: [aliceUid, bobUid] });
    });

    await assertFails(
      aliceDb.collection('matches').doc('existingMatch').update({ users: [aliceUid, charlieUid] })
    );
  });

  test('allows participants to query matches by UID', async () => {
    const aliceContext = testEnv.authenticatedContext(aliceUid);
    const bobContext = testEnv.authenticatedContext(bobUid);
    const charlieContext = testEnv.authenticatedContext(charlieUid);

    const aliceDb = aliceContext.firestore();
    const bobDb = bobContext.firestore();
    const charlieDb = charlieContext.firestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('matches').doc('aliceBobMatch').set({ users: [aliceUid, bobUid] });
    });

    await assertSucceeds(
      aliceDb.collection('matches').where('users', 'array-contains', aliceUid).get()
    );

    await assertFails(
      charlieDb.collection('matches').doc('aliceBobMatch').get()
    );

    await assertSucceeds(
      bobDb.collection('matches').where('users', 'array-contains', bobUid).get()
    );
  });

  test('allows participants to read legacy matches with userMeta proof', async () => {
    const aliceContext = testEnv.authenticatedContext(aliceUid);
    const bobContext = testEnv.authenticatedContext(bobUid);
    const charlieContext = testEnv.authenticatedContext(charlieUid);

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('matches').doc('legacyMetaOnly').set({
        matchedAt: new Date(),
        userMeta: {
          [aliceUid]: { displayName: 'Alice Legacy', photoURL: 'https://example.com/alice-legacy.png' },
          [bobUid]: { displayName: 'Bob Legacy', photoURL: 'https://example.com/bob-legacy.png' },
        },
      });
    });

    const aliceDb = aliceContext.firestore();
    const bobDb = bobContext.firestore();
    const charlieDb = charlieContext.firestore();

    await assertSucceeds(aliceDb.collection('matches').doc('legacyMetaOnly').get());
    await assertSucceeds(bobDb.collection('matches').doc('legacyMetaOnly').get());
    await assertFails(charlieDb.collection('matches').doc('legacyMetaOnly').get());
  });

  test('repairs legacy matches missing users before enforcing participant queries', async () => {
    const aliceContext = testEnv.authenticatedContext(aliceUid);
    const bobContext = testEnv.authenticatedContext(bobUid);

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await adminDb.collection('users').doc(aliceUid).set({
        uid: aliceUid,
        displayName: 'Alice',
        photoURL: 'https://example.com/alice.png',
      });
      await adminDb.collection('users').doc(bobUid).set({
        uid: bobUid,
        displayName: 'Bob',
        photoURL: 'https://example.com/bob.png',
      });

      await adminDb.collection('matches').doc('legacyMatch').set({
        matchedAt: new Date(),
        updatedAt: new Date(),
        userMeta: {
          [aliceUid]: { displayName: 'Alice', photoURL: 'https://example.com/alice.png' },
        },
      });
    });

    const aliceDb = aliceContext.firestore();
    const bobDb = bobContext.firestore();

    await assertFails(aliceDb.collection('matches').doc('legacyMatch').get());

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      const matchRef = adminDb.collection('matches').doc('legacyMatch');
      const snapshot = await matchRef.get();
      const data = snapshot.data() || {};
      const participants = [aliceUid, bobUid];
      const usersArray = Array.isArray(data.users) ? data.users : [];

      const updatePayload = {
        updatedAt: new Date(),
      };

      if (!participants.every((id) => usersArray.includes(id))) {
        updatePayload.users = participants;
      }

      const existingMeta = data.userMeta && typeof data.userMeta === 'object' ? { ...data.userMeta } : {};
      const missingMetaIds = participants.filter((id) => {
        const meta = existingMeta[id];
        return !meta || typeof meta !== 'object';
      });

      if (missingMetaIds.length > 0) {
        await Promise.all(
          missingMetaIds.map(async (id) => {
            const userSnap = await adminDb.collection('users').doc(id).get();
            const userData = userSnap.data() || {};
            existingMeta[id] = {
              displayName: userData.displayName || '',
              photoURL: userData.photoURL || '',
            };
          })
        );
        updatePayload.userMeta = existingMeta;
      }

      if (Object.keys(updatePayload).length > 0) {
        await matchRef.update(updatePayload);
      }
    });

    await assertSucceeds(
      aliceDb.collection('matches').where('users', 'array-contains', aliceUid).get()
    );
    await assertSucceeds(bobDb.collection('matches').where('users', 'array-contains', bobUid).get());
  });
});
