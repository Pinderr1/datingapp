import { Alert } from 'react-native';
import { auth } from '../firebaseConfig';

export async function fetchJson(path, options = {}) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) {
    Alert.alert('Error', 'EXPO_PUBLIC_API_URL not set');
    return null;
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

  if (!auth.currentUser) {
    Alert.alert('Authentication Error', 'Please sign in again.');
    return null;
  }

  let token;
  try {
    token = await auth.currentUser.getIdToken();
  } catch (error) {
    try {
      token = await auth.currentUser.getIdToken(true);
    } catch {
      Alert.alert('Authentication Error', 'Please sign in again.');
      return null;
    }
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };
  if (options.body && !Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const message = `Request failed with status ${response.status}`;
      Alert.alert('Error', message);
      return null;
    }
    // Parse response body and tolerate empty payloads
    const text = await response.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Alert.alert('Error', message);
    return null;
  }
}
