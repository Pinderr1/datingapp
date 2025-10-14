import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface LoadingContextValue {
  visible: boolean;
  message: string | null;
  show: (message?: string | null) => void;
  hide: () => void;
}

const defaultValue: LoadingContextValue = {
  visible: false,
  message: null,
  show: () => undefined,
  hide: () => undefined,
};

const LoadingContext = createContext<LoadingContextValue>(defaultValue);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{ visible: boolean; message: string | null }>({
    visible: false,
    message: null,
  });

  const show = useCallback<LoadingContextValue['show']>((message = null) => {
    setState({ visible: true, message });
  }, []);

  const hide = useCallback(() => {
    setState({ visible: false, message: null });
  }, []);

  const value = useMemo<LoadingContextValue>(
    () => ({
      visible: state.visible,
      message: state.message,
      show,
      hide,
    }),
    [state.visible, state.message, show, hide],
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

export const useLoading = () => useContext(LoadingContext);

export default LoadingContext;
