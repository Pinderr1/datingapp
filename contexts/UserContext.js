import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, increment, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const DEFAULT_GAME_XP = 10;

const UserContext = createContext({
  user: undefined,
  profile: undefined,
  loading: true,
  setProfile: () => {},
  updateUser: () => {},
  refreshUser: () => {},
  addGameXP: async () => undefined,
  firebaseUser: null,
  isAuthenticated: false,
});

export const UserProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const previousUidRef = useRef(firebaseUser?.uid ?? null);

  const setProfileWithUid = useCallback(
    (nextProfile) => {
      setProfile((previousProfile) => {
        const resolvedNext =
          typeof nextProfile === 'function'
            ? nextProfile(previousProfile)
            : nextProfile;

        if (resolvedNext === null || resolvedNext === undefined) {
          return resolvedNext;
        }

        const previousData =
          previousProfile && typeof previousProfile === 'object'
            ? previousProfile
            : {};
        const nextData =
          resolvedNext && typeof resolvedNext === 'object' ? resolvedNext : {};

        const mergedProfile = { ...previousData, ...nextData };
        const uid =
          mergedProfile.uid ?? previousData.uid ?? firebaseUser?.uid ?? undefined;

        if (uid) {
          mergedProfile.uid = uid;
        }

        return mergedProfile;
      });
    },
    [firebaseUser?.uid]
  );

  const fetchProfile = useCallback(async (uid) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { uid, ...userDoc.data() };
    }
    return { uid };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      const previousUid = previousUidRef.current;
      const nextUid = authUser?.uid ?? null;

      if (!authUser) {
        setProfileWithUid(null);
      } else if (previousUid !== nextUid) {
        setProfile(undefined);
      } else if (nextUid !== null) {
        setRefreshIndex((index) => index + 1);
      }

      previousUidRef.current = nextUid;
      setFirebaseUser(authUser);
    });
    return unsubscribe;
  }, [setProfileWithUid, setRefreshIndex]);

  useEffect(() => {
    let isActive = true;
    const uid = firebaseUser?.uid;
    if (!uid) {
      setLoading(false);
      return () => {
        isActive = false;
      };
    }
    setLoading(true);
    fetchProfile(uid)
      .then((data) => {
        if (!isActive) return;
        setProfileWithUid(data);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('Error fetching user profile:', error);
        setProfileWithUid({ uid });
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [firebaseUser?.uid, fetchProfile, refreshIndex, setProfileWithUid]);

  const refreshUser = useCallback(() => {
    setRefreshIndex((index) => index + 1);
  }, []);

  const updateUser = useCallback((updates) => {
    setProfileWithUid((prev) => {
      if (!prev) {
        return updates;
      }
      return { ...prev, ...updates };
    });
  }, [setProfileWithUid]);

  const addGameXP = useCallback(
    async (xpAward = DEFAULT_GAME_XP) => {
      const uid = firebaseUser?.uid ?? profile?.uid;
      if (!uid) {
        return profile ?? null;
      }

      const amount =
        typeof xpAward === 'number' && Number.isFinite(xpAward)
          ? Math.max(0, xpAward)
          : DEFAULT_GAME_XP;

      if (amount === 0) {
        return profile ?? null;
      }

      const userRef = doc(db, 'users', uid);

      try {
        await updateDoc(userRef, { xp: increment(amount) });
      } catch (error) {
        if (error?.code === 'not-found') {
          await setDoc(userRef, { xp: amount }, { merge: true });
        } else {
          console.warn('Failed to award game XP', error);
          throw error;
        }
      }

      const refreshedProfile = await fetchProfile(uid);
      setProfileWithUid(refreshedProfile);
      return refreshedProfile;
    },
    [firebaseUser?.uid, profile, fetchProfile, setProfileWithUid]
  );

  const value = useMemo(
    () => ({
      user: profile,
      profile,
      loading,
      setProfile: setProfileWithUid,
      updateUser,
      refreshUser,
      addGameXP,
      firebaseUser,
      isAuthenticated: !!firebaseUser,
    }),
    [
      profile,
      loading,
      updateUser,
      refreshUser,
      addGameXP,
      firebaseUser,
      setProfileWithUid,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);

export default UserContext;
