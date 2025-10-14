import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useUser } from './UserContext';

export interface MatchSummary {
  id: string;
  otherUserId: string;
  displayName: string;
  image: string | null;
  profile: Record<string, unknown> | null;
  createdAt: unknown;
}

interface ChatContextValue {
  matches: MatchSummary[];
  loading: boolean;
}

const defaultValue: ChatContextValue = {
  matches: [],
  loading: true,
};

const ChatContext = createContext<ChatContextValue>(defaultValue);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const profileCacheRef = useRef(new Map<string, Record<string, unknown> | null>());
  const pendingFetchRef = useRef(new Set<string>());

  useEffect(() => {
    profileCacheRef.current.clear();
    pendingFetchRef.current.clear();
    setMatches([]);

    if (!user?.uid) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    const matchesQuery = query(
      collection(db, 'matches'),
      where('users', 'array-contains', user.uid),
    );

    const unsubscribe = onSnapshot(
      matchesQuery,
      (snapshot) => {
        const entries: MatchSummary[] = snapshot.docs.map((docSnap) => {
          const data = (docSnap.data() ?? {}) as Record<string, unknown>;
          const users = Array.isArray(data.users) ? (data.users as string[]) : [];
          const otherUserId = users.find((id) => id !== user.uid) || user.uid;
          const profiles =
            typeof data.profiles === 'object' && data.profiles !== null
              ? (data.profiles as Record<string, Record<string, unknown>>)
              : {};
          const cachedProfile = profileCacheRef.current.get(otherUserId) ?? null;
          const profile = profiles[otherUserId] || cachedProfile || null;

          if (!profile && otherUserId && !pendingFetchRef.current.has(otherUserId)) {
            pendingFetchRef.current.add(otherUserId);
            getDoc(doc(db, 'users', otherUserId))
              .then((profileSnap) => {
                const fetchedProfile = profileSnap.exists()
                  ? ((profileSnap.data() ?? {}) as Record<string, unknown>)
                  : null;
                profileCacheRef.current.set(otherUserId, fetchedProfile);
                setMatches((prev) =>
                  prev.map((item) =>
                    item.otherUserId === otherUserId
                      ? {
                          ...item,
                          displayName:
                            (fetchedProfile?.name as string) ||
                            (fetchedProfile?.displayName as string) ||
                            item.displayName,
                          image:
                            (fetchedProfile?.photo as string) ||
                            (fetchedProfile?.image as string) ||
                            item.image,
                          profile: fetchedProfile,
                        }
                      : item,
                  ),
                );
              })
              .catch((error) => {
                console.warn('Failed to fetch profile for match', error);
              })
              .finally(() => {
                pendingFetchRef.current.delete(otherUserId);
              });
          }

          return {
            id: docSnap.id,
            otherUserId,
            displayName:
              (profile?.name as string) ||
              (profile?.displayName as string) ||
              'Opponent',
            image: (profile?.photo as string) || (profile?.image as string) || null,
            profile,
            createdAt: data.matchedAt ?? null,
          } satisfies MatchSummary;
        });

        setMatches(entries);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to listen for matches', error);
        setMatches([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  const value = useMemo<ChatContextValue>(
    () => ({
      matches,
      loading,
    }),
    [matches, loading],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChats = () => useContext(ChatContext);

export default ChatContext;
