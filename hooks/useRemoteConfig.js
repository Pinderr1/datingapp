import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { snapshotExists } from '../utils/firestore';

export default function useRemoteConfig() {
  const [config, setConfig] = useState({
    minVersion: null,
    maxFreeGames: null,
    alertMessage: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const ref = doc(db, 'config', 'app');
    const unsub = onSnapshot(
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
        setConfig((prev) => ({ ...prev, loading: false, error: err }));
      }
    );
    return unsub;
  }, []);

  return config;
}
