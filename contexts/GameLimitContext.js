import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useUser } from './UserContext';
import { useDev } from './DevContext';
import useRemoteConfig from '../hooks/useRemoteConfig';
import { db } from '../firebaseConfig';
import { logDev } from '../utils/logger';

const GameLimitContext = createContext({
  gamesLeft: Infinity,
  recordGamePlayed: async () => {},
});

const DEFAULT_LIMIT = 1;

export const GameLimitProvider = ({ children }) => {
  const { user } = useUser();
  const { devMode } = useDev();
  const { maxFreeGames } = useRemoteConfig();

  const isPremium = !!user?.isPremium;
  const limit = maxFreeGames ?? DEFAULT_LIMIT;
  const [gamesLeft, setGamesLeft] = useState(isPremium ? Infinity : limit);

  useEffect(() => {
    const dailyLimit = maxFreeGames ?? DEFAULT_LIMIT;
    if (isPremium || devMode) {
      setGamesLeft(Infinity);
      return;
    }

    const lastDate = user?.lastGamePlayedAt?.toDate?.() ??
      (user?.lastGamePlayedAt ? new Date(user.lastGamePlayedAt) : null);
    const today = new Date().toDateString();
    if (lastDate && lastDate.toDateString() === today) {
      setGamesLeft(Math.max(dailyLimit - (user?.dailyPlayCount || 0), 0));
    } else {
      setGamesLeft(dailyLimit);
    }
  }, [isPremium, devMode, user?.dailyPlayCount, user?.lastGamePlayedAt, maxFreeGames]);

  const recordGamePlayed = async () => {
    if (isPremium || devMode || !user?.uid) return;

    const lastDate = user.lastGamePlayedAt?.toDate?.() ??
      (user.lastGamePlayedAt ? new Date(user.lastGamePlayedAt) : null);
    const today = new Date();
    let count = 1;
    if (lastDate && lastDate.toDateString() === today.toDateString()) {
      count = (user.dailyPlayCount || 0) + 1;
    }

    const dailyLimit = maxFreeGames ?? DEFAULT_LIMIT;
    setGamesLeft(Math.max(dailyLimit - count, 0));

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        dailyPlayCount: count,
        lastGamePlayedAt: serverTimestamp(),
      });
    } catch (error) {
      logDev('Failed to update play count', error);
    }
  };

  return (
    <GameLimitContext.Provider value={{ gamesLeft, recordGamePlayed }}>
      {children}
    </GameLimitContext.Provider>
  );
};

export const useGameLimit = () => useContext(GameLimitContext);

export default GameLimitContext;
