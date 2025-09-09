import { fetchJson } from './api';

export async function fetchUsers() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL not set');
  }

  return fetchJson(`${baseUrl}/users`);
}

