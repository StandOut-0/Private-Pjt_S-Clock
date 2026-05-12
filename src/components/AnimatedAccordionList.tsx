import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ui/ThemedText';
import { Schedule } from '../db/database';
import { YearMonthGroup, WeekGroup, groupSchedulesByDate, groupSchedulesByWeek, findNearestSection } from '../utils/dateGroup';
import { useScheduleStore } from '../store/scheduleStore';

interface AnimatedAccordionListProps {
  schedules: Schedule[];
  viewMode?: 'daily' | 'weekly';
}

export function AnimatedAccordionList({ schedules, viewMode = 'daily' }: AnimatedAccordionListProps) {
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

  // 섹션 애니메이션 상태
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
          <AnimatedSection
            key={sectionKey}
            isOpen={isOpen}
            headerText={displayText}
            onPress={() => toggleSection(sectionKey)}
            colors={colors}
          >
            {group.days.map((day) => {
              const isDayOpen = openDays.has(day.dateString);
              return (
                <AnimatedDaySection
                  key={day.dateString}
                  day={day}
                  isDayOpen={isDayOpen}
                  onDayToggle={() => toggleDay(day.dateString)}
                  onSchedulePress={handleSchedulePress}
                  onToggleComplete={handleToggleComplete}
                  colors={colors}
                />
              );
            })}
          </AnimatedSection>
        );
      })}
    </View>
  );
}

// Animated Section Component
interface AnimatedSectionProps {
  isOpen: boolean;
  headerText: string;
  onPress: () => void;
  colors: any;
  children: React.ReactNode;
}

function AnimatedSection({ isOpen, headerText, onPress, colors, children }: AnimatedSectionProps) {
  const height = useSharedValue(0);
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(isOpen ? 1 : 0, { duration: 300 });
    height.value = withTiming(isOpen ? 1 : 0, { duration: 300 });
  }, [isOpen]);

  const animatedStyle = useAnimatedStyle(() => {
    const animatedHeight = interpolate(
      height.value,
      [0, 1],
      [0, 1000], // 최대 높이, 필요에 따라 조정
      Extrapolate.CLAMP
    );

    return {
      height: animatedHeight,
      opacity: progress.value,
    };
  });

  const chevronStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      progress.value,
      [0, 1],
      [0, 90]
    );

    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  return (
    <View style={styles.monthSection}>
      <Pressable
        onPress={onPress}
        style={[styles.monthHeader, { backgroundColor: colors.card }]}
      >
        <ThemedText style={styles.monthHeaderText}>
          {headerText}
        </ThemedText>
        <Animated.View style={chevronStyle}>
          <ThemedText style={styles.chevron}>▶</ThemedText>
        </Animated.View>
      </Pressable>

      <Animated.View style={[styles.daysContainer, animatedStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}

// Animated Day Section Component
interface AnimatedDaySectionProps {
  day: any;
  isDayOpen: boolean;
  onDayToggle: () => void;
  onSchedulePress: (schedule: Schedule) => void;
  onToggleComplete: (schedule: Schedule, e: any) => void;
  colors: any;
}

function AnimatedDaySection({ day, isDayOpen, onDayToggle, onSchedulePress, onToggleComplete, colors }: AnimatedDaySectionProps) {
  const height = useSharedValue(0);
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(isDayOpen ? 1 : 0, { duration: 250 });
    height.value = withTiming(isDayOpen ? 1 : 0, { duration: 250 });
  }, [isDayOpen]);

  const animatedStyle = useAnimatedStyle(() => {
    const animatedHeight = interpolate(
      height.value,
      [0, 1],
      [0, day.schedules.length * 60 + 40], // 동적 높이 계산
      Extrapolate.CLAMP
    );

    return {
      height: animatedHeight,
      opacity: progress.value,
    };
  });

  const chevronStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      progress.value,
      [0, 1],
      [0, 90]
    );

    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  return (
    <View style={styles.daySection}>
      <Pressable
        onPress={onDayToggle}
        style={[styles.dayHeader, { backgroundColor: colors.card }]}
      >
        <ThemedText style={styles.dayHeaderText}>
          - {day.displayDate}
        </ThemedText>
        <View style={styles.dayHeaderRight}>
          <ThemedText muted style={styles.scheduleCount}>
            {day.schedules.length}개
          </ThemedText>
          <Animated.View style={chevronStyle}>
            <ThemedText style={styles.dayChevron}>▶</ThemedText>
          </Animated.View>
        </View>
      </Pressable>

      <Animated.View style={animatedStyle}>
        <View style={styles.schedulesList}>
          {day.schedules.map((schedule: Schedule) => (
            <Pressable
              key={schedule.id}
              onPress={() => onSchedulePress(schedule)}
              style={[styles.scheduleItem, { borderBottomColor: colors.border }]}
            >
              {/* 체크박스 */}
              <Pressable
                onPress={(e) => onToggleComplete(schedule, e)}
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
      </Animated.View>
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
    overflow: 'hidden',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
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
