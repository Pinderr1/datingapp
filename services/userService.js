import { Alert } from 'react-native';
import { fetchJson } from './api';

export async function fetchUsers() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) {
    Alert.alert('Error', 'EXPO_PUBLIC_API_URL not set');
    return null;
  }

  return await fetchJson(`${baseUrl}/users`);
}

