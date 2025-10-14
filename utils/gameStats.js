import { db } from '../firebaseConfig';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { snapshotExists } from './firestore';

export async function logGameStats(sessionId) {
  if (!sessionId) return;
  try {
    const ref = doc(db, 'gameSessions', sessionId);
    const snap = await getDoc(ref);
    if (!snapshotExists(snap)) return;
    const data = snap.data() || {};
    if (!data.gameover) return;

    const created = data.createdAt?.toDate?.() || data.createdAt;
    const updated = data.updatedAt?.toDate?.() || new Date();
    const duration = created && updated ? Math.round((updated - created) / 1000) : 0;
    const players = data.players || [];
    let winner = null;
    if (data.gameover.winner != null && players[data.gameover.winner]) {
      winner = players[data.gameover.winner];
    }

    const statsRef = doc(db, 'gameStats', sessionId);
    await setDoc(statsRef, {
      gameId: data.gameId,
      players,
      durationSec: duration,
      winner,
      moves: data.moves || [],
      loggedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Failed to log game stats', e);
  }
}
