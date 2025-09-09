import { Alert } from 'react-native';

export default async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          message = errorData.message;
        }
      } catch {
        // ignore json parse errors
      }
      Alert.alert('Error', message);
      return null;
    }
    try {
      return await response.json();
    } catch {
      return null;
    }
  } catch (error) {
    const message = error.message || 'Something went wrong';
    Alert.alert('Error', message);
    return null;
  }
}
