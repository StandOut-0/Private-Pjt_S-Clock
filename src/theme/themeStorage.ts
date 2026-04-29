import { Platform } from 'react-native';

const STORAGE_KEY = 's-ring.theme-preference';

export type ThemePreference = 'light' | 'dark' | 'system';

export async function saveThemePreference(value: ThemePreference): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, value);
  }
}

export async function loadThemePreference(): Promise<ThemePreference> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value;
    }
  }

  return 'system';
}
