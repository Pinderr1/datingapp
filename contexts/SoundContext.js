import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

const SoundContext = createContext({
  isMuted: false,
  toggleMute: () => {},
  play: async () => {},
});

const DEFAULT_SOUNDS = {
  game_move: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
};

export const SoundProvider = ({ children }) => {
  const [isMuted, setMuted] = useState(false);
  const registryRef = useRef(new Map());

  const play = useCallback(
    async (name) => {
      if (isMuted) return;
      const custom = registryRef.current.get(name);
      if (custom) {
        try {
          await custom();
          return;
        } catch (e) {
          console.warn(`Failed to play registered sound "${name}"`, e);
        }
      }
      const fallback = DEFAULT_SOUNDS[name];
      if (fallback) {
        await fallback();
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  const registerSound = useCallback((name, loader) => {
    if (!name || typeof loader !== 'function') return () => {};
    registryRef.current.set(name, loader);
    return () => {
      registryRef.current.delete(name);
    };
  }, []);

  const value = useMemo(
    () => ({
      isMuted,
      toggleMute,
      play,
      registerSound,
    }),
    [isMuted, toggleMute, play, registerSound]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
};

export const useSound = () => useContext(SoundContext);

export default SoundContext;
