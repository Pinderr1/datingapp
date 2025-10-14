import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

  const fetchProfile = useCallback(async (uid) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { uid, ...userDoc.data() };
    }
    return { uid };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setProfile(undefined);
      } else {
        setProfile(null);
      }
      setFirebaseUser(authUser);
    });
    return unsubscribe;
  }, []);

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
        setProfile(data);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('Error fetching user profile:', error);
        setProfile({ uid });
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [firebaseUser?.uid, fetchProfile, refreshIndex]);

  const refreshUser = useCallback(() => {
    setRefreshIndex((index) => index + 1);
  }, []);

  const updateUser = useCallback((updates) => {
    setProfile((prev) => {
      if (!prev) {
        return updates;
      }
      return { ...prev, ...updates };
    });
  }, []);

  const value = useMemo(
    () => ({
      user: profile,
      profile,
      loading,
      setProfile,
      updateUser,
      refreshUser,
      firebaseUser,
      isAuthenticated: !!firebaseUser,
    }),
    [profile, loading, updateUser, refreshUser, firebaseUser]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);

export default UserContext;
