export async function fetchJson(path, options = {}) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
  const url = `${baseUrl}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Future enhancements: attach auth headers or refresh tokens here.
  const response = await fetch(url, { ...options, headers });
  return response.json();
}

export default fetchJson;
