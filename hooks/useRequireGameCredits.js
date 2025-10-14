import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useUser } from '../contexts/UserContext';
import { useGameLimit } from '../contexts/GameLimitContext';
import { useDev } from '../contexts/DevContext';

export default function useRequireGameCredits() {
  const router = useRouter();
  const { user } = useUser();
  const { gamesLeft } = useGameLimit();
  const { devMode } = useDev();

  const isPremiumUser = !!user?.isPremium;

  const requireCredits = useCallback(
    (opts = {}) => {
      if (!isPremiumUser && gamesLeft <= 0 && !devMode) {
        const action = opts.replace ? router.replace : router.push;
        action({ pathname: '/premium/premiumScreen', params: { context: 'paywall' } });
        return false;
      }
      return true;
    },
    [isPremiumUser, gamesLeft, devMode, router]
  );

  return requireCredits;
}
