import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Schedule,
  initDatabase,
  createSchedule as dbCreateSchedule,
  getSchedulesByDate as dbGetSchedulesByDate,
  getAllSchedules as dbGetAllSchedules,
  updateSchedule as dbUpdateSchedule,
  deleteSchedule as dbDeleteSchedule,
  getScheduleById as dbGetScheduleById,
} from '../db/database';

// ID 생성 함수 (브라우저 호환)
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 폴백: 간단한 UUID 생성
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface ScheduleState {
  schedules: Schedule[];
  selectedDate: string;
  isLoading: boolean;
  error: string | null;

  // 액션
  initialize: () => Promise<void>;
  loadSchedules: () => Promise<void>;
  loadSchedulesByDate: (date: string) => Promise<void>;
  createSchedule: (schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSchedule: (id: string, updates: Partial<Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  setSchedules: (schedules: Schedule[]) => void;
  clearError: () => void;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      schedules: [],
      selectedDate: new Date().toISOString().split('T')[0], // 오늘 날짜
      isLoading: false,
      error: null,

      initialize: async () => {
        try {
          set({ isLoading: true, error: null });
          await initDatabase();
          await get().loadSchedules();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Database initialization failed' });
        } finally {
          set({ isLoading: false });
        }
      },

      loadSchedules: async () => {
        try {
          set({ isLoading: true, error: null });
          const schedules = await dbGetAllSchedules();
          set({ schedules });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load schedules' });
        } finally {
          set({ isLoading: false });
        }
      },

      loadSchedulesByDate: async (date: string) => {
        try {
          set({ isLoading: true, error: null });
          console.log('[Store] Loading schedules for date:', date);
          const schedules = await dbGetSchedulesByDate(date);
          console.log('[Store] Loaded schedules:', schedules.length, schedules.map(s => s.title));
          set({ schedules });
        } catch (error) {
          console.error('[Store] Error loading schedules:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to load schedules by date' });
        } finally {
          set({ isLoading: false });
        }
      },

      createSchedule: async (scheduleData) => {
        try {
          set({ isLoading: true, error: null });
          const newSchedule = {
            ...scheduleData,
            id: generateId(),
          };
          await dbCreateSchedule(newSchedule);
          // 생성된 스케줄의 날짜로 다시 로드
          await get().loadSchedulesByDate(scheduleData.date);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to create schedule' });
        } finally {
          set({ isLoading: false });
        }
      },

      updateSchedule: async (id, updates) => {
        try {
          set({ isLoading: true, error: null });
          await dbUpdateSchedule(id, updates);
          await get().loadSchedulesByDate(get().selectedDate);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update schedule' });
        } finally {
          set({ isLoading: false });
        }
      },

      deleteSchedule: async (id) => {
        try {
          set({ isLoading: true, error: null });
          await dbDeleteSchedule(id);
          await get().loadSchedulesByDate(get().selectedDate);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete schedule' });
        } finally {
          set({ isLoading: false });
        }
      },

      setSelectedDate: (date) => set({ selectedDate: date }),

      setSchedules: (schedules) => set({ schedules }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'schedule-store',
      partialize: (state) => ({
        selectedDate: state.selectedDate,
      }),
    }
  )
);