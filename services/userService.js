// services/userService.js
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
      .filter((c) => c.id && c.id !== currentUserId);

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
    try {
      await setDoc(
        matchRef,
        { users: [a, b], createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true }
      );
      matchCreated = true;
    } catch (_) {
      matchCreated = false;
    }

    return success({ match: matchCreated, matchId });
  } catch (e) {
    console.error('Failed to update like.', e);
    return failure('like-user-failed', 'Failed to update like. Please try again later.');
  }
}

/** Fetch profiles the current user has liked (shortlist). */
export async function fetchLikedProfiles() {
  const authResult = await ensureAuth();
  if (!authResult.ok) return authResult;

  const { data: { user } } = authResult;
  const currentUserId = user?.uid;

  if (!currentUserId) {
    return failure(
      'fetch-liked-profiles-failed',
      'You must be signed in to view your shortlist.'
    );
  }

  try {
    const outgoingLikesRef = collection(db, 'likes', currentUserId, 'outgoing');
    const likesQuery = query(outgoingLikesRef, where('liked', '==', true));
    const snapshot = await getDocs(likesQuery);

    if (snapshot.empty) {
      return success({ users: [] });
    }

    const likes = snapshot.docs.map((docSnap) => {
      const likeData = docSnap.data() ?? {};
      return {
        targetUserId: docSnap.id,
        metadata: {
          liked: likeData.liked ?? true,
          createdAt: likeData.createdAt ?? null,
          updatedAt: likeData.updatedAt ?? null,
        },
      };
    });

    const toMillis = (value) => {
      if (!value) return 0;
      if (typeof value.toMillis === 'function') return value.toMillis();
      if (typeof value === 'number') return value;
      if (typeof value === 'object' && typeof value.seconds === 'number') {
        const nanos = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
        return value.seconds * 1000 + Math.floor(nanos / 1e6);
      }
      return 0;
    };

    likes.sort((a, b) => {
      const aTime = toMillis(a.metadata.updatedAt) || toMillis(a.metadata.createdAt);
      const bTime = toMillis(b.metadata.updatedAt) || toMillis(b.metadata.createdAt);
      return bTime - aTime;
    });

    const profiles = await Promise.all(
      likes.map(async ({ targetUserId }) => {
        try {
          const userRef = doc(db, 'users', targetUserId);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) return null;
          const profileData = userSnap.data() ?? {};
          return { id: userSnap.id, ...profileData };
        } catch (error) {
          console.error(`Failed to fetch user profile for like ${targetUserId}.`, error);
          return null;
        }
      })
    );

    const users = [];
    likes.forEach((like, index) => {
      const profile = profiles[index];
      if (!profile) return;
      users.push({
        ...profile,
        id: profile.id ?? like.targetUserId,
        isFavorite: true,
        like: {
          targetUserId: like.targetUserId,
          liked: true,
          createdAt: like.metadata.createdAt,
          updatedAt: like.metadata.updatedAt,
        },
      });
    });

    return success({ users });
  } catch (error) {
    console.error('Failed to load liked profiles.', error);
    return failure(
      'fetch-liked-profiles-failed',
      'We were unable to load your shortlist. Please try again in a moment.'
    );
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