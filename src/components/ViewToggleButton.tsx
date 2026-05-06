import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ui/ThemedText';

interface ViewToggleButtonProps {
  currentView: 'ring' | 'list';
}

export function ViewToggleButton({ currentView }: ViewToggleButtonProps) {
  const router = useRouter();
  const { colors } = useTheme();

  const isRingView = currentView === 'ring';

  return (
    <Pressable
      onPress={() => router.push(isRingView ? '/list' : '/')}
      style={[styles.button, { backgroundColor: colors.border }]}
    >
      <ThemedText style={styles.text}>
        {isRingView ? '☰' : '○'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 32,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
