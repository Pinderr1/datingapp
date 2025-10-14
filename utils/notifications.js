import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

let cachedToken = null;
let registrationPromise = null;

export async function registerForPushNotificationsAsync({ forceRefresh = false } = {}) {
  if (!forceRefresh && cachedToken) {
    return cachedToken;
  }

  if (!forceRefresh && registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = (async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return null;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId ??
        Constants.manifest?.extra?.eas?.projectId;

      const tokenResponse = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();

      const token = tokenResponse?.data ?? null;
      cachedToken = token;
      return token;
    } catch (error) {
      console.warn('Error registering for push notifications', error);
      return null;
    } finally {
      registrationPromise = null;
    }
  })();

  const token = await registrationPromise;

  if (!token) {
    cachedToken = null;
  }

  return token;
}
