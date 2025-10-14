import React, { createContext, useContext, useMemo } from 'react';
import { useListeners } from './ListenerContext';

const GameSessionContext = createContext({
  sessions: [],
  loading: false,
});

export const GameSessionProvider = ({ children }) => {
  const { sessions, sessionsLoading } = useListeners();

  const value = useMemo(
    () => ({
      sessions,
      loading: sessionsLoading,
    }),
    [sessions, sessionsLoading]
  );

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
};

export const useGameSessions = () => useContext(GameSessionContext);

export default GameSessionContext;
