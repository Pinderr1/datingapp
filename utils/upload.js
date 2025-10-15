// utils/upload.js

const IMAGE_PLACEHOLDER_URL = 'https://example.com/placeholder.jpg';
const INTRO_CLIP_PLACEHOLDER_URL = 'https://example.com/placeholder.mp4';
const VOICE_PLACEHOLDER_URL = 'https://example.com/placeholder.m4a';

export async function uploadAvatarAsync(uri, uid) {
  if (!uri || !uid) throw new Error('uri and uid required');
  if (uri.startsWith('http')) return uri;

  console.warn('Storage upload skipped (no bucket)');
  return IMAGE_PLACEHOLDER_URL;
}

export async function uploadIntroClipAsync(uri, uid) {
  if (!uri || !uid) throw new Error('uri and uid required');
  if (uri.startsWith('http')) return uri;

  console.warn('Storage upload skipped (no bucket)');
  return INTRO_CLIP_PLACEHOLDER_URL;
}

export async function uploadVoiceAsync(uri, uid) {
  if (!uri || !uid) throw new Error('uri and uid required');
  if (uri.startsWith('http')) return uri;

  console.warn('Storage upload skipped (no bucket)');
  return VOICE_PLACEHOLDER_URL;
}
