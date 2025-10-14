import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type SoundHandler = (...args: unknown[]) => Promise<void> | void;

interface SoundContextValue {
  muted: boolean;
  setMuted: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMuted: () => void;
  play: (name: string, ...args: unknown[]) => Promise<void>;
  registerSound: (name: string, handler: SoundHandler) => () => void;
}

const defaultValue: SoundContextValue = {
  muted: false,
  setMuted: () => undefined,
  toggleMuted: () => undefined,
  play: async () => undefined,
  registerSound: () => () => undefined,
};

const SoundContext = createContext<SoundContextValue>(defaultValue);

export const SoundProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handlersRef = useRef(new Map<string, SoundHandler>([['game_move', async () => {}]]));
  const [muted, setMuted] = useState(false);

  const registerSound = useCallback<SoundContextValue['registerSound']>((name, handler) => {
    handlersRef.current.set(name, handler);
    return () => {
      handlersRef.current.delete(name);
    };
  }, []);

  const play = useCallback(
    async (name: string, ...args: unknown[]) => {
      if (muted) {
        return;
      }
      const handler = handlersRef.current.get(name);
      if (!handler) {
        console.warn(`Attempted to play unregistered sound: ${name}`);
        return;
      }
      try {
        await handler(...args);
      } catch (error) {
        console.error(`Failed to play sound: ${name}`, error);
      }
    },
    [muted],
  );

  const toggleMuted = useCallback(() => {
    setMuted((prev: boolean) => !prev);
  }, []);

  const value = useMemo<SoundContextValue>(
    () => ({
      muted,
      setMuted,
      toggleMuted,
      play,
      registerSound,
    }),
    [muted, play, registerSound, toggleMuted],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
};

export const useSound = () => useContext(SoundContext);

export default SoundContext;
