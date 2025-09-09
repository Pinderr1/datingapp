export async function fetchJson(path, options = {}) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL not set');
  }

  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  const headers = {
    ...(options.headers || {}),
  };
  // Future extension: add auth headers or token refresh logic here
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}
