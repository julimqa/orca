import type { User } from '../../api/types';

const USER_KEY = 'user';
const ACCESS_TOKEN_KEY = 'accessToken';

export function loadStoredUser(): User | null {
  const storedUser = localStorage.getItem(USER_KEY);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as User;
  } catch (error) {
    console.error('Failed to parse user from localStorage:', error);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function persistUser(user: User | null): void {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearAuthStorage(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
