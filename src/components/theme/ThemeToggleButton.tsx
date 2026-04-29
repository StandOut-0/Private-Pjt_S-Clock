import { Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ui/ThemedText';

export function ThemeToggleButton() {
  const { mode, toggleMode, colors } = useTheme();

  return (
    <Pressable
      onPress={toggleMode}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <ThemedText style={{ fontSize: 13 }}>{mode === 'dark' ? 'Dark' : 'Light'}</ThemedText>
    </Pressable>
  );
}
