// services/userService.js
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit as limitQuery,
  startAfter as startAfterConstraint,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  documentId,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ensureAuth } from './authService';
import { success, failure } from './result';

/** Fetch swipe candidates (reads /users; excludes self; paginates by doc ID). */
export async function fetchSwipeCandidates({
  limit = 20,
  startAfter: startAfterCursor,
  cooldownDays: _cooldownDays,
} = {}) {
  const authResult = await ensureAuth();
  if (!authResult.ok) return authResult;

  const { data: { user } } = authResult;
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
    const outgoingRef = collection(db, 'likes', currentUserId, 'outgoing');
    const outgoingSnapshot = await getDocs(outgoingRef);
    const excludedIds = new Set();
    outgoingSnapshot?.docs?.forEach((docSnap) => {
      const data = docSnap?.data?.();
      if (
        docSnap?.id &&
        typeof docSnap.id === 'string' &&
        data &&
        typeof data === 'object' &&
        typeof data.liked === 'boolean'
      ) {
        excludedIds.add(docSnap.id);
      }
    });

    const usersRef = collection(db, 'users');
    const constraints = [
      where(documentId(), '!=', currentUserId),
      orderBy(documentId()),
      limitQuery(clampedLimit),
    ];
    if (cursorValue) constraints.push(startAfterConstraint(cursorValue));

    const usersQuery = query(usersRef, ...constraints);
    const snapshot = await getDocs(usersQuery);

    const users = snapshot.docs
      .map((s) => ({ id: s.id, ...(s.data() ?? {}) }))
      .filter((c) => c.id && c.id !== currentUserId && !excludedIds.has(c.id));

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

/** Fetch a single user profile by document ID. */
export async function fetchUserById(userId) {
  const authResult = await ensureAuth();
  if (!authResult.ok) return authResult;

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return failure('fetch-user-failed', 'A valid profile must be selected.');
  }

  const trimmedId = userId.trim();

  try {
    const userRef = doc(db, 'users', trimmedId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return failure('fetch-user-failed', 'This profile could not be found.');
    }

    const data = snapshot.data() ?? {};

    return success({ id: snapshot.id, ...data });
  } catch (e) {
    console.error('Failed to load user profile.', e);
    return failure('fetch-user-failed', 'Unable to load this profile. Please try again later.');
  }
}

/** Fetch liked profiles for the current user. */
export async function fetchLikedProfiles() {
  const authResult = await ensureAuth();
  if (!authResult.ok) return authResult;

  const {
    data: { user },
  } = authResult;
  const currentUserId = user?.uid;

  if (!currentUserId) {
    return failure('fetch-liked-profiles-failed', 'You must be signed in to view your shortlist.');
  }

  try {
    const outgoingRef = collection(db, 'likes', currentUserId, 'outgoing');
    const likedQuery = query(outgoingRef, where('liked', '==', true));
    const snapshot = await getDocs(likedQuery);

    if (snapshot.empty) {
      return success({ profiles: [] });
    }

    const likedEntries = snapshot.docs.map((docSnap) => {
      const likeData = docSnap.data() ?? {};
      return {
        targetUserId: docSnap.id,
        ...likeData,
      };
    });

    const targetIds = likedEntries
      .map((entry) => entry?.targetUserId)
      .filter((id) => typeof id === 'string' && id.length > 0);

    if (targetIds.length === 0) {
      return success({ profiles: [] });
    }

    const usersRef = collection(db, 'users');
    const userMap = new Map();
    const chunkSize = 10;

    for (let i = 0; i < targetIds.length; i += chunkSize) {
      const chunk = targetIds.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;
      const usersQuery = query(usersRef, where(documentId(), 'in', chunk));
      const usersSnapshot = await getDocs(usersQuery);
      usersSnapshot.forEach((userDoc) => {
        const data = userDoc.data() ?? {};
        userMap.set(userDoc.id, { id: userDoc.id, ...data });
      });
    }

    const profiles = likedEntries
      .map((entry) => {
        const profile = userMap.get(entry.targetUserId);
        if (!profile) return null;
        return {
          ...profile,
          like: entry,
        };
      })
      .filter(Boolean);

    return success({ profiles });
  } catch (e) {
    console.error('Failed to load liked profiles.', e);
    return failure(
      'fetch-liked-profiles-failed',
      'We were unable to load your shortlist. Please try again later.'
    );
  }
}

/** Like a user and try to create a match. Rules enforce reciprocity. */
export async function likeUser({ targetUserId, liked }) {
  const authResult = await ensureAuth();
  if (!authResult.ok) return authResult;

  const { data: { user } } = authResult;
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

  try {
    // owner-only path per rules
    const outgoingLikeRef = doc(db, 'likes', currentUserId, 'outgoing', trimmedTargetId);
    await setDoc(
      outgoingLikeRef,
      { liked, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
      { merge: true }
    );

    if (!liked) return success({ match: false });

    // Attempt to create the match; permission-denied = not mutual yet
    const [a, b] = [currentUserId, trimmedTargetId].sort();
    const matchId = `${a}_${b}`;
    const matchRef = doc(db, 'matches', matchId);

    let matchCreated = false;
    const timestamp = serverTimestamp();

    let matchSnapshot;
    try {
      matchSnapshot = await getDoc(matchRef);
    } catch (readError) {
      if (readError?.code !== 'permission-denied') {
        throw readError;
      }
    }

    const matchExists = Boolean(matchSnapshot?.exists?.());
    const existingMatchData = matchExists && typeof matchSnapshot?.data === 'function'
      ? matchSnapshot.data() ?? {}
      : {};

    if (matchExists) {
      const updatePayload = { updatedAt: timestamp };
      if (!existingMatchData?.matchedAt) {
        updatePayload.matchedAt = timestamp;
      }

      try {
        await updateDoc(matchRef, updatePayload);
        matchCreated = true;
      } catch (updateError) {
        if (updateError?.code === 'permission-denied' || updateError?.code === 'not-found') {
          return success({ match: false });
        }
        throw updateError;
      }
    } else {
      const createPayload = {
        users: [a, b],
        createdAt: timestamp,
        updatedAt: timestamp,
        matchedAt: timestamp,
      };

      try {
        await setDoc(matchRef, createPayload);
        matchCreated = true;
      } catch (setError) {
        if (setError?.code === 'permission-denied') {
          try {
            await updateDoc(matchRef, { updatedAt: timestamp, matchedAt: timestamp });
            matchCreated = true;
          } catch (updateError) {
            if (updateError?.code === 'permission-denied' || updateError?.code === 'not-found') {
              return success({ match: false });
            }
            throw updateError;
          }
        } else {
          throw setError;
        }
      }
    }

    return success({ match: matchCreated, matchId });
  } catch (e) {
    console.error('Failed to update like.', e);
    return failure('like-user-failed', 'Failed to update like. Please try again later.');
  }
}

/** Send a message in a match. Rules enforce participant-only writes. */
export async function sendMessage(matchId, content) {
  const authResult = await ensureAuth();
  if (!authResult.ok) return authResult;

  const { data: { user } } = authResult;
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
    const messagesRef = collection(db, 'matches', trimmedMatchId, 'messages');
    await addDoc(messagesRef, {
      senderId: currentUserId,
      content: trimmedContent,
      createdAt: serverTimestamp(),
    });

    // inbox ordering
    const matchRef = doc(db, 'matches', trimmedMatchId);
    await updateDoc(matchRef, {
      lastMessage: trimmedContent,
      updatedAt: serverTimestamp(),
    });

    return success({ success: true });
  } catch (e) {
    console.error('Failed to send message.', e);
    return failure('send-message-failed', 'Failed to send message. Please try again later.');
  }
}