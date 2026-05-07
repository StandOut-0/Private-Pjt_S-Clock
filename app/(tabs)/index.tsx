import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Pressable, Alert, AppState } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { ThemedView } from '../../src/components/ui/ThemedView';
import { typography } from '../../src/theme/typography';
import { RingDial } from '../../src/components/RingDial/RingDial';
import { CommonHeader } from '../../src/components/CommonHeader';
import { ViewToggleButton } from '../../src/components/ViewToggleButton';
import { DateNavigation } from '../../src/components/DateNavigation';
import { CalendarIcon } from '../../src/components/CalendarIcon';
import { useScheduleStore } from '../../src/store/scheduleStore';
import { getContrastTextColor } from '../../src/utils/colorUtils';

function getCurrentTimeString(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default function RingView() {
  const [currentTime, setCurrentTime] = useState(getCurrentTimeString());
  const schedules = useScheduleStore((state) => state.schedules);
  const selectedDate = useScheduleStore((state) => state.selectedDate);
  const setSelectedDate = useScheduleStore((state) => state.setSelectedDate);
  const loadSchedulesByDate = useScheduleStore((state) => state.loadSchedulesByDate);
  const clockColor = useScheduleStore((state) => state.clockColor);
  const router = useRouter();

  // 날짜 변경 핸들러
  const handleDateChange = useCallback((newDate: string) => {
    setSelectedDate(newDate);
    loadSchedulesByDate(newDate);
  }, [setSelectedDate, loadSchedulesByDate]);

  // 시간 리셋 핸들러
  const handleTimeReset = useCallback(() => {
    setCurrentTime('00:00');
  }, []);

  // 해당 날짜의 스케줄 필터링 및 완료율 계산
  const todaySchedules = schedules.filter((s) => s.date === selectedDate);
  const completedCount = todaySchedules.filter((s) => s.completed).length;
  const totalCount = todaySchedules.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // 화면에 포커스될 때 스케줄 새로고침
  useFocusEffect(
    useCallback(() => {
      loadSchedulesByDate(selectedDate);
    }, [loadSchedulesByDate, selectedDate])
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedDate]);

  // AppState 이벤트 처리 - 앱이 백그라운드에서 포그라운드로 돌아올 때 데이터 새로고침
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadSchedulesByDate(selectedDate);
      }
    });
    return () => subscription.remove();
  }, [loadSchedulesByDate, selectedDate]);

  const handleCreate = () => {
    // 시간대 확인
    const hourCounts: Record<number, number> = {};
    for (const schedule of todaySchedules) {
      const [hours] = schedule.startTime.split(':').map(Number);
      hourCounts[hours] = (hourCounts[hours] || 0) + 1;
    }
    const hasAvailableHour = Object.keys(hourCounts).length < 24 || Object.values(hourCounts).some((count) => count < 3);
    if (!hasAvailableHour) {
      Alert.alert('알림', '오늘은 이미 모든 시간대에 3개의 스케줄이 등록되어 더 이상 추가할 수 없습니다.');
      return;
    }
    router.push({ pathname: '/detail', params: { new: 'true', date: selectedDate, from: 'ring' } });
  };

  return (
    <ThemedView style={styles.container}>
      {/* 공통 헤더 */}
      <CommonHeader currentView="ring" onDateChange={handleDateChange} onTimeReset={handleTimeReset} />
      
      {/* 시간 표시 - 오늘일 때만 표시 */}
      <ThemedText style={selectedDate === new Date().toISOString().split('T')[0] ? styles.timeText : styles.timeTextHidden}>
        {currentTime}
      </ThemedText>
      
      {/* 헤더: 프로그레스바 | 완료율 */}
      <View style={styles.headerRow}>
        <View style={styles.progressWrapper}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${completionRate}%`, backgroundColor: clockColor }]} />
          </View>
        </View>
        <ThemedText style={styles.rateText}>{completionRate}% ({completedCount}/{totalCount})</ThemedText>
      </View>
      
      {/* 날짜 네비게이션 (시계 위) */}
      <View style={todaySchedules.length === 0 ? styles.dateNavigationSmall : styles.dateNavigationLarge}>
        <DateNavigation onDateChange={handleDateChange} onTimeReset={handleTimeReset} />
      </View>
      
      <RingDial />
      
      {/* FAB - 추가 버튼 (오른쪽 아래) */}
      <Pressable onPress={handleCreate} style={[styles.fab, { backgroundColor: clockColor }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <ThemedText style={[styles.fabText, { color: getContrastTextColor(clockColor) }]}>+</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  // card: {
  //   width: '100%',
  //   maxWidth: 380,
  //   padding: 20,
  //   borderRadius: 16,
  //   alignItems: 'center',
  // },
  viewToggleContainer: {
    position: 'absolute',
    top: 80,
    right: 20,
    zIndex: 100,
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 60,
    height: 32, // Add fixed height to maintain consistent spacing
  },
  timeTextHidden: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 60,
    opacity: 0,
    height: 32, // Add fixed height to maintain consistent spacing
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  dateNavigationSmall: {
    marginBottom: 20,
  },
  dateNavigationLarge: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  progressWrapper: {
    width: 120,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  rateText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 10,
    zIndex: 999,
    pointerEvents: 'auto',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 36,
    textAlign: 'center',
    marginTop: -4,
  },
});