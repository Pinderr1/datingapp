import { Alert } from 'react-native';

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(payload)
        : Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function getIdToken() {
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      return null;
    }

    let token = await user.getIdToken();
    const data = decodeJwt(token);
    if (data?.exp && data.exp * 1000 <= Date.now()) {
      token = await user.getIdToken(true);
    }
    return token;
  } catch {
    return null;
  }
}

export async function fetchJson(path, options = {}) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) {
    Alert.alert('Error', 'EXPO_PUBLIC_API_URL not set');
    return null;
  }

  const url = `${baseUrl}${path}`;

  try {
    const token = await getIdToken();
    const headers = { ...(options.headers || {}) };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });
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
