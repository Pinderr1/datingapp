import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRESETS } from '../data/presets';
import { useUser } from './UserContext';

const STORAGE_KEY = 'pinged_theme_preset';

const PRESET_MAP = PRESETS.reduce((acc, preset) => {
  acc[preset.id] = preset;
  return acc;
}, {});

const BASE_THEME = {
  background: '#09061c',
  card: '#1a1231',
  text: '#ffffff',
  textSecondary: '#cdc4eb',
  headerBackground: '#120a2a',
  primary: '#7c5cff',
  accent: '#7c5cff',
  gradientStart: '#8B5CF6',
  gradientEnd: '#EC4899',
};

const buildTheme = (preset, custom = null) => {
  const source = custom || preset || {};
  const accent = source.accent ?? BASE_THEME.accent;
  const gradientStart = source.gradientStart ?? BASE_THEME.gradientStart;
  const gradientEnd = source.gradientEnd ?? BASE_THEME.gradientEnd;
  return {
    ...BASE_THEME,
    accent,
    gradientStart,
    gradientEnd,
    gradient: [gradientStart, gradientEnd],
  };
};

const ThemeContext = createContext({
  theme: buildTheme(PRESET_MAP.default),
  preset: 'default',
  availablePresets: PRESETS,
  setPreset: () => {},
  setCustomTheme: () => {},
  resetTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const { user } = useUser();
  const [presetId, setPresetId] = useState('default');
  const [customTheme, setCustomTheme] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active || !stored) return;
        if (PRESET_MAP[stored]) {
          setPresetId(stored);
          setCustomTheme(null);
        }
      })
      .finally(() => {
        if (active) {
          setHydrated(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.themePreset || !PRESET_MAP[user.themePreset]) {
      return;
    }
    setPresetId(user.themePreset);
    setCustomTheme(null);
  }, [user?.themePreset]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, presetId).catch(() => {});
  }, [hydrated, presetId]);

  const handleSetPreset = useCallback((id) => {
    if (!id || !PRESET_MAP[id]) {
      return;
    }
    setPresetId(id);
    setCustomTheme(null);
  }, []);

  const handleSetCustomTheme = useCallback((theme) => {
    if (theme && typeof theme === 'object') {
      setCustomTheme(theme);
    } else {
      setCustomTheme(null);
    }
  }, []);

  const resetTheme = useCallback(() => {
    setPresetId('default');
    setCustomTheme(null);
  }, []);

  const preset = PRESET_MAP[presetId] ?? PRESET_MAP.default ?? PRESETS[0] ?? null;
  const theme = useMemo(() => buildTheme(preset, customTheme), [preset, customTheme]);

  const value = useMemo(
    () => ({
      theme,
      preset: preset?.id ?? 'default',
      availablePresets: PRESETS,
      setPreset: handleSetPreset,
      setCustomTheme: handleSetCustomTheme,
      resetTheme,
    }),
    [handleSetCustomTheme, handleSetPreset, preset?.id, resetTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
