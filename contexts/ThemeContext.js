import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'datingapp:theme:dark-mode';

const lightTheme = {
  gradient: ['#8B5CF6', '#EC4899'],
  gradientStart: '#8B5CF6',
  gradientEnd: '#EC4899',
  text: '#1F2937',
  textSecondary: '#6B7280',
  card: '#FFFFFF',
  primary: '#8B5CF6',
  accent: '#EC4899',
  headerBackground: 'rgba(255,255,255,0.95)',
};

const darkTheme = {
  gradient: ['#312E81', '#BE123C'],
  gradientStart: '#312E81',
  gradientEnd: '#BE123C',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  card: '#1F2937',
  primary: '#4338CA',
  accent: '#F472B6',
  headerBackground: 'rgba(17,24,39,0.92)',
};

const ThemeContext = createContext({
  darkMode: false,
  theme: lightTheme,
  toggleTheme: () => {},
  setDarkMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!isMounted) return;
        if (value === 'true') {
          setDarkMode(true);
        }
      })
      .finally(() => {
        if (isMounted) {
          setHydrated(true);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const persist = useCallback((value) => {
    AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false').catch(() => {});
  }, []);

  const handleSetDarkMode = useCallback(
    (value) => {
      setDarkMode(value);
      persist(value);
    },
    [persist]
  );

  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      persist(next);
      return next;
    });
  }, [persist]);

  const theme = darkMode ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({
      darkMode,
      theme,
      toggleTheme,
      setDarkMode: handleSetDarkMode,
      hydrated,
    }),
    [darkMode, theme, toggleTheme, handleSetDarkMode, hydrated]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
