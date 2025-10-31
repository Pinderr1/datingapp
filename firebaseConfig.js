// firebaseConfig.js
// Expo SDK 54 + Firebase v9 (modular) + React Native
// Strict env validation, robust Auth init (web vs native), guaranteed Storage instance.

import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { initializeApp, getApp, getApps } from 'firebase/app'
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// ---- Env & config sanity ----
const cfg = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID, // web only; harmless on native
}

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId']
const missing = requiredKeys.filter((k) => !cfg[k])

if (missing.length) {
  // Fail fast so misconfig doesn’t cause subtle runtime bugs (e.g., null storage).
  console.error(
    '[Firebase] Missing env keys:',
    missing.join(', '),
    '\nEnsure EXPO_PUBLIC_* variables are set in app config (app.json/app.config.js) and env.'
  )
  throw new Error(`Firebase misconfigured. Missing: ${missing.join(', ')}`)
}

const firebaseConfig = cfg

// Helpful sanity log (shows in Metro)
console.log('[Firebase] Project:', firebaseConfig.projectId, '| Bucket:', firebaseConfig.storageBucket)

// ---- App ----
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// ---- Auth (web vs native) ----
// On native, initializeAuth must be called once with persistence; if already initialized (hot reload), fall back to getAuth.
let auth
if (Platform.OS === 'web') {
  auth = getAuth(app)
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  } catch (e) {
    // If already initialized during Fast Refresh / HMR
    auth = getAuth(app)
  }
}

// ---- Firestore ----
const db = getFirestore(app)

// ---- Storage (must exist for onboarding uploads) ----
if (!app?.options?.storageBucket) {
  // Should never happen because we validated above, but keep a guard.
  throw new Error(
    '[Firebase] storageBucket missing from config. Set EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET.'
  )
}

let storage
try {
  storage = getStorage(app)
} catch (err) {
  console.error('[Firebase] Failed to initialize Storage:', err)
  throw err
}

export { app as default, auth, db, storage }
