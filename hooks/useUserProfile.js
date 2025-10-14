import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

export default function useUserProfile(uid) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    const userRef = doc(db, 'users', uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      setProfile(docSnap.data() || null);
    });
    return unsub;
  }, [uid]);

  return profile;
}
