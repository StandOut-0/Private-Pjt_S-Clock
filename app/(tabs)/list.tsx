import { useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { ThemedView } from '../../src/components/ui/ThemedView';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useScheduleStore } from '../../src/store/scheduleStore';
import { AccordionList } from '../../src/components/AccordionList';

export default function ListView() {
  const { colors } = useTheme();
  const { schedules, loadSchedules, isLoading } = useScheduleStore();

  // 화면 포커스 시 전체 스케줄 로드
  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [loadSchedules])
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadSchedules} />
        }
      >
        <ThemedText style={styles.headerTitle}>전체 스케줄</ThemedText>
        <AccordionList schedules={schedules} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});