import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { snapshotExists } from '../utils/firestore';

const DEFAULT_CONFIG = {
  minVersion: null,
  maxFreeGames: null,
  alertMessage: null,
};

export default function useRemoteConfig() {
  const [config, setConfig] = useState({
    ...DEFAULT_CONFIG,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const ref = doc(db, 'config', 'app');
    let unsubscribeConfig = null;
    let authReady = false;

    const stopConfigListener = () => {
      if (typeof unsubscribeConfig === 'function') {
        unsubscribeConfig();
        unsubscribeConfig = null;
      }
    };

    const startConfigListener = () => {
      if (unsubscribeConfig) return;
      setConfig((prev) => ({ ...prev, loading: true }));

      unsubscribeConfig = onSnapshot(
        ref,
        (docSnap) => {
          const data = snapshotExists(docSnap) ? docSnap.data() : {};
          setConfig({
            minVersion: data?.minVersion ?? null,
            maxFreeGames: data?.maxFreeGames ?? null,
            alertMessage: data?.alertMessage ?? null,
            loading: false,
            error: null,
          });
        },
        (err) => {
          console.warn('Failed to load remote config', err);

          if (err?.code === 'permission-denied') {
            setConfig({ ...DEFAULT_CONFIG, loading: false, error: null });
            stopConfigListener();
            return;
          }

          setConfig((prev) => ({ ...prev, loading: false, error: err }));
        }
      );
    };

    const handleAuthChange = (user) => {
      authReady = true;
      if (user) {
        startConfigListener();
      } else {
        stopConfigListener();
        setConfig({ ...DEFAULT_CONFIG, loading: false, error: null });
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, handleAuthChange);

    // Wait until we’ve heard at least one auth event before subscribing
    const authTimeout = setTimeout(() => {
      if (!authReady && auth.currentUser) startConfigListener();
    }, 1000);

    return () => {
      clearTimeout(authTimeout);
      stopConfigListener();
      unsubscribeAuth();
    };
  }, []);

  return config;
}
