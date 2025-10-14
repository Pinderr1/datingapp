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
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const UserContext = createContext({
  user: undefined,
  profile: undefined,
  loading: true,
  setProfile: () => {},
  updateUser: () => {},
  refreshUser: () => {},
  firebaseUser: null,
  isAuthenticated: false,
});

export const UserProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const lastKnownUidRef = useRef(null);

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
      const nextUid = authUser?.uid ?? null;
      const lastUid = lastKnownUidRef.current;

      if (authUser) {
        if (nextUid !== lastUid) {
          setProfile(undefined);
        } else {
          setRefreshIndex((index) => index + 1);
        }
        lastKnownUidRef.current = nextUid;
      }
      setFirebaseUser(authUser);
      if (!authUser) {
        setProfileWithUid(null);
        lastKnownUidRef.current = null;
      }
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

  const value = useMemo(
    () => ({
      user: profile,
      profile,
      loading,
      setProfile: setProfileWithUid,
      updateUser,
      refreshUser,
      firebaseUser,
      isAuthenticated: !!firebaseUser,
    }),
    [profile, loading, updateUser, refreshUser, firebaseUser, setProfileWithUid]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);

export default UserContext;
