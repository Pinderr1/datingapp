import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useUser } from './UserContext';

const ListenerContext = createContext({
  sessions: [],
  loading: true,
  error: null,
  refresh: () => {},
});

export const ListenerProvider = ({ children }) => {
  const { user } = useUser();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => {
    setRefreshIndex((i) => i + 1);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setSessions([]);
      setLoading(false);
      setError(null);
      return undefined;
    }
    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'games'),
      where('players', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSessions(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoading(false);
      },
      (err) => {
        const message = typeof err?.message === 'string' ? err.message.toLowerCase() : '';
        const isPermissionError =
          err?.code === 'permission-denied' ||
          message.includes('missing or insufficient permissions');

        if (isPermissionError) {
          console.warn('Insufficient permissions to load game sessions', err);
          setSessions([]);
          setLoading(false);
          return;
        }

        console.error('Failed to load game sessions', err);
        setError(err);
        setSessions([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, refreshIndex]);

  const value = useMemo(
    () => ({
      sessions,
      loading,
      error,
      refresh,
    }),
    [sessions, loading, error, refresh]
  );

  return <ListenerContext.Provider value={value}>{children}</ListenerContext.Provider>;
};

export const useListeners = () => useContext(ListenerContext);

export default ListenerContext;
