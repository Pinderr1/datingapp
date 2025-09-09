import { Alert } from 'react-native';

export async function fetchJson(url, options) {
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
