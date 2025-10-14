// utils/upload.js
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

async function fetchBlob(uri) {
  const res = await fetch(uri);
  return await res.blob();
}

function getBucket() {
  try {
    return storage?.app?.options?.storageBucket || 'NO_BUCKET';
  } catch {
    return 'NO_BUCKET';
  }
}

function logStart(tag, uid, path, extra = {}) {
  console.debug(`[${tag}] start`, { uid, bucket: getBucket(), path, ...extra });
}
function logOk(tag, uid, path, url) {
  console.debug(`[${tag}] ok`, { uid, bucket: getBucket(), path, url });
}
function logErr(tag, uid, path, e) {
  console.debug(`[${tag}] error`, {
    uid,
    bucket: getBucket(),
    path,
    code: e?.code,
    message: e?.message,
    serverResponse: e?.customData?.serverResponse || '(no serverResponse)',
  });
}

// Avatar image
export async function uploadAvatarAsync(uri, uid) {
  if (!uri || !uid) throw new Error('uri and uid required');
  if (uri.startsWith('http')) return uri;

  const blob = await fetchBlob(uri);
  const path = `avatars/${uid}/avatar_${Date.now()}.jpg`;
  const fileRef = ref(storage, path);

  try {
    logStart('uploadAvatar', uid, path);
    await uploadBytes(fileRef, blob, {
      contentType: 'image/jpeg',
      cacheControl: 'public,max-age=3600',
    });
    const url = await getDownloadURL(fileRef);
    logOk('uploadAvatar', uid, path, url);
    return url;
  } catch (e) {
    logErr('uploadAvatar', uid, path, e);
    throw e;
  }
}

// Optional intro video/audio clip
export async function uploadIntroClipAsync(uri, uid) {
  if (!uri || !uid) throw new Error('uri and uid required');
  if (uri.startsWith('http')) return uri;

  const blob = await fetchBlob(uri);
  const ext = (uri.match(/\.([a-zA-Z0-9]+)$/) || [, 'mp4'])[1];
  const mime =
    ext === 'mov' ? 'video/quicktime' :
    ext === 'm4a' ? 'audio/mp4' :
    ext === 'mp3' ? 'audio/mpeg' :
    'video/mp4';

  const path = `introClips/${uid}/${Date.now()}.${ext}`;
  const fileRef = ref(storage, path);

  try {
    logStart('uploadIntroClip', uid, path, { ext, mime });
    await uploadBytes(fileRef, blob, { contentType: mime, cacheControl: 'public,max-age=3600' });
    const url = await getDownloadURL(fileRef);
    logOk('uploadIntroClip', uid, path, url);
    return url;
  } catch (e) {
    logErr('uploadIntroClip', uid, path, e);
    throw e;
  }
}

// Optional voice message
export async function uploadVoiceAsync(uri, uid) {
  if (!uri || !uid) throw new Error('uri and uid required');
  const blob = await fetchBlob(uri);
  const path = `voiceMessages/${uid}/${Date.now()}.m4a`;
  const fileRef = ref(storage, path);

  try {
    logStart('uploadVoice', uid, path);
    await uploadBytes(fileRef, blob, { contentType: 'audio/mp4', cacheControl: 'public,max-age=3600' });
    const url = await getDownloadURL(fileRef);
    logOk('uploadVoice', uid, path, url);
    return url;
  } catch (e) {
    logErr('uploadVoice', uid, path, e);
    throw e;
  }
}
