import { Alert } from 'react-native';

export async function fetchJson(url, options) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const message = `Request failed with status ${response.status}`;
      Alert.alert('Error', message);
      throw new Error(message);
    }
    return await response.json();
  } catch (error) {
    Alert.alert('Error', error.message);
    throw error;
  }
}
