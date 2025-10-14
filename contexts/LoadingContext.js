import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const LoadingContext = createContext({
  visible: false,
  show: () => {},
  hide: () => {},
  setLoading: () => {},
  withLoading: async () => undefined,
});

export const LoadingProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  const setLoading = useCallback((value) => setVisible(Boolean(value)), []);

  const withLoading = useCallback(
    async (operation) => {
      if (typeof operation !== 'function') {
        return undefined;
      }
      show();
      try {
        const result = await operation();
        return result;
      } finally {
        hide();
      }
    },
    [hide, show]
  );

  const value = useMemo(
    () => ({
      visible,
      show,
      hide,
      setLoading,
      withLoading,
    }),
    [hide, setLoading, show, visible, withLoading]
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

export const useLoading = () => useContext(LoadingContext);

export default LoadingContext;
