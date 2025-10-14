export function snapshotExists(snapshot) {
  if (!snapshot) return false;
  if (typeof snapshot.exists === 'function') {
    return snapshot.exists();
  }
  if (typeof snapshot.exists === 'boolean') {
    return snapshot.exists;
  }
  if (typeof snapshot.size === 'number') {
    return snapshot.size > 0;
  }
  if (Array.isArray(snapshot.docs)) {
    return snapshot.docs.length > 0;
  }
  return false;
}
