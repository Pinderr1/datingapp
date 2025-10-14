import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const STORAGE_KEY = 'pinged_sound_muted';

const SOUND_EFFECTS = {
  match: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  game_move: () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
};

const SoundContext = createContext({
  muted: false,
  toggleMuted: () => {},
  setMuted: () => {},
  play: () => {},
});

export const SoundProvider = ({ children }) => {
  const [muted, setMuted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active || stored == null) return;
        setMuted(stored === '1' || stored === 'true');
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
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, muted ? '1' : '0').catch(() => {});
  }, [hydrated, muted]);

  const toggleMuted = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  const handleSetMuted = useCallback((value) => {
    setMuted(Boolean(value));
  }, []);

  const play = useCallback(
    (name) => {
      if (muted) {
        return;
      }
      const effect = SOUND_EFFECTS[name];
      if (typeof effect === 'function') {
        effect();
      }
    },
    [muted]
  );

  const value = useMemo(
    () => ({
      muted,
      toggleMuted,
      setMuted: handleSetMuted,
      play,
    }),
    [handleSetMuted, muted, play, toggleMuted]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
};

export const useSound = () => useContext(SoundContext);

export default SoundContext;
