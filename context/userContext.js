import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export const UserContext = createContext(null);
export default UserContext;

export const UserProvider = ({ children }) => {
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    let isMounted = true;
    let pendingUid = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) {
        return;
      }

      if (user) {
        const requestedUid = user.uid;
        pendingUid = requestedUid;
        setProfile(undefined);

        try {
          const userDoc = await getDoc(doc(db, 'users', requestedUid));

          if (!isMounted) {
            return;
          }

          const currentUid = auth.currentUser?.uid;
          if (!currentUid || currentUid !== requestedUid || pendingUid !== requestedUid) {
            return;
          }

          if (userDoc.exists()) {
            setProfile(userDoc.data());
          } else {
            setProfile(null);
          }
        } catch (error) {
          if (!isMounted) {
            return;
          }

          const currentUid = auth.currentUser?.uid;
          if (!currentUid || currentUid !== requestedUid || pendingUid !== requestedUid) {
            return;
          }

          console.error('Error fetching user profile:', error);
          setProfile(null);
        }
      } else {
        pendingUid = null;
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      pendingUid = null;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ profile, setProfile }), [profile]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
