import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useUser } from './UserContext';
import { useDev } from './DevContext';
import useRemoteConfig from '../hooks/useRemoteConfig';
import { db } from '../firebaseConfig';
import { logDev } from '../utils/logger';

interface GameLimitContextValue {
  gamesLeft: number;
  recordGamePlayed: () => Promise<void>;
}

const DEFAULT_LIMIT = 1;

const defaultValue: GameLimitContextValue = {
  gamesLeft: DEFAULT_LIMIT,
  recordGamePlayed: async () => undefined,
};

const GameLimitContext = createContext<GameLimitContextValue>(defaultValue);

export const GameLimitProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const { devMode } = useDev();
  const { maxFreeGames } = useRemoteConfig();
  const isPremium = Boolean(user?.isPremium);
  const limit = maxFreeGames ?? DEFAULT_LIMIT;
  const [gamesLeft, setGamesLeft] = useState<number>(isPremium ? Number.POSITIVE_INFINITY : limit);

  useEffect(() => {
    const dailyLimit = maxFreeGames ?? DEFAULT_LIMIT;
    if (isPremium || devMode) {
      setGamesLeft(Number.POSITIVE_INFINITY);
      return;
    }

    const lastPlayed = user?.lastGamePlayedAt;
    const last =
      (typeof lastPlayed === 'object' && lastPlayed !== null && 'toDate' in lastPlayed
        ? (lastPlayed as { toDate: () => Date }).toDate()
        : lastPlayed
      ) || null;
    const today = new Date().toDateString();

    if (last instanceof Date && last.toDateString() === today) {
      setGamesLeft(Math.max(dailyLimit - (Number(user?.dailyPlayCount) || 0), 0));
    } else {
      setGamesLeft(dailyLimit);
    }
  }, [isPremium, devMode, user?.dailyPlayCount, user?.lastGamePlayedAt, maxFreeGames]);

  const recordGamePlayed = useCallback(async () => {
    if (isPremium || devMode || !user?.uid) {
      return;
    }

    const lastPlayed = user?.lastGamePlayedAt;
    const last =
      (typeof lastPlayed === 'object' && lastPlayed !== null && 'toDate' in lastPlayed
        ? (lastPlayed as { toDate: () => Date }).toDate()
        : lastPlayed
      ) || null;
    const today = new Date();

    let count = 1;
    if (last instanceof Date && last.toDateString() === today.toDateString()) {
      count = (Number(user?.dailyPlayCount) || 0) + 1;
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
  }, [devMode, isPremium, maxFreeGames, user?.dailyPlayCount, user?.lastGamePlayedAt, user?.uid]);

  const value = useMemo<GameLimitContextValue>(
    () => ({
      gamesLeft,
      recordGamePlayed,
    }),
    [gamesLeft, recordGamePlayed],
  );

  return <GameLimitContext.Provider value={value}>{children}</GameLimitContext.Provider>;
};

export const useGameLimit = () => useContext(GameLimitContext);

export default GameLimitContext;
