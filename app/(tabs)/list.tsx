import { StyleSheet } from 'react-native';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { ThemedView } from '../../src/components/ui/ThemedView';
import { typography } from '../../src/theme/typography';

export default function ListView() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView useCard style={styles.card}>
        <ThemedText style={styles.title}>List View</ThemedText>
        <ThemedText muted>공통 Themed Text/View 적용</ThemedText>
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
    maxWidth: 360,
    padding: 20,
    borderRadius: 16,
  },
  title: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    marginBottom: 8,
  },
});