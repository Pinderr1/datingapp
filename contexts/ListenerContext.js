import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useUser } from './UserContext';

const ListenerContext = createContext({
  sessions: [],
  sessionsLoading: false,
});

export const ListenerProvider = ({ children }) => {
  const { user } = useUser();
  const uid = user?.uid;
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    if (!uid) {
      setSessions([]);
      setSessionsLoading(false);
      return undefined;
    }

    setSessionsLoading(true);
    const sessionsQuery = query(
      collection(db, 'gameSessions'),
      where('players', 'array-contains', uid)
    );

    const unsubscribe = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        const nextSessions = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
          .sort((a, b) => {
            const aTime = a.updatedAt?.toDate?.() || a.updatedAt || a.createdAt?.toDate?.() || a.createdAt || 0;
            const bTime = b.updatedAt?.toDate?.() || b.updatedAt || b.createdAt?.toDate?.() || b.createdAt || 0;
            return bTime - aTime;
          });
        setSessions(nextSessions);
        setSessionsLoading(false);
      },
      (error) => {
        console.error('Failed to listen for game sessions', error);
        setSessions([]);
        setSessionsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [uid]);

  const value = useMemo(
    () => ({
      sessions,
      sessionsLoading,
    }),
    [sessions, sessionsLoading]
  );

  return <ListenerContext.Provider value={value}>{children}</ListenerContext.Provider>;
};

export const useListeners = () => useContext(ListenerContext);

export default ListenerContext;
