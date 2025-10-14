import React, { createContext, useCallback, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useUser } from './UserContext';

const MatchmakingContext = createContext(null);

export function MatchmakingProvider({ children }) {
  const { user } = useUser();

  const sendGameInvite = useCallback(
    async (opponentId, gameId) => {
      if (!user?.uid) {
        throw new Error('You must be signed in to send a game invite.');
      }
      if (!opponentId || !gameId) {
        throw new Error('Missing opponent or game information.');
      }

      const inviteRef = doc(collection(db, 'gameInvites'));
      const timestamp = serverTimestamp();
      await setDoc(inviteRef, {
        id: inviteRef.id,
        from: user.uid,
        to: opponentId,
        gameId,
        status: 'waiting',
        players: [user.uid, opponentId],
        gameSessionId: inviteRef.id,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return inviteRef.id;
    },
    [user?.uid]
  );

  const cancelInvite = useCallback(
    async (inviteId) => {
      if (!inviteId) {
        return;
      }
      const ref = doc(db, 'gameInvites', inviteId);
      await setDoc(
        ref,
        {
          status: 'cancelled',
          cancelledBy: user?.uid || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    [user?.uid]
  );

  const value = useMemo(
    () => ({
      sendGameInvite,
      cancelInvite,
    }),
    [sendGameInvite, cancelInvite]
  );

  return (
    <MatchmakingContext.Provider value={value}>
      {children}
    </MatchmakingContext.Provider>
  );
}

MatchmakingProvider.propTypes = {
  children: PropTypes.node,
};

export const MatchmakingContextConsumer = MatchmakingContext.Consumer;

export function useMatchmaking() {
  const context = useContext(MatchmakingContext);
  if (!context) {
    throw new Error('useMatchmaking must be used within a MatchmakingProvider.');
  }
  return context;
}

export default MatchmakingContext;
