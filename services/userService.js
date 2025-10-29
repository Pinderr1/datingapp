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
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
import { ensureAuth } from './authService'
import { success, failure } from './result'

export async function fetchSwipeCandidates({
  limit = 20,
  startAfter: startAfterCursor,
} = {}) {
  const authResult = await ensureAuth()
  if (!authResult.ok) return authResult
  const {
    data: { user },
  } = authResult
  const currentUserId = user?.uid
  if (!currentUserId)
    return failure('fetch-candidates-failed', 'You must be signed in.')

  try {
    const outgoingRef = collection(db, 'likes', currentUserId, 'outgoing')
    const outgoingSnapshot = await getDocs(outgoingRef)
    const excludedIds = new Set()
    outgoingSnapshot.forEach((d) => excludedIds.add(d.id))

    const usersRef = collection(db, 'users')
    const constraints = [where(documentId(), '!=', currentUserId), orderBy(documentId()), limitQuery(limit)]
    if (startAfterCursor) constraints.push(startAfterConstraint(startAfterCursor))
    const usersQuery = query(usersRef, ...constraints)
    const snapshot = await getDocs(usersQuery)

    const users = snapshot.docs
      .map((s) => ({ id: s.id, ...(s.data() ?? {}) }))
      .filter((c) => c.id && c.id !== currentUserId && !excludedIds.has(c.id))

    const lastVisible = snapshot.docs[snapshot.docs.length - 1]
    const nextCursor = lastVisible ? lastVisible.id : null
    return success({ users, nextCursor })
  } catch (e) {
    console.error('fetchSwipeCandidates failed', e)
    return failure('fetch-candidates-failed', 'Failed to load candidates.')
  }
}

export const fetchUsers = fetchSwipeCandidates

export async function fetchUserById(userId) {
  const authResult = await ensureAuth()
  if (!authResult.ok) return authResult
  if (!userId) return failure('fetch-user-failed', 'Invalid user id.')
  try {
    const userRef = doc(db, 'users', userId)
    const snapshot = await getDoc(userRef)
    if (!snapshot.exists()) return failure('fetch-user-failed', 'Not found.')
    return success({ id: snapshot.id, ...snapshot.data() })
  } catch (e) {
    console.error('fetchUserById failed', e)
    return failure('fetch-user-failed', 'Unable to load profile.')
  }
}

export async function fetchLikedProfiles() {
  const authResult = await ensureAuth()
  if (!authResult.ok) return authResult
  const {
    data: { user },
  } = authResult
  const currentUserId = user?.uid
  if (!currentUserId)
    return failure('fetch-liked-profiles-failed', 'Sign in required.')
  try {
    const outgoingRef = collection(db, 'likes', currentUserId, 'outgoing')
    const likedQuery = query(outgoingRef, where('liked', '==', true))
    const snapshot = await getDocs(likedQuery)
    if (snapshot.empty) return success({ profiles: [] })
    const likedIds = snapshot.docs.map((d) => d.id)
    if (likedIds.length === 0) return success({ profiles: [] })

    const userMap = new Map()
    const chunkSize = 10
    const usersRef = collection(db, 'users')
    for (let i = 0; i < likedIds.length; i += chunkSize) {
      const chunk = likedIds.slice(i, i + chunkSize)
      const usersQuery = query(usersRef, where(documentId(), 'in', chunk))
      const userSnap = await getDocs(usersQuery)
      userSnap.forEach((u) => userMap.set(u.id, { id: u.id, ...u.data() }))
    }
    const profiles = likedIds
      .map((id) => userMap.get(id))
      .filter(Boolean)
    return success({ profiles })
  } catch (e) {
    console.error('fetchLikedProfiles failed', e)
    return failure('fetch-liked-profiles-failed', 'Failed to load shortlist.')
  }
}

export async function likeUser({ targetUserId, liked }) {
  const authResult = await ensureAuth()
  if (!authResult.ok) return authResult
  const {
    data: { user },
  } = authResult
  const currentUserId = user?.uid
  if (!targetUserId || currentUserId === targetUserId)
    return failure('like-user-failed', 'Invalid target.')
  try {
    const outgoingLikeRef = doc(db, 'likes', currentUserId, 'outgoing', targetUserId)
    await setDoc(
      outgoingLikeRef,
      { liked, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
      { merge: true }
    )
    if (!liked) return success({ match: false })
    const [a, b] = [currentUserId, targetUserId].sort()
    const matchId = `${a}_${b}`
    const matchRef = doc(db, 'matches', matchId)
    const timestamp = serverTimestamp()
    const matchSnapshot = await getDoc(matchRef)
    if (matchSnapshot.exists()) {
      const data = matchSnapshot.data() ?? {}
      const updatePayload = { updatedAt: timestamp }
      if (!data.matchedAt) updatePayload.matchedAt = timestamp
      try {
        await updateDoc(matchRef, updatePayload)
        return success({ match: true, matchId })
      } catch {
        return success({ match: false })
      }
    } else {
      const currentUserDoc = await getDoc(doc(db, 'users', currentUserId))
      const targetUserDoc = await getDoc(doc(db, 'users', targetUserId))
      const currentData = currentUserDoc.exists() ? currentUserDoc.data() : {}
      const targetData = targetUserDoc.exists() ? targetUserDoc.data() : {}
      const createPayload = {
        users: [a, b],
        createdAt: timestamp,
        updatedAt: timestamp,
        matchedAt: timestamp,
        userMeta: {
          [a]: {
            displayName: currentData.displayName || '',
            photoURL: currentData.photoURL || '',
          },
          [b]: {
            displayName: targetData.displayName || '',
            photoURL: targetData.photoURL || '',
          },
        },
      }
      try {
        await setDoc(matchRef, createPayload)
        return success({ match: true, matchId })
      } catch {
        return success({ match: false })
      }
    }
  } catch (e) {
    console.error('likeUser failed', e)
    return failure('like-user-failed', 'Failed to like user.')
  }
}

export async function sendMessage(matchId, content) {
  const authResult = await ensureAuth()
  if (!authResult.ok) return authResult
  const {
    data: { user },
  } = authResult
  const currentUserId = user?.uid
  if (!matchId || !content) return failure('send-message-failed', 'Invalid message.')
  try {
    const messagesRef = collection(db, 'matches', matchId, 'messages')
    await addDoc(messagesRef, {
      senderId: currentUserId,
      content: content.trim(),
      createdAt: serverTimestamp(),
    })
    const matchRef = doc(db, 'matches', matchId)
    await updateDoc(matchRef, {
      lastMessage: content.trim(),
      updatedAt: serverTimestamp(),
    })
    return success({ success: true })
  } catch (e) {
    console.error('sendMessage failed', e)
    return failure('send-message-failed', 'Failed to send message.')
  }
}
