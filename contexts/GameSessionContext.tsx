import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useUser } from './UserContext';

export interface GameSession {
  id: string;
  [key: string]: unknown;
}

interface GameSessionContextValue {
  sessions: GameSession[];
}

const defaultValue: GameSessionContextValue = {
  sessions: [],
};

const GameSessionContext = createContext<GameSessionContextValue>(defaultValue);

export const GameSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [sessions, setSessions] = useState<GameSession[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      setSessions([]);
      return undefined;
    }

    const sessionsQuery = query(
      collection(db, 'gameSessions'),
      where('players', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        const list: GameSession[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() ?? {}),
        }));
        setSessions(list);
      },
      (error) => {
        console.error('Failed to load active game sessions', error);
        setSessions([]);
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  const value = useMemo<GameSessionContextValue>(() => ({ sessions }), [sessions]);

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
};

export const useGameSessions = () => useContext(GameSessionContext);

export default GameSessionContext;
