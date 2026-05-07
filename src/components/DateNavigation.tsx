import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ui/ThemedText';
import { useScheduleStore } from '../store/scheduleStore';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar } from 'react-native-calendars';

interface DateNavigationProps {
  onDateChange: (date: string) => void;
  onTimeReset?: () => void;
}

export function DateNavigation({ onDateChange, onTimeReset }: DateNavigationProps) {
  const { colors } = useTheme();
  const { selectedDate, clockColor } = useScheduleStore();
  const [showCalendar, setShowCalendar] = useState(false);
  
  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    
    if (isToday) {
      return `오늘`;
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
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.leftSection}>
        <Pressable
          onPress={() => changeDate(-1)}
          style={[styles.dateButton, { borderColor: clockColor, backgroundColor: clockColor + '20' }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ThemedText style={[styles.dateButtonText, { color: clockColor }]}>‹</ThemedText>
        </Pressable>
      </View>
      
      <Pressable onPress={() => setShowCalendar(true)}>
        <ThemedText style={[styles.dateText, { opacity: 0.7 }]}>{formatDate(selectedDate)}</ThemedText>
      </Pressable>
      
      <View style={styles.rightSection}>
        <Pressable
          onPress={() => changeDate(1)}
          style={[styles.dateButton, { borderColor: clockColor, backgroundColor: clockColor + '20' }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ThemedText style={[styles.dateButtonText, { color: clockColor }]}>›</ThemedText>
        </Pressable>
      </View>
      
      {/* 달력 팝업 */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setShowCalendar(false)}
        >
          <View style={[styles.calendarModal, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.calendarTitle}>날짜 선택</ThemedText>
            <Calendar
              current={selectedDate}
              onDayPress={(day: any) => {
                onDateChange(day.dateString);
                setShowCalendar(false);
              }}
              monthFormat={'yyyy년 M월'}
              locale={ko}
              theme={{
                backgroundColor: colors.card,
                calendarBackground: colors.card,
                textSectionTitleColor: colors.text,
                selectedDayBackgroundColor: clockColor,
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: clockColor,
                dayTextColor: colors.text,
                textDisabledColor: colors.mutedText,
                arrowColor: clockColor,
                monthTextColor: colors.text,
                indicatorColor: clockColor,
              }}
              style={styles.reactNativeCalendar}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 100, // FAB와 겹치지 않도록 충분한 여백
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: 'center', // 너비를 자동으로 조정
  },
  leftSection: {
    flex: 1,
    marginRight: 16,
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  dateButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  reactNativeCalendar: {
    width: '100%',
    borderRadius: 8,
  },
  simpleCalendar: {
    width: '100%',
  },
  calendarHeader: {
    marginBottom: 15,
    alignItems: 'center',
  },
  calendarHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  calendarDay: {
    width: 40,
    height: 40,
    margin: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarToday: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  calendarDayText: {
    fontSize: 14,
    color: '#333',
  },
});
