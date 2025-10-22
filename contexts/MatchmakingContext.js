import React, { createContext, useCallback, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useUser } from './UserContext';

const MatchmakingContext = createContext({
  sendGameInvite: async () => {
    throw new Error('MatchmakingProvider is missing');
  },
  cancelInvite: async () => {
    throw new Error('MatchmakingProvider is missing');
  },
});

export const MatchmakingProvider = ({ children }) => {
  const { user } = useUser();

  const sendGameInvite = useCallback(
    async (opponentId, gameId) => {
      if (!user?.uid) {
        throw new Error('User must be authenticated to send a game invite.');
      }
      if (!opponentId) {
        throw new Error('Opponent id is required to send a game invite.');
      }
      if (!gameId) {
        throw new Error('Game id is required to send a game invite.');
      }

      const now = serverTimestamp();
      const ref = await addDoc(collection(db, 'games'), {
        gameId,
        status: 'waiting',
        host: user.uid,
        opponent: opponentId,
        players: [user.uid, opponentId],
        users: [user.uid, opponentId],
        joinedPlayers: [],
        createdAt: now,
        updatedAt: now,
      });

      return ref.id;
    },
    [user?.uid]
  );

  const cancelInvite = useCallback(
    async (inviteId) => {
      if (!user?.uid) {
        throw new Error('User must be authenticated to cancel a game invite.');
      }

      if (!inviteId) {
        throw new Error('Invite id is required to cancel a game invite.');
      }

      const now = serverTimestamp();
      await setDoc(
        doc(db, 'games', inviteId),
        {
          status: 'cancelled',
          cancelledAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    },
    [user?.uid]
  );

  const value = useMemo(
    () => ({ sendGameInvite, cancelInvite }),
    [sendGameInvite, cancelInvite]
  );

  return (
    <MatchmakingContext.Provider value={value}>
      {children}
    </MatchmakingContext.Provider>
  );
};

MatchmakingProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useMatchmaking = () => useContext(MatchmakingContext);

export default MatchmakingContext;
