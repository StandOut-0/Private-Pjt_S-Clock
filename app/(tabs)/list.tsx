import { useCallback, useState, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Pressable, Alert, AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { ThemedView } from '../../src/components/ui/ThemedView';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useScheduleStore } from '../../src/store/scheduleStore';
import { AnimatedAccordionList } from '../../src/components/AnimatedAccordionList';
import { CommonHeader } from '../../src/components/CommonHeader';
import { ViewToggleButton } from '../../src/components/ViewToggleButton';
import { ViewModeRadio } from '../../src/components/ViewModeRadio';

type ViewMode = 'daily' | 'weekly';

export default function ListView() {
  const { colors } = useTheme();
  const { schedules, loadSchedules, isLoading, setSelectedDate, clockColor } = useScheduleStore();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  // 날짜 변경 핸들러
  const handleDateChange = useCallback((newDate: string) => {
    setSelectedDate(newDate);
  }, [setSelectedDate]);

  // FAB 핸들러
  const handleCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    router.push({ pathname: '/detail', params: { new: 'true', date: today, from: 'list' } });
  };

  // 화면 포커스 시 전체 스케줄 로드
  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [loadSchedules])
  );

  // AppState 이벤트 처리 - 앱이 백그라운드에서 포그라운드로 돌아올 때 데이터 새로고침
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadSchedules();
      }
    });
    return () => subscription.remove();
  }, [loadSchedules]);

  return (
    <ThemedView style={styles.container}>
      {/* 공통 헤더 */}
      <CommonHeader currentView="list" onDateChange={handleDateChange} />
      
      {/* 일간/주간 라디오 버튼 */}
      <ViewModeRadio value={viewMode} onValueChange={setViewMode} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadSchedules} />
        }
      >
        <ThemedText style={styles.headerTitle}>전체 스케줄</ThemedText>
        <AnimatedAccordionList schedules={schedules} viewMode={viewMode} />
      </ScrollView>
      
      {/* FAB - 추가 버튼 (오른쪽 아래) */}
      <Pressable onPress={handleCreate} style={[styles.fab, { backgroundColor: clockColor }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <ThemedText style={styles.fabText}>+</ThemedText>
      </Pressable>
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
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
    viewToggleContainer: {
    position: 'absolute',
    top: 80,
    right: 20,
    zIndex: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 28,
  },
});