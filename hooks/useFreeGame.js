import { useCallback } from 'react';
import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';

export default function useFreeGame() {
  const { user, updateUser } = useUser();
  const freeGamesToday = user?.freeGamesToday || 0;

  const recordFreeGame = useCallback(async () => {
    if (!user?.uid) return;
    const newCount = freeGamesToday + 1;
    updateUser({ freeGamesToday: newCount });
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { freeGamesToday: newCount });
    } catch (e) {
      console.warn('Failed to record free game', e);
    }
  }, [user?.uid, freeGamesToday, updateUser]);

  return { freeGamesToday, recordFreeGame };
}
