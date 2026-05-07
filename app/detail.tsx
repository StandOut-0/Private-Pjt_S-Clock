import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, TextInput, Alert, ScrollView } from 'react-native';
import { ThemedText } from '../src/components/ui/ThemedText';
import { ThemedView } from '../src/components/ui/ThemedView';
import { useTheme } from '../src/theme/ThemeProvider';
import { useScheduleStore } from '../src/store/scheduleStore';
import { Schedule, getScheduleById, updateSchedule, createSchedule } from '../src/db/database';
import { ColorPicker } from '../src/components/ColorPicker';
import { generateRandomColor, getContrastTextColor } from '../src/utils/colorGen';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 랜덤 색상은 colorGen에서 가져옴
function getRandomColor(): string {
  return generateRandomColor();
}

export default function DetailScreen() {
  const { id, date: paramDate, new: isNew, from } = useLocalSearchParams<{ id?: string; date?: string; new?: string; from?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const loadSchedulesByDate = useScheduleStore((state) => state.loadSchedulesByDate);
  const deleteScheduleFromStore = useScheduleStore((state) => state.deleteSchedule);
  const createScheduleFromStore = useScheduleStore((state) => state.createSchedule);
  const schedules = useScheduleStore((state) => state.schedules);
  const clockColor = useScheduleStore((state) => state.clockColor);

  const selectedDate = paramDate || new Date().toISOString().split('T')[0];
  const isNewSchedule = isNew === 'true' || !id;

  // 뒤로 가기 처리 (from 파라미터에 따라 탭 이동)
  const handleGoBack = useCallback(() => {
    if (from === 'list') {
      router.push('/(tabs)/list');
    } else {
      router.back();
    }
  }, [from, router]);

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [title, setTitle] = useState('');
  // 현재 시간 기준으로 기본값 설정
  const getCurrentTimeRounded = () => {
    const now = new Date();
    const hour = now.getHours().toString().padStart(2, '0');
    const nextHour = ((now.getHours() + 1) % 24).toString().padStart(2, '0');
    return { start: `${hour}:00`, end: `${nextHour}:00` };
  };
  const currentTimeRounded = getCurrentTimeRounded();
  const [startTime, setStartTime] = useState(currentTimeRounded.start);
  const [endTime, setEndTime] = useState(currentTimeRounded.end);
  const [memo, setMemo] = useState('');
  const [color, setColor] = useState(getRandomColor());
  const [completed, setCompleted] = useState(false);
  const [isEditing, setIsEditing] = useState(isNewSchedule);
  const [isLoading, setIsLoading] = useState(!isNewSchedule);

  const selectedHour = parseInt(startTime.split(':')[0], 10);
  const sameHourCount = schedules.filter((s) => {
    if (s.date !== selectedDate) return false;
    const scheduleHour = parseInt(s.startTime.split(':')[0], 10);
    if (!isNewSchedule && s.id === id) return false;
    return scheduleHour === selectedHour;
  }).length;
  const isHourFull = sameHourCount >= 3;
  const hourLimitWarning = isHourFull
    ? '동일 시간대에는 최대 3개의 스케줄만 등록할 수 있습니다.'
    : '';

  useEffect(() => {
    if (!isNewSchedule && id) {
      loadSchedule();
    }
  }, [id, isNewSchedule]);

  const loadSchedule = async () => {
    if (!id) return;
    try {
      const data = await getScheduleById(id);
      if (data) {
        setSchedule(data);
        setTitle(data.title);
        setStartTime(data.startTime);
        setEndTime(data.endTime);
        setMemo(data.memo || '');
        setColor(data.color);
        setCompleted(data.completed || false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요');
      return;
    }

    if (isNewSchedule) {
      const selectedHour = parseInt(startTime.split(':')[0], 10);
      const sameHourCount = schedules.filter(
        (s) => s.date === selectedDate && parseInt(s.startTime.split(':')[0], 10) === selectedHour
      ).length;
      if (sameHourCount >= 3) {
        Alert.alert('알림', '동일 시간대에는 최대 3개의 스케줄만 등록할 수 있습니다. 다른 시간을 선택해주세요.');
        return;
      }
    }

    try {
      if (isNewSchedule) {
        // store의 createSchedule 사용 (이미 lastCreatedId 설정됨)
        await createScheduleFromStore({
          title: title.trim(),
          date: selectedDate,
          startTime,
          endTime,
          color,
          memo: memo.trim(),
          completed: false,
        });
        // 불필요한 loadSchedulesByDate 제거 - store에서 이미 처리
      } else if (id) {
        await updateSchedule(id, {
          title: title.trim(),
          startTime,
          endTime,
          color,
          memo: memo.trim(),
          completed,
        });
        // update도 optimistic update됨
        setIsEditing(false);
      }
      handleGoBack();
    } catch (error) {
      console.error('[Detail] Save error:', error);
      alert('저장에 실패했습니다');
    }
  };

  const handleDelete = async () => {
    console.log('[Detail] handleDelete called, id:', id);
    if (!id) {
      alert('삭제할 항목이 없습니다');
      return;
    }

    // 웹/모바일 모두 작동하는 confirm
    const confirmed = window.confirm('정말 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.');
    
    if (!confirmed) {
      console.log('[Detail] Delete cancelled');
      return;
    }

    console.log('[Detail] Starting delete for id:', id);
    try {
      // 1. 스케줄 삭제 (store 함수 사용)
      await deleteScheduleFromStore(id);
      console.log('[Detail] Delete success via store');

      // 2. 뒤로 가기 (먼저 실행해서 화면 전환)
      handleGoBack();

      // 3. 스케줄 다시 로드 (현재 선택된 날짜로)
      setTimeout(async () => {
        try {
          await loadSchedulesByDate(selectedDate);
          console.log('[Detail] Schedules reloaded for date:', selectedDate);
        } catch (reloadErr) {
          console.error('[Detail] Reload error:', reloadErr);
        }
      }, 100);
    } catch (error) {
      console.error('[Detail] Delete failed:', error);
      alert('삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const toggleCompleted = async () => {
    const newCompleted = !completed;
    setCompleted(newCompleted);
    if (!isNewSchedule && id) {
      try {
        await updateSchedule(id, { completed: newCompleted });
        if (schedule) {
          await loadSchedulesByDate(schedule.date);
        }
      } catch (error) {
        console.error('[Detail] Toggle completed error:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>로딩 중...</ThemedText>
      </ThemedView>
    );
  }

  if (!isNewSchedule && !schedule) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>스케줄을 찾을 수 없습니다</ThemedText>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <ThemedText>돌아가기</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Pressable onPress={handleGoBack} style={styles.backButton}>
            <ThemedText style={styles.backText}>← {isNewSchedule ? '취소' : '뒤로'}</ThemedText>
          </Pressable>
          <View style={styles.headerButtons}>
            {!isNewSchedule && !isEditing ? (
              <Pressable
                onPress={() => setIsEditing(true)}
                style={[styles.editButton, { backgroundColor: clockColor }]}
              >
                <ThemedText style={[styles.buttonText, { color: getContrastTextColor(clockColor) }]}>편집</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSave}
                disabled={isHourFull}
                style={[
                  styles.saveButton,
                  { backgroundColor: isHourFull ? '#9CA3AF' : clockColor },
                ]}
              >
                <ThemedText style={[styles.buttonText, { color: getContrastTextColor(clockColor) }]}>저장</ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.dateLabel}>
            {isNewSchedule ? selectedDate : schedule?.date}
          </ThemedText>

          {/* Completed Toggle - Always visible */}
          {!isNewSchedule && (
            <Pressable onPress={toggleCompleted} style={styles.completedSection}>
              <View style={[styles.checkbox, { borderColor: colors.border }, completed && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                {completed && <ThemedText style={styles.checkmark}>✓</ThemedText>}
              </View>
              <ThemedText style={[styles.completedText, completed && styles.completedTextDone]}>
                {completed ? '완료함' : '미완료 - 탭하여 완료'}
              </ThemedText>
            </Pressable>
          )}

          <View style={styles.section}>
            <ThemedText style={styles.label}>제목</ThemedText>
            {isEditing ? (
              <TextInput
                value={title}
                onChangeText={setTitle}
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="제목을 입력하세요"
                placeholderTextColor={colors.mutedText}
                autoFocus={isNewSchedule}
              />
            ) : (
              <View style={styles.valueContainer}>
                <View style={[styles.colorDot, { backgroundColor: color }]} />
                <ThemedText style={[styles.titleText, completed && styles.completedTitle]}>{title}</ThemedText>
              </View>
            )}
          </View>

          {/* Color Picker */}
          {isEditing && (
            <View style={styles.section}>
              <ThemedText style={styles.label}>색상</ThemedText>
              <ColorPicker
                selectedColor={color}
                onSelectColor={setColor}
              />
            </View>
          )}

          <View style={styles.section}>
            <ThemedText style={styles.label}>시간</ThemedText>
            {isEditing ? (
              <>
                <View style={styles.timeInputs}>
                  <TextInput
                    value={startTime}
                    onChangeText={setStartTime}
                    style={[styles.timeInput, { borderColor: colors.border, color: colors.text }]}
                    placeholder="00:00"
                    placeholderTextColor={colors.mutedText}
                    maxLength={5}
                  />
                  <ThemedText style={styles.timeSeparator}>~</ThemedText>
                  <TextInput
                    value={endTime}
                    onChangeText={setEndTime}
                    style={[styles.timeInput, { borderColor: colors.border, color: colors.text }]}
                    placeholder="00:00"
                    placeholderTextColor={colors.mutedText}
                    maxLength={5}
                  />
                </View>
                {hourLimitWarning ? (
                  <ThemedText style={styles.warningText}>{hourLimitWarning}</ThemedText>
                ) : null}
              </>
            ) : (
              <ThemedText style={styles.value}>
                {startTime} ~ {endTime}
              </ThemedText>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.label}>메모</ThemedText>
            {isEditing ? (
              <TextInput
                value={memo}
                onChangeText={setMemo}
                style={[styles.memoInput, { borderColor: colors.border, color: colors.text }]}
                placeholder="메모를 입력하세요"
                placeholderTextColor={colors.mutedText}
                multiline
                numberOfLines={4}
              />
            ) : (
              <ThemedText style={styles.memoText}>
                {memo || '메모 없음'}
              </ThemedText>
            )}
          </View>

          {!isNewSchedule && !isEditing && (
            <Pressable
              onPress={() => {
                console.log('[Detail] Delete button pressed');
                handleDelete();
              }}
              style={[styles.deleteButton, { borderColor: '#EF4444' }]}
              hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
            >
              <ThemedText style={{ color: '#EF4444', fontWeight: '600' }}>삭제</ThemedText>
            </Pressable>
          )}
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  warningText: {
    marginTop: 8,
    color: '#DC2626',
    fontSize: 13,
  },
  content: {
    padding: 16,
  },
  dateLabel: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 24,
  },
  completedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
  },
  completedText: {
    fontSize: 16,
  },
  completedTextDone: {
    opacity: 0.6,
    textDecorationLine: 'line-through',
  },
  completedTitle: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '600',
  },
  value: {
    fontSize: 18,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    width: 80,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 18,
  },
  memoInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  memoText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  deleteButton: {
    marginTop: 32,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
});
