export type ThemeColors = {
  primary: string;
  background: string;
  card: string;
  text: string;
  mutedText: string;
  border: string;
  success: string;
  error: string;
  white: string;
};

export const lightColors: ThemeColors = {
  primary: '#007AFF',
  background: '#F7F8FA',
  card: '#FFFFFF',
  text: '#111827',
  mutedText: '#4B5563', // 더 어두운 색상으로 대비율 개선
  border: '#E5E7EB',
  success: '#10B981',
  error: '#EF4444',
  white: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  primary: '#0A84FF',
  background: '#0B0D10',
  card: '#151A20',
  text: '#F3F4F6',
  mutedText: '#D1D5DB', // 더 밝은 색상으로 대비율 개선
  border: '#2A313A',
  success: '#10B981',
  error: '#EF4444',
  white: '#FFFFFF',
};

export const colors = {
  light: lightColors,
  dark: darkColors,
} as const;