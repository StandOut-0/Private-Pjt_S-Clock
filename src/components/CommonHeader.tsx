import React from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ui/ThemedText';
import { useScheduleStore } from '../store/scheduleStore';
import { SettingsButton } from './SettingsButton';
import { AnimatedViewToggleButton } from './AnimatedViewToggleButton';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CommonHeaderProps {
  currentView: 'ring' | 'list';
  onDateChange: (date: string) => void;
  onTimeReset?: () => void;
}

export function CommonHeader({ currentView, onDateChange, onTimeReset }: CommonHeaderProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { selectedDate } = useScheduleStore();
  
  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    
    if (isToday) {
      return '오늘';
    }
    
    return format(date, 'M월 d일 (EEE)', { locale: ko });
  };

  // 날짜 변경 함수
  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDateString = currentDate.toISOString().split('T')[0];
    onDateChange(newDateString);
    // 날짜 변경 시 시간 리셋
    if (onTimeReset) {
      onTimeReset();
    }
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
        shadowColor: colors.text,
      }
    ]}>
      {/* 좌측: 모드 전환 + 앱 이름 */}
      <View style={styles.leftSection}>
        <AnimatedViewToggleButton currentView={currentView} />
        <ThemedText style={styles.titleText}>S Clock</ThemedText>
      </View>

      {/* 우측: 설정 버튼 */}
      <View style={styles.buttonSection}>
        <SettingsButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centerSection: {
    flex: 1,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  titleSection: {
    flex: 1,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSection: {
    alignItems: 'center',
  },
});
