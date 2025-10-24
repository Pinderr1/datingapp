import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useUser } from './UserContext';

const ChatContext = createContext({
  matches: [],
  loading: true,
});

const deriveOtherUser = (data, currentUid) => {
  if (!data) return { otherUserId: undefined };
  if (data.otherUserId) return { otherUserId: data.otherUserId };

  if (Array.isArray(data.users)) {
    const otherUserId = data.users.find((id) => id && id !== currentUid);
    return { otherUserId };
  }
  return { otherUserId: undefined };
};

export const ChatProvider = ({ children }) => {
  const { user } = useUser();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const userCacheRef = useRef({});

  useEffect(() => {
    userCacheRef.current = {};
  }, [user?.uid]);

  useEffect(() => {
    let unsubscribe;
    let mounted = true;

    const initListener = async () => {
      const currentUser = auth.currentUser || user;
      if (!currentUser?.uid) {
        setMatches([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const q = query(
          collection(db, 'matches'),
          where('users', 'array-contains', currentUser.uid),
          orderBy('updatedAt', 'desc'),
          limit(50)
        );

        unsubscribe = onSnapshot(
          q,
          async (snap) => {
            if (!mounted) return;
            const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

            // resolve opponent data
            const hydrated = await Promise.all(
              docs.map(async (m) => {
                const { otherUserId } = deriveOtherUser(m, currentUser.uid);
                if (!otherUserId) return m;

                let cached = userCacheRef.current[otherUserId];
                if (cached === undefined) {
                  try {
                    const ref = doc(db, 'users', otherUserId);
                    const userSnap = await getDoc(ref);
                    if (userSnap.exists()) {
                      cached = userSnap.data();
                      userCacheRef.current[otherUserId] = cached;
                    } else {
                      cached = null;
                      userCacheRef.current[otherUserId] = null;
                    }
                  } catch (err) {
                    console.warn('Failed to hydrate opponent profile', otherUserId, err);
                    cached = null;
                    userCacheRef.current[otherUserId] = null;
                  }
                }

                if (cached) {
                  return {
                    ...m,
                    otherUserId,
                    displayName:
                      cached.displayName ||
                      cached.name ||
                      cached.fullName ||
                      'Player',
                    photoURL: cached.photoURL || cached.image || null,
                  };
                }
                return { ...m, otherUserId };
              })
            );

            if (mounted) {
              setMatches(hydrated);
              setLoading(false);
            }
          },
          (error) => {
            console.error('Failed to listen for matches:', error?.message);
            setMatches([]);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Chat listener setup failed:', err);
        setLoading(false);
      }
    };

    initListener();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid]);

  const value = useMemo(() => ({ matches, loading }), [matches, loading]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChats = () => useContext(ChatContext);
export default ChatContext;
