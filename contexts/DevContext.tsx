import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const resolveInitialDevMode = (): boolean => {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_DEV_MODE != null) {
    return process.env.EXPO_PUBLIC_DEV_MODE === 'true';
  }
  if (typeof __DEV__ !== 'undefined') {
    return Boolean(__DEV__);
  }
  return false;
};

interface DevContextValue {
  devMode: boolean;
  setDevMode: React.Dispatch<React.SetStateAction<boolean>>;
  toggleDevMode: () => void;
}

const defaultValue: DevContextValue = {
  devMode: resolveInitialDevMode(),
  setDevMode: () => undefined,
  toggleDevMode: () => undefined,
};

const DevContext = createContext<DevContextValue>(defaultValue);

export const DevProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [devMode, setDevMode] = useState(resolveInitialDevMode);

  const toggleDevMode = useCallback(() => {
    setDevMode((prev) => !prev);
  }, []);

  const value = useMemo<DevContextValue>(
    () => ({
      devMode,
      setDevMode,
      toggleDevMode,
    }),
    [devMode, toggleDevMode],
  );

  return <DevContext.Provider value={value}>{children}</DevContext.Provider>;
};

export const useDev = () => useContext(DevContext);

export default DevContext;
