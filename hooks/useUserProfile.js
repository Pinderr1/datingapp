import { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

export default function useUserProfile(uid) {
  const [profile, setProfile] = useState(null);
  const currentUserUid = auth.currentUser?.uid ?? null;

  useEffect(() => {
    if (!uid || !currentUserUid) {
      setProfile(null);
      return undefined;
    }
    const userRef = doc(db, 'users', uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      setProfile(docSnap.data() || null);
    });
    return unsub;
  }, [uid, currentUserUid]);

  return profile;
}
