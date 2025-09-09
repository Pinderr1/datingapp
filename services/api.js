import { Alert } from 'react-native';

// TODO: Add auth headers and token refresh logic once authentication is implemented.
export async function fetchJson(path, options) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) {
    Alert.alert('Error', 'EXPO_PUBLIC_API_URL not set');
    return null;
  }

  const url = `${baseUrl}${path}`;

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const message = `Request failed with status ${response.status}`;
      Alert.alert('Error', message);
      return null;
    }
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Alert.alert('Error', message);
    return null;
  }
}
