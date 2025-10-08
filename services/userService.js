import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit as limitQuery,
  startAfter as startAfterConstraint,
  getDocs,
  getDoc,
  addDoc,
  serverTimestamp,
  runTransaction,
  documentId,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ensureAuth } from './authService';
import { success, failure } from './result';

export async function fetchSwipeCandidates({
  limit = 20,
  startAfter: startAfterCursor,
  cooldownDays: _cooldownDays,
} = {}) {
  const authResult = await ensureAuth();
  if (!authResult.ok) {
    return authResult;
  }

  const {
    data: { user },
  } = authResult;
  const currentUserId = user?.uid;

  if (!currentUserId) {
    return failure('fetch-candidates-failed', 'You must be signed in to view candidates.');
  }

  const clampedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(20, Math.trunc(limit))) : 20;
  const cursorValue =
    typeof startAfterCursor === 'string' && startAfterCursor.trim().length > 0
      ? startAfterCursor.trim()
      : undefined;
  void _cooldownDays;

  try {
    const usersRef = collection(db, 'users');
    const constraints = [
      where(documentId(), '!=', currentUserId),
      orderBy(documentId()),
      limitQuery(clampedLimit),
    ];

    if (cursorValue) {
      constraints.push(startAfterConstraint(cursorValue));
    }

    const usersQuery = query(usersRef, ...constraints);
    const snapshot = await getDocs(usersQuery);

    const users = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() ?? {}) }))
      .filter((candidate) => candidate.id && candidate.id !== currentUserId);

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = snapshot.docs.length === clampedLimit;
    const nextCursor = hasMore && lastVisible ? lastVisible.id : null;

    return success({ users, nextCursor });
  } catch (e) {
    console.error('Failed to load swipe candidates.', e);
    return failure(
      'fetch-candidates-failed',
      'We were unable to load new people to show you. Please try again in a moment.'
    );
  }
}

export const fetchUsers = fetchSwipeCandidates;

export async function likeUser({ targetUserId, liked }) {
  const authResult = await ensureAuth();
  if (!authResult.ok) {
    return authResult;
  }

  const {
    data: { user },
  } = authResult;
  const currentUserId = user?.uid;

  if (typeof targetUserId !== 'string' || targetUserId.trim().length === 0) {
    return failure('like-user-failed', 'A valid user must be selected.');
  }

  if (typeof liked !== 'boolean') {
    return failure('like-user-failed', 'Invalid like state provided.');
  }

  const trimmedTargetId = targetUserId.trim();

  if (!currentUserId || currentUserId === trimmedTargetId) {
    return failure('like-user-failed', 'Unable to update like for this user.');
  }

  const outgoingLikeRef = doc(db, 'likes', currentUserId, 'outgoing', trimmedTargetId);
  const reciprocalLikeRef = doc(db, 'likes', trimmedTargetId, 'outgoing', currentUserId);
  const [firstUser, secondUser] = [currentUserId, trimmedTargetId].sort();
  const matchId = `${firstUser}_${secondUser}`;
  const matchRef = doc(db, 'matches', matchId);
  const currentUserRef = doc(db, 'users', currentUserId);
  const targetUserRef = doc(db, 'users', trimmedTargetId);

  try {
    const matchCreated = await runTransaction(db, async (transaction) => {
      const [
        existingOutgoing,
        reciprocalDoc,
        existingMatchDoc,
        currentProfileDoc,
        targetProfileDoc,
      ] = await Promise.all([
        transaction.get(outgoingLikeRef),
        transaction.get(reciprocalLikeRef),
        transaction.get(matchRef),
        transaction.get(currentUserRef),
        transaction.get(targetUserRef),
      ]);

      const likePayload = {
        liked,
        updatedAt: serverTimestamp(),
      };

      if (!existingOutgoing.exists) {
        likePayload.createdAt = serverTimestamp();
      }

      transaction.set(outgoingLikeRef, likePayload, { merge: true });

      if (!liked) {
        return false;
      }

      const hasReciprocalLike = reciprocalDoc.exists && reciprocalDoc.data()?.liked === true;

      if (!hasReciprocalLike) {
        return false;
      }

      const currentProfileData = currentProfileDoc.exists ? currentProfileDoc.data() ?? {} : {};
      const targetProfileData = targetProfileDoc.exists ? targetProfileDoc.data() ?? {} : {};

      const matchData = {
        users: [firstUser, secondUser],
      };

      if (!existingMatchDoc.exists) {
        matchData.matchedAt = serverTimestamp();
        transaction.set(matchRef, matchData);
      } else {
        transaction.set(matchRef, matchData, { merge: true });
      }

      transaction.set(
        matchRef,
        {
          profiles: {
            [currentUserId]: {
              name: currentProfileData?.name ?? '',
              photoURL: currentProfileData?.photoURL ?? null,
            },
            [trimmedTargetId]: {
              name: targetProfileData?.name ?? '',
              photoURL: targetProfileData?.photoURL ?? null,
            },
          },
        },
        { merge: true }
      );

      return !existingMatchDoc.exists;
    });

    return success({ match: matchCreated, matchId });
  } catch (e) {
    console.error('Failed to update user like status. Please try again later.', e);
    return failure('like-user-failed', 'Failed to update user like status. Please try again later.');
  }
}

export async function sendMessage(matchId, content) {
  const authResult = await ensureAuth();
  if (!authResult.ok) {
    return authResult;
  }

  const {
    data: { user },
  } = authResult;
  const currentUserId = user?.uid;

  if (typeof matchId !== 'string' || matchId.trim().length === 0) {
    return failure('send-message-failed', 'A valid match must be selected.');
  }

  if (typeof content !== 'string' || content.trim().length === 0) {
    return failure('send-message-failed', 'Message content cannot be empty.');
  }

  if (!currentUserId) {
    return failure('send-message-failed', 'You must be signed in to send a message.');
  }

  const trimmedMatchId = matchId.trim();
  const trimmedContent = content.trim();

  try {
    const matchRef = doc(db, 'matches', trimmedMatchId);
    const matchSnap = await getDoc(matchRef);

    if (!matchSnap.exists()) {
      return failure('send-message-failed', 'Match not found.');
    }

    const users = matchSnap.data()?.users;
    if (!Array.isArray(users) || !users.includes(currentUserId)) {
      return failure('send-message-failed', 'You are not part of this match.');
    }

    const messagesRef = collection(db, 'matches', trimmedMatchId, 'messages');
    await addDoc(messagesRef, {
      senderId: currentUserId,
      content: trimmedContent,
      createdAt: serverTimestamp(),
    });

    return success({ success: true });
  } catch (e) {
    console.error('Failed to send message. Please try again later.', e);
    return failure('send-message-failed', 'Failed to send message. Please try again later.');
  }
}
