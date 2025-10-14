import { useFonts } from 'expo-font';
import { StatusBar, setStatusBarStyle } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState, LogBox } from 'react-native';
import { UserProvider } from '../contexts/UserContext';
import { DevProvider } from '../contexts/DevContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { SoundProvider } from '../contexts/SoundContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { LoadingProvider } from '../contexts/LoadingContext';
import { ListenerProvider } from '../contexts/ListenerContext';
import { GameSessionProvider } from '../contexts/GameSessionContext';
import { ChatProvider } from '../contexts/ChatContext';
import { GameLimitProvider } from '../contexts/GameLimitContext';
import LoadingOverlay from '../components/LoadingOverlay';

LogBox.ignoreAllLogs();

SplashScreen.preventAutoHideAsync().catch(() => {
  // Prevent the promise rejection from triggering an unhandled warning when
  // the splash screen API is invoked before the native layer is ready.
});

const Providers = ({ children }) => (
  <UserProvider>
    <DevProvider>
      <ThemeProvider>
        <SoundProvider>
          <NotificationProvider>
            <LoadingProvider>
              <ListenerProvider>
                <GameSessionProvider>
                  <ChatProvider>
                    <GameLimitProvider>
                      <>
                        {children}
                        <LoadingOverlay />
                      </>
                    </GameLimitProvider>
                  </ChatProvider>
                </GameSessionProvider>
              </ListenerProvider>
            </LoadingProvider>
          </NotificationProvider>
        </SoundProvider>
      </ThemeProvider>
    </DevProvider>
  </UserProvider>
);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Roboto_Light: require('../assets/fonts/Roboto-Light.ttf'),
    Roboto_Regular: require('../assets/fonts/Roboto-Regular.ttf'),
    Roboto_Medium: require('../assets/fonts/Roboto-Medium.ttf'),
    Roboto_Bold: require('../assets/fonts/Roboto-Bold.ttf'),
  });
  const [fontLoadTimedOut, setFontLoadTimedOut] = useState(false);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      setStatusBarStyle('light');
    }

    if (error) {
      console.error('Failed to load custom fonts. Falling back to system defaults.', error);
      SplashScreen.hideAsync();
      setStatusBarStyle('light');
    }

    const subscription = AppState.addEventListener('change', () => {
      setStatusBarStyle('light');
    });
    return () => {
      subscription.remove();
    };
  }, [loaded, error]);

  useEffect(() => {
    if (loaded || error) {
      return;
    }

    let isActive = true;

    const timeoutId = setTimeout(() => {
      if (isActive) {
        console.warn('Font loading timed out. Hiding splash screen and rendering fallback UI.');
        setFontLoadTimedOut(true);
      }
    }, 5000);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [loaded, error]);

  useEffect(() => {
    if (fontLoadTimedOut && !loaded) {
      SplashScreen.hideAsync();
      setStatusBarStyle('light');
    }
  }, [fontLoadTimedOut, loaded]);

  if (!loaded && !error && !fontLoadTimedOut) {
    return null;
  }

  return (
    <Providers>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/loginScreen" options={{ gestureEnabled: false }} />
        <Stack.Screen name="auth/registerScreen" />
        <Stack.Screen name="auth/verificationScreen" />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="filter/filterScreen" />
        <Stack.Screen name="searchResults/searchResultsScreen" />
        <Stack.Screen name="profileDetail/profileDetailScreen" />
        <Stack.Screen name="message/messageScreen" />
        <Stack.Screen name="editProfile/editProfileScreen" />
        <Stack.Screen name="premium/premiumScreen" />
        <Stack.Screen name="paymentMethod/paymentMethodScreen" />
        <Stack.Screen name="paymentDone/paymentDoneScreen" options={{ gestureEnabled: false }} />
        <Stack.Screen name="settings/settingsScreen" />
        <Stack.Screen name="profileViews/profileViewsScreen" />
        <Stack.Screen name="notifications/notificationsScreen" />
        <Stack.Screen name="contactUs/contactUsScreen" />
        <Stack.Screen name="termsAndCondition/termsAndConditionScreen" />
      </Stack>
    </Providers>
  );
}
