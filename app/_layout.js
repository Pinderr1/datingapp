import { useFonts } from 'expo-font';
import { StatusBar, setStatusBarStyle } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, LogBox } from 'react-native';
import { UserProvider } from '../context/userContext';
import { ensureAuth } from '../services/authService';

LogBox.ignoreAllLogs();

SplashScreen.preventAutoHideAsync().catch(() => {
  // Prevent the promise rejection from triggering an unhandled warning when
  // the splash screen API is invoked before the native layer is ready.
});

export default function RootLayout() {

  const [loaded] = useFonts({
    Roboto_Light: require("../assets/fonts/Roboto-Light.ttf"),
    Roboto_Regular: require("../assets/fonts/Roboto-Regular.ttf"),
    Roboto_Medium: require("../assets/fonts/Roboto-Medium.ttf"),
    Roboto_Bold: require("../assets/fonts/Roboto-Bold.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      setStatusBarStyle('light');
    }
    ensureAuth();
    const subscription = AppState.addEventListener('change', () => {
      setStatusBarStyle('light');
    });
    return () => {
      subscription.remove();
    };
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <UserProvider>
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
    </UserProvider>
  );
}
