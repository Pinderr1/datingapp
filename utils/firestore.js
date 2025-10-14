export const snapshotExists = (snapshot) => {
  if (!snapshot) {
    return false;
  }

  if (typeof snapshot.exists === 'boolean') {
    return snapshot.exists;
  }

  if (typeof snapshot.empty === 'boolean') {
    return !snapshot.empty;
  }

  if (Array.isArray(snapshot.docs)) {
    return snapshot.docs.length > 0;
  }

  return false;
};

export default { snapshotExists };
