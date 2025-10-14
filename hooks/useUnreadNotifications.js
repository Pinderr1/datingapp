import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';

export default function useUnreadNotifications() {
  const { user } = useUser();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    const notificationsQuery = query(
      collection(db, 'users', user.uid, 'notifications'),
      where('read', '==', false)
    );
    const unsub = onSnapshot(notificationsQuery, (snap) => setCount(snap.size));
    return unsub;
  }, [user?.uid]);

  return count;
}
