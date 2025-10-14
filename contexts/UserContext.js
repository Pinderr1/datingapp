import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const UserContext = createContext({
  user: null,
  profile: null,
  authUser: null,
  loading: true,
  setProfile: () => {},
  updateUser: () => {},
  refreshProfile: async () => undefined,
});

const withUid = (value, fallbackUid) => {
  if (!value) return value;
  if (typeof value !== 'object') return value;
  const uid = value.uid ?? fallbackUid ?? null;
  return uid ? { ...value, uid } : { ...value };
};

export const UserProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid) => {
    if (!uid) return null;
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      return { uid };
    }
    const data = snap.data() || {};
    return { uid, ...data };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (next) => {
      setAuthUser(next);

      if (!next) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
      }

      try {
        const profile = await fetchProfile(next.uid);
        if (!cancelled) {
          setUser(profile);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load user profile', error);
          setUser((prev) => prev ?? { uid: next.uid });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [fetchProfile]);

  const setProfile = useCallback(
    (value) => {
      setUser((prev) => {
        if (value == null) {
          return null;
        }
        const fallbackUid = value?.uid ?? prev?.uid ?? auth.currentUser?.uid ?? authUser?.uid ?? null;
        return withUid(value, fallbackUid);
      });
    },
    [authUser?.uid]
  );

  const updateUser = useCallback(
    (patch) => {
      if (!patch || typeof patch !== 'object') {
        return;
      }
      setUser((prev) => {
        const fallbackUid =
          patch.uid ?? prev?.uid ?? auth.currentUser?.uid ?? authUser?.uid ?? null;
        return withUid({ ...(prev || {}), ...patch }, fallbackUid);
      });
    },
    [authUser?.uid]
  );

  const refreshProfile = useCallback(async () => {
    const uid = auth.currentUser?.uid ?? authUser?.uid ?? user?.uid;
    if (!uid) {
      return null;
    }
    setLoading(true);
    try {
      const profile = await fetchProfile(uid);
      setUser(profile);
      return profile;
    } catch (error) {
      console.error('Failed to refresh user profile', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [authUser?.uid, fetchProfile, user?.uid]);

  const value = useMemo(
    () => ({
      user,
      profile: user,
      authUser,
      loading,
      setProfile,
      updateUser,
      refreshProfile,
    }),
    [authUser, loading, setProfile, updateUser, refreshProfile, user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);

export default UserContext;
