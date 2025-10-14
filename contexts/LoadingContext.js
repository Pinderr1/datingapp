import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const LoadingContext = createContext({
  visible: false,
  show: () => {},
  hide: () => {},
  setVisible: () => {},
});

export const LoadingProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  const value = useMemo(
    () => ({
      visible,
      show,
      hide,
      setVisible,
    }),
    [visible, show, hide]
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

export const useLoading = () => useContext(LoadingContext);

export default LoadingContext;
