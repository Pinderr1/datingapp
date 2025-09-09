import { fetchJson } from './api';

export async function fetchUsers() {
  return fetchJson('/users');
}

