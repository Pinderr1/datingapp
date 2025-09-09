import { fetchJson } from './api';

export async function fetchUsers() {
  try {
    return await fetchJson('/users');
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

