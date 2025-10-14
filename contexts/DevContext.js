import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'pinged_dev_mode';

const DevContext = createContext({
  devMode: false,
  setDevMode: () => {},
  toggleDevMode: () => {},
});

const parseEnvBoolean = (value) => {
  if (value == null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return undefined;
};

export const DevProvider = ({ children, initialDevMode }) => {
  const envDefault = parseEnvBoolean(process.env.EXPO_PUBLIC_DEV_MODE);
  const fallback =
    typeof initialDevMode === 'boolean'
      ? initialDevMode
      : envDefault !== undefined
      ? envDefault
      : __DEV__;

  const [devMode, setDevModeState] = useState(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active || stored == null) return;
        setDevModeState(stored === '1' || stored === 'true');
      })
      .finally(() => {
        if (active) setHydrated(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, devMode ? '1' : '0').catch(() => {});
  }, [devMode, hydrated]);

  const setDevMode = useCallback((value) => {
    setDevModeState(Boolean(value));
  }, []);

  const toggleDevMode = useCallback(() => {
    setDevModeState((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      devMode,
      setDevMode,
      toggleDevMode,
    }),
    [devMode, setDevMode, toggleDevMode]
  );

  return <DevContext.Provider value={value}>{children}</DevContext.Provider>;
};

export const useDev = () => useContext(DevContext);

export default DevContext;
