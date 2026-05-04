import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useScheduleStore } from '../src/store/scheduleStore';

export default function RootLayout() {
  const initialize = useScheduleStore((state) => state.initialize);
  const setSelectedDate = useScheduleStore((state) => state.setSelectedDate);
  const loadSchedulesByDate = useScheduleStore((state) => state.loadSchedulesByDate);

  useEffect(() => {
    const init = async () => {
      await initialize();
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      await loadSchedulesByDate(today);
    };

    init();
  }, [initialize, setSelectedDate, loadSchedulesByDate]);

  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}