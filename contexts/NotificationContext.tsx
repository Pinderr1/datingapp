import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface NotificationItem {
  id: string;
  message: string;
  type: string;
  createdAt: Date;
}

interface ShowNotificationOptions {
  duration?: number;
  type?: string;
  id?: string;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  showNotification: (message: string, options?: ShowNotificationOptions) => string;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
}

const defaultValue: NotificationContextValue = {
  notifications: [],
  showNotification: () => '',
  dismissNotification: () => undefined,
  clearNotifications: () => undefined,
};

const NotificationContext = createContext<NotificationContextValue>(defaultValue);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const timeoutRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    const timeoutId = timeoutRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRef.current.delete(id);
    }
  }, []);

  const showNotification = useCallback<NotificationContextValue['showNotification']>(
    (message, { duration = 4000, type = 'info', id: providedId } = {}) => {
      const id = providedId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setNotifications((prev) => [
        ...prev,
        {
          id,
          message,
          type,
          createdAt: new Date(),
        },
      ]);

      if (duration !== 0) {
        const timeoutId = setTimeout(() => {
          dismissNotification(id);
        }, duration);
        timeoutRef.current.set(id, timeoutId);
      }

      return id;
    },
    [dismissNotification],
  );

  const clearNotifications = useCallback(() => {
    timeoutRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutRef.current.clear();
    setNotifications([]);
  }, []);

  useEffect(
    () => () => {
      timeoutRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutRef.current.clear();
    },
    [],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      showNotification,
      dismissNotification,
      clearNotifications,
    }),
    [notifications, showNotification, dismissNotification, clearNotifications],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => useContext(NotificationContext);

export default NotificationContext;
