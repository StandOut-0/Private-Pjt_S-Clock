export type ThemeColors = {
  primary: string;
  background: string;
  card: string;
  text: string;
  mutedText: string;
  border: string;
};

export const lightColors: ThemeColors = {
  primary: '#007AFF',
  background: '#F7F8FA',
  card: '#FFFFFF',
  text: '#111827',
  mutedText: '#6B7280',
  border: '#E5E7EB',
};

export const darkColors: ThemeColors = {
  primary: '#0A84FF',
  background: '#0B0D10',
  card: '#151A20',
  text: '#F3F4F6',
  mutedText: '#9CA3AF',
  border: '#2A313A',
};

export const colors = {
  light: lightColors,
  dark: darkColors,
} as const;