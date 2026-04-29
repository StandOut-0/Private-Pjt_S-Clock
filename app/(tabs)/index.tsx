import { StyleSheet } from 'react-native';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { ThemedView } from '../../src/components/ui/ThemedView';
import { typography } from '../../src/theme/typography';
import { RingDial } from '../../src/components/RingDial/RingDial';

export default function RingView() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView useCard style={styles.card}>
        <ThemedText style={styles.title}>Ring View</ThemedText>
        <ThemedText muted style={styles.subtitle}>
          24시간 이중 링 + 현재 시각 바늘
        </ThemedText>
        <RingDial />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: 16,
  },
});