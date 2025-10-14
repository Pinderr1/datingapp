import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useUser } from './UserContext';

const ChatContext = createContext({
  matches: [],
  loading: true,
});

const deriveOtherUser = (data, currentUid) => {
  if (!data) return { otherUserId: undefined, displayName: undefined };
  if (data.otherUserId) {
    return { otherUserId: data.otherUserId, displayName: data.displayName || data.otherDisplayName };
  }
  if (Array.isArray(data.users)) {
    const otherUserId = data.users.find((id) => id && id !== currentUid);
    let displayName;
    if (otherUserId) {
      if (Array.isArray(data.userNames)) {
        displayName = data.userNames[data.users.indexOf(otherUserId)];
      } else if (data.names && typeof data.names === 'object') {
        displayName = data.names[otherUserId];
      } else if (data.displayNames && typeof data.displayNames === 'object') {
        displayName = data.displayNames[otherUserId];
      }
    }
    return { otherUserId, displayName };
  }
  return { otherUserId: undefined, displayName: undefined };
};

export const ChatProvider = ({ children }) => {
  const { user } = useUser();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setMatches([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const q = query(collection(db, 'matches'), where('users', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() };
          const derived = deriveOtherUser(data, user.uid);
          return { ...data, ...derived };
        });
        setMatches(rows);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to listen for matches', error);
        setMatches([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user?.uid]);

  const value = useMemo(() => ({ matches, loading }), [matches, loading]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChats = () => useContext(ChatContext);

export default ChatContext;
