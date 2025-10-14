import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { subscribeToMyMatches } from '../services/matchService';
import { useUser } from './UserContext';

const ChatContext = createContext({
  matches: [],
  loading: false,
  addMatch: () => {},
  updateMatch: () => {},
  removeMatch: () => {},
});

const normaliseMatch = (raw, currentUid, previous = null) => {
  if (!raw) {
    return previous ?? null;
  }

  const base = typeof raw === 'object' ? { ...raw } : {};
  const id = base.id ?? base.matchId ?? previous?.id ?? null;
  const players = Array.isArray(base.users)
    ? base.users
    : Array.isArray(previous?.users)
    ? previous.users
    : [];
  const otherUserId =
    base.otherUserId ??
    (players.find((uid) => uid && uid !== currentUid) ?? previous?.otherUserId ?? null);

  const profiles = base.profiles && typeof base.profiles === 'object' ? base.profiles : {};
  const otherProfile = otherUserId ? profiles[otherUserId] ?? null : null;

  const displayName =
    base.displayName ??
    base.otherUserName ??
    otherProfile?.displayName ??
    otherProfile?.name ??
    previous?.displayName ??
    'Opponent';

  const image =
    base.image ??
    base.photoURL ??
    otherProfile?.photoURL ??
    otherProfile?.image ??
    previous?.image ??
    null;

  return {
    id,
    ...base,
    users: players,
    otherUserId,
    displayName,
    image,
  };
};

export const ChatProvider = ({ children }) => {
  const { user } = useUser();
  const uid = user?.uid;
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid) {
      setMatches([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    const unsubscribe = subscribeToMyMatches((rows) => {
      setMatches((prev) => {
        const existing = new Map(prev.map((item) => [item.id, item]));
        const next = rows.map((row) => normaliseMatch(row, uid, existing.get(row.id)));
        return next;
      });
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [uid]);

  const addMatch = useCallback(
    (match) => {
      if (!match) return;
      setMatches((prev) => {
        const normalised = normaliseMatch(match, uid);
        if (!normalised?.id) {
          return prev;
        }
        const without = prev.filter((item) => item.id !== normalised.id);
        return [normalised, ...without];
      });
    },
    [uid]
  );

  const updateMatch = useCallback((matchId, updates) => {
    if (!matchId || !updates) return;
    setMatches((prev) =>
      prev.map((item) =>
        item.id === matchId ? { ...item, ...updates, id: matchId } : item
      )
    );
  }, []);

  const removeMatch = useCallback((matchId) => {
    if (!matchId) return;
    setMatches((prev) => prev.filter((item) => item.id !== matchId));
  }, []);

  const value = useMemo(
    () => ({
      matches,
      loading,
      addMatch,
      updateMatch,
      removeMatch,
    }),
    [addMatch, loading, matches, removeMatch, updateMatch]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChats = () => useContext(ChatContext);

export default ChatContext;
