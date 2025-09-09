import { fetchJson } from './api';

export async function fetchUsers() {
  return await fetchJson('/users');
}

