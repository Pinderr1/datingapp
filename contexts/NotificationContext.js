import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

let ToastModule;
try {
  // Optional dependency
  // eslint-disable-next-line global-require
  ToastModule = require('react-native-toast-message');
} catch (error) {
  ToastModule = null;
}

const NotificationContext = createContext({
  notifications: [],
  showNotification: () => {},
  dismissNotification: () => {},
  clearNotifications: () => {},
});

let counter = 0;
const createId = () => {
  counter += 1;
  return `notification-${Date.now()}-${counter}`;
};

export const NotificationProvider = ({ children, defaultDuration = 3500 }) => {
  const [notifications, setNotifications] = useState([]);
  const timersRef = useRef(new Map());

  const dismissNotification = useCallback((id) => {
    if (!id) return;
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showNotification = useCallback(
    (message, options = {}) => {
      if (!message) return null;
      const id = options.id ?? createId();
      const duration = options.duration ?? defaultDuration;
      const type = options.type ?? 'default';

      setNotifications((prev) => {
        const filtered = prev.filter((item) => item.id !== id);
        return [...filtered, { id, message, type, createdAt: Date.now() }];
      });

      if (ToastModule?.default?.show) {
        try {
          ToastModule.default.show({
            type: type === 'error' ? 'error' : 'info',
            text1: message,
          });
        } catch (error) {
          console.warn('Failed to show toast notification', error);
        }
      }

      if (Number.isFinite(duration) && duration > 0) {
        const timer = setTimeout(() => {
          dismissNotification(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [defaultDuration, dismissNotification]
  );

  const clearNotifications = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setNotifications([]);
  }, []);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      showNotification,
      dismissNotification,
      clearNotifications,
    }),
    [clearNotifications, dismissNotification, notifications, showNotification]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => useContext(NotificationContext);

export default NotificationContext;
