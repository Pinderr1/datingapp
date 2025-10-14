import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function useWinLossStats(userId) {
  const [stats, setStats] = useState({ wins: 0, losses: 0, loading: true });
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const sessionsQuery = query(
          collection(db, 'gameSessions'),
          where('players', 'array-contains', userId)
        );
        const snap = await getDocs(sessionsQuery);
        let wins = 0;
        snap.forEach((doc) => {
          const data = doc.data();
          const idx = Array.isArray(data.players)
            ? data.players.indexOf(userId)
            : -1;
          if (idx !== -1 && data.gameover && data.gameover.winner === String(idx)) {
            wins += 1;
          }
        });
        setStats({ wins, losses: snap.size - wins, loading: false });
      } catch (e) {
        console.warn('Failed to load win/loss stats', e);
        setStats({ wins: 0, losses: 0, loading: false });
      }
    };
    load();
  }, [userId]);
  return stats;
}
