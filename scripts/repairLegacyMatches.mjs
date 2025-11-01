#!/usr/bin/env node

import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore'

const requiredEnv = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
]

const missing = requiredEnv.filter((key) => !process.env[key])

if (missing.length) {
  console.error(
    `Missing required Firebase environment variables: ${missing.join(', ')}.\n` +
      'Ensure production credentials are loaded before running this migration.'
  )
  process.exit(1)
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
const db = getFirestore(app)

async function loadUserMeta(uid) {
  const userSnap = await getDoc(doc(db, 'users', uid))
  const userData = userSnap.exists() ? userSnap.data() : {}
  return {
    displayName: userData?.displayName || '',
    photoURL: userData?.photoURL || '',
  }
}

function parseParticipants(matchId, dataUsers) {
  if (Array.isArray(dataUsers) && dataUsers.length === 2) {
    return dataUsers.slice().sort()
  }
  const parts = matchId.split('_')
  if (parts.length === 2 && parts[0] && parts[1]) {
    return parts.slice().sort()
  }
  return null
}

async function repairMatchDoc(docSnap) {
  const data = docSnap.data() || {}
  const participants = parseParticipants(docSnap.id, data.users)
  if (!participants) {
    return { repaired: false, skipped: true }
  }

  const expectedUsers = participants
  const hasUsersArray =
    Array.isArray(data.users) && expectedUsers.every((id) => data.users.includes(id))

  const existingMeta = data.userMeta && typeof data.userMeta === 'object' ? { ...data.userMeta } : {}
  const missingMetaIds = expectedUsers.filter((id) => {
    const meta = existingMeta[id]
    return !meta || typeof meta !== 'object'
  })

  if (hasUsersArray && missingMetaIds.length === 0) {
    return { repaired: false, skipped: true }
  }

  const updatePayload = { updatedAt: new Date() }

  if (!hasUsersArray) {
    updatePayload.users = expectedUsers
  }

  if (!data.matchedAt) {
    updatePayload.matchedAt = new Date()
  }

  if (missingMetaIds.length > 0) {
    for (const uid of missingMetaIds) {
      existingMeta[uid] = await loadUserMeta(uid)
    }
    updatePayload.userMeta = existingMeta
  }

  await updateDoc(doc(db, 'matches', docSnap.id), updatePayload)

  return { repaired: true, skipped: false }
}

async function run() {
  const matchesRef = collection(db, 'matches')
  const snapshot = await getDocs(matchesRef)

  let repairedCount = 0
  let skippedCount = 0

  for (const docSnap of snapshot.docs) {
    try {
      const result = await repairMatchDoc(docSnap)
      if (result.repaired) {
        repairedCount += 1
      } else {
        skippedCount += 1
      }
    } catch (error) {
      console.error(`Failed to repair match ${docSnap.id}:`, error)
    }
  }

  console.log(`Legacy match repair complete. Repaired: ${repairedCount}, skipped: ${skippedCount}`)
}

run().catch((error) => {
  console.error('Legacy match repair failed:', error)
  process.exit(1)
})
