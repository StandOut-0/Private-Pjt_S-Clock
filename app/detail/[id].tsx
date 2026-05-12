import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, Alert, ScrollView, Animated } from 'react-native';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { ThemedView } from '../../src/components/ui/ThemedView';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useScheduleStore } from '../../src/store/scheduleStore';
import { Schedule, getScheduleById, updateSchedule, deleteSchedule } from '../../src/db/database';
import { HapticFeedback } from '../../src/utils/haptics';

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const loadSchedulesByDate = useScheduleStore((state) => state.loadSchedulesByDate);

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [memo, setMemo] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Slide-up 애니메이션
  const slideAnim = React.useRef(new Animated.Value(300)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  // 애니메이션 시작
  const startAnimation = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    loadSchedule();
  }, [id]);

  const loadSchedule = async () => {
    try {
      const data = await getScheduleById(id);
      if (data) {
        setSchedule(data);
        setTitle(data.title);
        setStartTime(data.startTime);
        setEndTime(data.endTime);
        setMemo(data.memo || '');
      }
    } finally {
      setIsLoading(false);
      // 데이터 로드 후 애니메이션 시작
      startAnimation();
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('오류', '제목을 입력해주세요');
      return;
    }

    try {
      await updateSchedule(id, {
        title: title.trim(),
        startTime,
        endTime,
        memo: memo.trim(),
      });

      // 상태 갱신
      if (schedule) {
        await loadSchedulesByDate(schedule.date);
      }

      setIsEditing(false);
      await HapticFeedback.success(); // 성공 햅틱 피드백
      Alert.alert('완료', '저장되었습니다');
    } catch (error) {
      await HapticFeedback.error(); // 에러 햅틱 피드백
      Alert.alert('오류', '저장에 실패했습니다');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '삭제 확인',
      '이 스케줄을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSchedule(id);
              if (schedule) {
                await loadSchedulesByDate(schedule.date);
              }
              await HapticFeedback.error(); // 삭제 에러 햅틱 피드백
              router.back();
            } catch (error) {
              await HapticFeedback.error(); // 에러 햅틱 피드백
              Alert.alert('오류', '삭제에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>로딩 중...</ThemedText>
      </ThemedView>
    );
  }

  if (!schedule) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>스케줄을 찾을 수 없습니다</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText>돌아가기</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← 뒤로</ThemedText>
          </Pressable>
          <View style={styles.headerButtons}>
            {!isEditing ? (
              <Pressable
                onPress={() => setIsEditing(true)}
                style={[styles.editButton, { backgroundColor: colors.primary }]}
              >
                <ThemedText style={[styles.buttonText, { color: colors.white }]}>편집</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSave}
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
              >
                <ThemedText style={[styles.buttonText, { color: colors.white }]}>저장</ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>제목</ThemedText>
            {isEditing ? (
              <TextInput
                value={title}
                onChangeText={setTitle}
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="제목을 입력하세요"
                placeholderTextColor={colors.mutedText}
                allowFontScaling={true}
              />
            ) : (
              <View style={styles.valueContainer}>
                <View style={[styles.colorDot, { backgroundColor: schedule.color }]} />
                <ThemedText style={styles.titleText}>{schedule.title}</ThemedText>
              </View>
            )}
          </View>

          {/* Time */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>시간</ThemedText>
            {isEditing ? (
              <View style={styles.timeInputs}>
                <TextInput
                  value={startTime}
                  onChangeText={setStartTime}
                  style={[styles.timeInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="00:00"
                  placeholderTextColor={colors.mutedText}
                  maxLength={5}
                  allowFontScaling={true}
                />
                <ThemedText style={styles.timeSeparator}>~</ThemedText>
                <TextInput
                  value={endTime}
                  onChangeText={setEndTime}
                  style={[styles.timeInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="00:00"
                  placeholderTextColor={colors.mutedText}
                  maxLength={5}
                  allowFontScaling={true}
                />
              </View>
            ) : (
              <ThemedText style={styles.value}>
                {schedule.startTime} ~ {schedule.endTime}
              </ThemedText>
            )}
          </View>

          {/* Date */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>날짜</ThemedText>
            <ThemedText style={styles.value}>{schedule.date}</ThemedText>
          </View>

          {/* Memo */}
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
                allowFontScaling={true}
              />
            ) : (
              <ThemedText style={styles.memoText}>
                {schedule.memo || '메모 없음'}
              </ThemedText>
            )}
          </View>

          {/* Delete Button */}
          {!isEditing && (
            <Pressable
              onPress={handleDelete}
              style={[styles.deleteButton, { borderColor: colors.error }]}
            >
              <ThemedText style={{ color: colors.error }}>삭제</ThemedText>
            </Pressable>
          )}
        </View>
        </ScrollView>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedContainer: {
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
    // color는 동적으로 적용
    fontWeight: '600',
  },
  content: {
    padding: 16,
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
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
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
