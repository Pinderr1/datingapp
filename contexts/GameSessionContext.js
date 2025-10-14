import React, { createContext, useContext, useMemo } from 'react';
import { useListeners } from './ListenerContext';

const GameSessionContext = createContext({
  sessions: [],
  loading: true,
  error: null,
});

export const GameSessionProvider = ({ children }) => {
  const { sessions, loading, error, refresh } = useListeners();
  const value = useMemo(
    () => ({
      sessions,
      loading,
      error,
      refresh,
    }),
    [sessions, loading, error, refresh]
  );

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
};

export const useGameSessions = () => useContext(GameSessionContext);

export default GameSessionContext;
