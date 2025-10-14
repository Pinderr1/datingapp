import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const DevContext = createContext({
  devMode: false,
  toggleDevMode: () => {},
  setDevMode: () => {},
});

export const DevProvider = ({ children, initialValue }) => {
  const [devMode, setDevMode] = useState(
    typeof initialValue === 'boolean' ? initialValue : !!__DEV__
  );

  const toggleDevMode = useCallback(() => {
    setDevMode((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      devMode,
      toggleDevMode,
      setDevMode,
    }),
    [devMode, toggleDevMode]
  );

  return <DevContext.Provider value={value}>{children}</DevContext.Provider>;
};

export const useDev = () => useContext(DevContext);

export default DevContext;
