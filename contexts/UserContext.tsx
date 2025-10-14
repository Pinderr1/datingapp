import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

type UserDocument = (Record<string, unknown> & { uid: string }) | null;
type UserState = UserDocument | undefined;

const hasUid = (
  value: UserState,
): value is Record<string, unknown> & { uid: string } =>
  typeof value === 'object' && value !== null && 'uid' in value;

interface UserContextValue {
  user: UserState;
  profile: UserState;
  setUser: React.Dispatch<React.SetStateAction<UserState>>;
  setProfile: React.Dispatch<React.SetStateAction<UserState>>;
  updateUser: (updates: Record<string, unknown>) => void;
  loading: boolean;
}

const defaultValue: UserContextValue = {
  user: undefined,
  profile: undefined,
  setUser: () => undefined,
  setProfile: () => undefined,
  updateUser: () => undefined,
  loading: true,
};

const UserContext = createContext<UserContextValue>(defaultValue);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserState>();

  useEffect(() => {
    let isMounted = true;
    let pendingUid: string | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (authUser: FirebaseUser | null) => {
      if (!isMounted) {
        return;
      }

      if (!authUser) {
        pendingUid = null;
        setUser(null);
        return;
      }

      const requestedUid = authUser.uid;
      pendingUid = requestedUid;
      setUser((prev: UserState) => (hasUid(prev) && prev.uid === requestedUid ? prev : undefined));

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
          const data = (userDoc.data() ?? {}) as Record<string, unknown>;
          setUser({ uid: requestedUid, ...data });
        } else {
          setUser({ uid: requestedUid });
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
        setUser({ uid: requestedUid });
      }
    });

    return () => {
      isMounted = false;
      pendingUid = null;
      unsubscribe();
    };
  }, []);

  const updateUser = useCallback((updates: Record<string, unknown>) => {
    setUser((prev: UserState) => {
      if (!hasUid(prev)) {
        return prev;
      }
      return { ...prev, ...updates } as UserDocument;
    });
  }, []);

  const contextValue = useMemo<UserContextValue>(
    () => ({
      user,
      profile: user,
      setUser,
      setProfile: setUser,
      updateUser,
      loading: user === undefined,
    }),
    [user, updateUser],
  );

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);

export default UserContext;
