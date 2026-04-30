import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useScheduleStore } from '../src/store/scheduleStore';
import { Platform } from 'react-native';

export default function RootLayout() {
  const initialize = useScheduleStore((state) => state.initialize);
  const createSchedule = useScheduleStore((state) => state.createSchedule);
  const setSelectedDate = useScheduleStore((state) => state.setSelectedDate);
  const loadSchedulesByDate = useScheduleStore((state) => state.loadSchedulesByDate);

  useEffect(() => {
    const initAndSeed = async () => {
      console.log('Initializing DB...');
      await initialize();
      console.log('DB initialized');

      // 더미 데이터 추가 (테스트용)
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      console.log('Adding dummy data for date:', today);

      // 웹에서 기존 데이터 클리어 (중복 방지)
      if (Platform.OS === 'web') {
        localStorage.removeItem('sring_schedules');
        console.log('[Layout] Cleared existing web data');
      }

      const dummySchedules = [
        { title: 'Midnight Snack', startTime: '00:00', endTime: '01:00', color: '#8B5CF6', memo: '야식' },
        { title: 'Morning Meeting', startTime: '01:00', endTime: '02:00', color: '#3B82F6', memo: '아침 회의' },
        { title: 'Exercise', startTime: '02:00', endTime: '03:00', color: '#EF4444', memo: '운동' },
        { title: 'Reading', startTime: '03:00', endTime: '04:00', color: '#06B6D4', memo: '독서' },
        { title: 'Breakfast', startTime: '04:00', endTime: '05:00', color: '#F59E0B', memo: '아침 식사' },
        { title: 'Commute', startTime: '05:00', endTime: '06:00', color: '#10B981', memo: '출근' },
        { title: 'Work Start', startTime: '06:00', endTime: '07:00', color: '#6366F1', memo: '업무 시작' },
        { title: 'Team Meeting', startTime: '07:00', endTime: '08:00', color: '#EC4899', memo: '팀 미팅' },
        { title: 'Deep Work', startTime: '08:00', endTime: '09:00', color: '#84CC16', memo: '집중 작업' },
        { title: 'Coffee Break', startTime: '09:00', endTime: '10:00', color: '#F97316', memo: '커피 브레이크' },
        { title: 'Client Call', startTime: '10:00', endTime: '11:00', color: '#14B8A6', memo: '클라이언트 통화' },
        { title: 'Lunch', startTime: '11:00', endTime: '12:00', color: '#8B5CF6', memo: '점심 식사' },
        { title: 'Nap', startTime: '12:00', endTime: '13:00', color: '#3B82F6', memo: '낮잠' },
        { title: 'Afternoon Work', startTime: '13:00', endTime: '14:00', color: '#EF4444', memo: '오후 업무' },
        { title: 'Project Review', startTime: '14:00', endTime: '15:00', color: '#06B6D4', memo: '프로젝트 리뷰' },
        { title: 'Break', startTime: '15:00', endTime: '16:00', color: '#F59E0B', memo: '휴식' },
        { title: 'Coding', startTime: '16:00', endTime: '17:00', color: '#10B981', memo: '코딩' },
        { title: 'Code Review', startTime: '17:00', endTime: '18:00', color: '#6366F1', memo: '코드 리뷰' },
        { title: 'Commute Home', startTime: '18:00', endTime: '19:00', color: '#EC4899', memo: '퇴근' },
        { title: 'Dinner', startTime: '19:00', endTime: '20:00', color: '#84CC16', memo: '저녁 식사' },
        { title: 'Family Time', startTime: '20:00', endTime: '21:00', color: '#F97316', memo: '가족 시간' },
        { title: 'Relax', startTime: '21:00', endTime: '22:00', color: '#14B8A6', memo: '휴식' },
        { title: 'Hobby', startTime: '22:00', endTime: '23:00', color: '#8B5CF6', memo: '취미 활동' },
        { title: 'Wind Down', startTime: '23:00', endTime: '24:00', color: '#3B82F6', memo: '마무리' },
      ];

      // DB에 저장하고 today 날짜 스케줄 다시 로드
      for (const schedule of dummySchedules) {
        await createSchedule({
          title: schedule.title,
          date: today,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          color: schedule.color,
          memo: schedule.memo,
        });
        console.log(`[Layout] Added ${schedule.title}`);
      }

      // 최종 로드로 UI 업데이트 보장
      await loadSchedulesByDate(today);
      console.log('[Layout] All dummy data saved to DB and loaded');
    };

    initAndSeed();
  }, [initialize, createSchedule, setSelectedDate, loadSchedulesByDate]);

  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}