import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useUser } from './UserContext';

const ListenerContext = createContext({
  sessions: [],
  loading: true,
  error: null,
  refresh: () => {},
});

export const ListenerProvider = ({ children }) => {
  const { firebaseUser } = useUser();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => setRefreshIndex((i) => i + 1), []);

  useEffect(() => {
    let unsubscribe;
    let mounted = true;

    const initListener = async () => {
      const currentUser = auth.currentUser || firebaseUser;
      if (!currentUser?.uid) {
        setSessions([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(db, 'games'),
          where('players', 'array-contains', currentUser.uid),
          orderBy('updatedAt', 'desc')
        );

        unsubscribe = onSnapshot(
          q,
          (snap) => {
            if (!mounted) return;
            const rows = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
            setSessions(rows);
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
      } catch (err) {
        console.error('Failed to initialize game listener:', err);
        setError(err);
        setLoading(false);
      }
    };

    initListener();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseUser?.uid, refreshIndex]);

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
