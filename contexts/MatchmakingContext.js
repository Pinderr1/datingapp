import React, { createContext, useCallback, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useUser } from './UserContext';

const MatchmakingContext = createContext({
  sendGameInvite: async () => {
    throw new Error('MatchmakingProvider is missing');
  },
  cancelInvite: async () => {
    throw new Error('MatchmakingProvider is missing');
  },
  createOpenChallenge: async () => {
    throw new Error('MatchmakingProvider is missing');
  },
  acceptOpenChallenge: async () => {
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

  const createOpenChallenge = useCallback(
    async (gameId) => {
      if (!user?.uid) {
        throw new Error('User must be authenticated to start matchmaking.');
      }

      if (!gameId) {
        throw new Error('Game id is required to start matchmaking.');
      }

      const now = serverTimestamp();
      const ref = await addDoc(collection(db, 'games'), {
        gameId,
        status: 'waiting',
        host: user.uid,
        opponent: null,
        players: [user.uid],
        users: [user.uid],
        joinedPlayers: [user.uid],
        createdAt: now,
        updatedAt: now,
        type: 'public',
      });

      return ref.id;
    },
    [user?.uid]
  );

  const acceptOpenChallenge = useCallback(
    async (inviteId) => {
      if (!user?.uid) {
        throw new Error('User must be authenticated to join matchmaking.');
      }

      if (!inviteId) {
        throw new Error('Invite id is required to join matchmaking.');
      }

      const ref = doc(db, 'games', inviteId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error('Challenge no longer exists.');
      }

      const data = snap.data();
      const hostId = data?.host;
      if (!hostId || hostId === user.uid) {
        throw new Error('You cannot join this challenge.');
      }

      if ((data?.status || 'waiting') !== 'waiting' || data?.opponent) {
        throw new Error('Challenge has already been claimed.');
      }

      const now = serverTimestamp();
      await updateDoc(ref, {
        opponent: user.uid,
        status: 'ready',
        players: arrayUnion(user.uid),
        users: arrayUnion(user.uid),
        joinedPlayers: arrayUnion(user.uid),
        updatedAt: now,
      });

      return { hostId, gameId: data?.gameId };
    },
    [user?.uid]
  );

  const value = useMemo(
    () => ({ sendGameInvite, cancelInvite, createOpenChallenge, acceptOpenChallenge }),
    [sendGameInvite, cancelInvite, createOpenChallenge, acceptOpenChallenge]
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
