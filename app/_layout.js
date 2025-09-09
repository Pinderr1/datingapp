import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, LogBox, StatusBar } from 'react-native';
import { UserProvider } from '../context/userContext';

LogBox.ignoreAllLogs();

SplashScreen.preventAutoHideAsync();

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
    }
    const subscription = AppState.addEventListener("change", (_) => {
      StatusBar.setBarStyle("light-content");
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
