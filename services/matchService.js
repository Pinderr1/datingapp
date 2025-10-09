// services/matchService.js
import { auth, db } from '../firebaseConfig';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

/** Listen to *my* matches only (rule-friendly). */
export function subscribeToMyMatches(onChange) {
  const user = auth.currentUser;
  if (!user) {
    onChange?.([]);
    return () => {};
  }
  const uid = user.uid;

  const q = query(
    collection(db, 'matches'),
    where('users', 'array-contains', uid),
    orderBy('updatedAt', 'desc'),
    limit(50)
  );

  const unsub = onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onChange?.(rows);
  }, (err) => {
    console.error('Failed to listen for matches', err);
    onChange?.([]);
  });

  return unsub;
}