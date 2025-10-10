// utils/upload.js
import { storage, db, auth } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';

async function fetchBlob(uri) {
  const res = await fetch(uri);
  return await res.blob();
}

export async function uploadAvatarAsync(uri, uid) {
  if (!uri || !uid) throw new Error('uri and uid required');
  if (uri.startsWith('http')) return uri;

  const blob = await fetchBlob(uri);
  const path = `avatars/${uid}/avatar_${Date.now()}.jpg`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob);
  const url = await getDownloadURL(fileRef);

  // Optional: server-side flag placeholder removed for MVP.
  // If you still want a "flaggedForReview" toggle, it must be allowed by your rules.
  // await setDoc(doc(db, 'users', uid), { flaggedForReview: false }, { merge: true });

  return url;
}

export async function uploadIntroClipAsync(uri, uid) {
  if (!uri || !uid) throw new Error('uri and uid required');
  if (uri.startsWith('http')) return uri;

  const blob = await fetchBlob(uri);
  const ext = (uri.match(/\.([a-zA-Z0-9]+)$/) || [,'mp4'])[1];
  const path = `introClips/${uid}/${Date.now()}.${ext}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob);
  return await getDownloadURL(fileRef);
}

// Optional voice upload (not needed for MVP onboarding)
export async function uploadVoiceAsync(uri, uid) {
  if (!uri || !uid) throw new Error('uri and uid required');
  const blob = await fetchBlob(uri);
  const path = `voiceMessages/${uid}/${Date.now()}.m4a`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob);
  return await getDownloadURL(fileRef);
}
