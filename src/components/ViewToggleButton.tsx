import { Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ui/ThemedText';

export function ViewToggleButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();

  const isRingView = pathname === '/' || pathname === '/index';

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
