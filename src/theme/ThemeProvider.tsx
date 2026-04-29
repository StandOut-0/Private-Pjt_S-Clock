import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colors } from './colors';
import { loadThemePreference, saveThemePreference, type ThemePreference } from './themeStorage';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  preference: ThemePreference;
  toggleMode: () => void;
  setPreference: (next: ThemePreference) => void;
  colors: (typeof colors)[ThemeMode];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    loadThemePreference().then(setPreferenceState).catch(() => {
      setPreferenceState('system');
    });
  }, []);

  const mode: ThemeMode = useMemo(() => {
    if (preference === 'light' || preference === 'dark') {
      return preference;
    }

    return systemScheme === 'dark' ? 'dark' : 'light';
  }, [preference, systemScheme]);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    saveThemePreference(next).catch(() => undefined);
  };

  const toggleMode = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setPreference(next);
  };

  const value: ThemeContextValue = {
    mode,
    preference,
    toggleMode,
    setPreference,
    colors: colors[mode],
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }

  return context;
}
