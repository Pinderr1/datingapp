// utils/upload.js

const PLACEHOLDER_URL = 'https://example.com/placeholder.jpg';

export async function uploadAvatarAsync(uri, uid) {
  if (!uri || !uid) throw new Error('uri and uid required');
  if (uri.startsWith('http')) return uri;

  console.warn('Storage upload skipped (no bucket)');
  return PLACEHOLDER_URL;
}

export async function uploadIntroClipAsync(uri, uid) {
  if (!uri || !uid) throw new Error('uri and uid required');
  if (uri.startsWith('http')) return uri;

  console.warn('Storage upload skipped (no bucket)');
  return PLACEHOLDER_URL;
}

export async function uploadVoiceAsync(uri, uid) {
  if (!uri || !uid) throw new Error('uri and uid required');
  if (uri.startsWith('http')) return uri;

  console.warn('Storage upload skipped (no bucket)');
  return PLACEHOLDER_URL;
}
