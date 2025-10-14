import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const NotificationContext = createContext({
  notifications: [],
  showNotification: () => {},
  hideNotification: () => {},
});

let counter = 0;

export const NotificationProvider = ({ children, defaultDuration = 4000 }) => {
  const [notifications, setNotifications] = useState([]);
  const timers = useRef(new Map());

  const hideNotification = useCallback((id) => {
    setNotifications((items) => items.filter((item) => item.id !== id));
    const timeout = timers.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timers.current.delete(id);
    }
  }, []);

  const showNotification = useCallback(
    (message, options = {}) => {
      if (!message) return null;
      const id = options.id ?? `notif-${Date.now()}-${counter++}`;
      const duration =
        typeof options.duration === 'number' ? options.duration : defaultDuration;
      setNotifications((items) => [
        ...items,
        {
          id,
          message,
          type: options.type || 'default',
          createdAt: Date.now(),
        },
      ]);
      if (duration > 0) {
        const timeout = setTimeout(() => hideNotification(id), duration);
        timers.current.set(id, timeout);
      }
      return id;
    },
    [defaultDuration, hideNotification]
  );

  const value = useMemo(
    () => ({
      notifications,
      showNotification,
      hideNotification,
    }),
    [notifications, showNotification, hideNotification]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => useContext(NotificationContext);

export default NotificationContext;
