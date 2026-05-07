import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ui/ThemedText';
import { Schedule } from '../db/database';
import { YearMonthGroup, WeekGroup, groupSchedulesByDate, groupSchedulesByWeek, findNearestSection } from '../utils/dateGroup';
import { useScheduleStore } from '../store/scheduleStore';

// Android에서 LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionListProps {
  schedules: Schedule[];
  viewMode?: 'daily' | 'weekly';
}

export function AccordionList({ schedules, viewMode = 'daily' }: AccordionListProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { updateSchedule, loadSchedules } = useScheduleStore();

  // 완료된 항목을 아래로 정렬
  const sortedSchedules = [...schedules].sort((a, b) => {
    // 완료 상태가 다르면 미완료가 먼저
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // 같은 상태면 날짜/시간 순
    return 0;
  });

  // 스케줄 그룹핑 (정렬된 것 사용)
  const groupedData = viewMode === 'daily' 
    ? groupSchedulesByDate(sortedSchedules) 
    : groupSchedulesByWeek(sortedSchedules);

  // 초기 오픈 섹션 (오늘 또는 가장 최근)
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (groupedData.length > 0) {
      // 첫 번째 섹션 오픈
      const firstKey = viewMode === 'daily' 
        ? `${(groupedData[0] as YearMonthGroup).year}-${(groupedData[0] as YearMonthGroup).month}`
        : `${(groupedData[0] as WeekGroup).year}-${(groupedData[0] as WeekGroup).weekNumber}`;
      initial.add(firstKey);
    }
    return initial;
  });

  // 일별 오픈 섹션 (기본: 일간 뷰에서만 오픈)
  const [openDays, setOpenDays] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (viewMode === 'daily') {
      groupedData.forEach((group) => {
        group.days.forEach((day) => {
          initial.add(day.dateString);
        });
      });
    }
    return initial;
  });

  // 섹션 토글
  const toggleSection = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // 일별 토글
  const toggleDay = useCallback((dateString: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateString)) {
        next.delete(dateString);
      } else {
        next.add(dateString);
      }
      return next;
    });
  }, []);

  // 스케줄 아이템 클릭
  const handleSchedulePress = useCallback((schedule: Schedule) => {
    router.push({
      pathname: '/detail',
      params: { id: schedule.id, from: 'list' },
    });
  }, [router]);

  // 완료 토글
  const handleToggleComplete = useCallback(async (schedule: Schedule, e: any) => {
    e.stopPropagation();
    const newCompleted = !schedule.completed;
    await updateSchedule(schedule.id, { completed: newCompleted });
    await loadSchedules();
  }, [updateSchedule, loadSchedules]);

  if (groupedData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>스케줄이 없습니다</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {groupedData.map((group) => {
        const sectionKey = viewMode === 'daily'
          ? `${(group as YearMonthGroup).year}-${(group as YearMonthGroup).month}`
          : `${(group as WeekGroup).year}-${(group as WeekGroup).weekNumber}`;
        const isOpen = openSections.has(sectionKey);
        const displayText = viewMode === 'daily'
          ? (group as YearMonthGroup).displayMonth
          : (group as WeekGroup).displayWeek;

        return (
          <View key={sectionKey} style={styles.monthSection}>
            {/* 섹션 헤더 */}
            <Pressable
              onPress={() => toggleSection(sectionKey)}
              style={[styles.monthHeader, { backgroundColor: colors.card }]}
            >
              <ThemedText style={styles.monthHeaderText}>
                {displayText}
              </ThemedText>
              <ThemedText style={styles.chevron}>
                {isOpen ? '▼' : '▶'}
              </ThemedText>
            </Pressable>

            {/* 펼쳐진 내용 */}
            {isOpen && (
              <View style={styles.daysContainer}>
                {group.days.map((day) => {
                  const isDayOpen = openDays.has(day.dateString);
                  return (
                    <View key={day.dateString} style={styles.daySection}>
                      {/* 일 헤더 */}
                      <Pressable
                        onPress={() => toggleDay(day.dateString)}
                        style={[styles.dayHeader, { backgroundColor: colors.card }]}
                      >
                        <ThemedText style={styles.dayHeaderText}>
                          - {day.displayDate}
                        </ThemedText>
                        <View style={styles.dayHeaderRight}>
                          <ThemedText muted style={styles.scheduleCount}>
                            {day.schedules.length}개
                          </ThemedText>
                          <ThemedText style={styles.dayChevron}>
                            {isDayOpen ? '▼' : '▶'}
                          </ThemedText>
                        </View>
                      </Pressable>

                      {/* 스케줄 목록 */}
                      {isDayOpen && (
                        <View style={styles.schedulesList}>
                          {day.schedules.map((schedule: Schedule) => (
                            <Pressable
                              key={schedule.id}
                              onPress={() => handleSchedulePress(schedule)}
                              style={[styles.scheduleItem, { borderBottomColor: colors.border }]}
                            >
                              {/* 체크박스 */}
                              <Pressable
                                onPress={(e) => handleToggleComplete(schedule, e)}
                                style={styles.checkboxContainer}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <View
                                  style={[
                                    styles.checkbox,
                                    { borderColor: schedule.color },
                                    schedule.completed && [
                                      styles.checkboxChecked,
                                      { backgroundColor: schedule.color },
                                    ],
                                  ]}
                                >
                                  {schedule.completed && (
                                    <ThemedText style={styles.checkmark}>✓</ThemedText>
                                  )}
                                </View>
                              </Pressable>

                              {/* 색상 도트 */}
                              <View
                                style={[styles.colorDot, { backgroundColor: schedule.color }]}
                              />

                              {/* 내용 */}
                              <View style={styles.scheduleContent}>
                                <ThemedText
                                  style={[
                                    styles.scheduleTitle,
                                    schedule.completed && styles.completedTitle,
                                  ]}
                                  numberOfLines={1}
                                >
                                  <ThemedText style={styles.timeText}>
                                    {schedule.startTime} ~ {schedule.endTime}
                                  </ThemedText> {schedule.title}
                                </ThemedText>
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.5,
  },
  monthSection: {
    marginBottom: 8,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  monthHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 14,
    opacity: 0.6,
  },
  daysContainer: {
    paddingTop: 8,
  },
  daySection: {
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayChevron: {
    fontSize: 12,
    opacity: 0.6,
  },
  scheduleCount: {
    fontSize: 12,
  },
  schedulesList: {
    paddingHorizontal: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 1,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  scheduleTime: {
    fontSize: 11,
  },
  timeText: {
    fontSize: 11,
    opacity: 0.6,
  },
  completedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxContainer: {
    padding: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderWidth: 0,
  },
  checkmark: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
