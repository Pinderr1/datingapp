import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

interface Theme {
  mode: ThemeMode;
  background: string;
  headerBackground: string;
  card: string;
  text: string;
  textSecondary: string;
  primary: string;
  accent: string;
  gradientStart: string;
  gradientEnd: string;
  gradient: [string, string];
}

interface ThemeContextValue {
  theme: Theme;
  darkMode: boolean;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'app.theme.preferred-scheme';

const baseLightTheme: Omit<Theme, 'gradient'> = {
  mode: 'light',
  background: '#f4f6fb',
  headerBackground: 'rgba(255,255,255,0.95)',
  card: 'rgba(255,255,255,0.95)',
  text: '#111827',
  textSecondary: '#4b5563',
  primary: '#ff5a85',
  accent: '#ff5a85',
  gradientStart: '#ff5a85',
  gradientEnd: '#6b47ff',
};

const baseDarkTheme: Omit<Theme, 'gradient'> = {
  mode: 'dark',
  background: '#0f172a',
  headerBackground: 'rgba(15,23,42,0.95)',
  card: 'rgba(30,41,59,0.95)',
  text: '#f8fafc',
  textSecondary: '#cbd5f5',
  primary: '#9b5cff',
  accent: '#9b5cff',
  gradientStart: '#6b47ff',
  gradientEnd: '#111827',
};

const augmentTheme = (theme: Omit<Theme, 'gradient'>): Theme => ({
  ...theme,
  gradient: [theme.gradientStart, theme.gradientEnd],
});

const defaultValue: ThemeContextValue = {
  theme: augmentTheme(baseLightTheme),
  darkMode: false,
  toggleTheme: () => undefined,
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemScheme = Appearance.getColorScheme();
  const [darkMode, setDarkMode] = useState<boolean>(systemScheme === 'dark');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored: string | null) => {
        if (!stored || cancelled) {
          return;
        }
        setDarkMode(stored === 'dark');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setInitialized(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialized) {
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, darkMode ? 'dark' : 'light').catch(() => {});
  }, [darkMode, initialized]);

  const toggleTheme = useCallback(() => {
    setDarkMode((prev: boolean) => !prev);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: augmentTheme(darkMode ? baseDarkTheme : baseLightTheme),
      darkMode,
      toggleTheme,
    }),
    [darkMode, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
