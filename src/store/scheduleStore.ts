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
import { generateRandomColor } from '../utils/colorGen';

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
  highlightedId: string | null; // 생성/수정된 스케줄 ID (강조 표시용)
  isLoading: boolean;
  error: string | null;
  hasSeenCompletionNotice: boolean; // 완료 알림 다시 보지 않기

  // 액션
  initialize: () => Promise<void>;
  loadSchedules: () => Promise<void>;
  loadSchedulesByDate: (date: string) => Promise<void>;
  createSchedule: (schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSchedule: (id: string, updates: Partial<Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  setSchedules: (schedules: Schedule[]) => void;
  clearHighlightedId: () => void;
  clearError: () => void;
  setHasSeenCompletionNotice: (value: boolean) => void;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      schedules: [],
      selectedDate: new Date().toISOString().split('T')[0],
      highlightedId: null,
      isLoading: false,
      error: null,
      hasSeenCompletionNotice: false,

      initialize: async () => {
        try {
          set({ error: null });
          await initDatabase();
          await get().loadSchedules();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Database initialization failed' });
        }
      },

      loadSchedules: async () => {
        try {
          const schedules = await dbGetAllSchedules();
          set({ schedules });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load schedules' });
        }
      },

      loadSchedulesByDate: async (date: string) => {
        try {
          const schedules = await dbGetSchedulesByDate(date);
          // 완료된 항목을 뒤로 정렬 (미완료 먼저, 완료 나중)
          const sortedSchedules = schedules.sort((a, b) => {
            if (a.completed === b.completed) return 0;
            return a.completed ? 1 : -1;
          });
          set({ schedules: sortedSchedules });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load schedules by date' });
        }
      },

      createSchedule: async (scheduleData) => {
        try {
          set({ error: null });
          const now = Date.now();
          // 색상이 없으면 랜덤 색상 자동 배정
          const color = scheduleData.color || generateRandomColor();
          const newSchedule: Schedule = {
            ...scheduleData,
            color,
            id: generateId(),
            createdAt: now,
            updatedAt: now,
          };
          await dbCreateSchedule(newSchedule);
          // 날짜가 같으면 목록에 추가, 아니면 리로드
          const currentSchedules = get().schedules;
          const dateMatches = scheduleData.date === get().selectedDate;
          if (dateMatches) {
            set({ schedules: [...currentSchedules, newSchedule], highlightedId: newSchedule.id });
          } else {
            set({ selectedDate: scheduleData.date });
            await get().loadSchedulesByDate(scheduleData.date);
            set({ highlightedId: newSchedule.id });
          }
          return newSchedule.id;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to create schedule' });
          throw error;
        }
      },

      updateSchedule: async (id, updates) => {
        try {
          await dbUpdateSchedule(id, updates);
          // Optimistic update + 강조 표시
          const currentSchedules = get().schedules;
          const updatedSchedules = currentSchedules.map(s => 
            s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
          );
          set({ schedules: updatedSchedules, highlightedId: id });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update schedule' });
          // 실패시 리로드
          await get().loadSchedulesByDate(get().selectedDate);
        }
      },

      deleteSchedule: async (id) => {
        try {
          // Optimistic delete
          const currentSchedules = get().schedules;
          set({ schedules: currentSchedules.filter(s => s.id !== id) });
          await dbDeleteSchedule(id);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete schedule' });
          // 실패시 리로드
          await get().loadSchedulesByDate(get().selectedDate);
        }
      },

      setSelectedDate: (date) => set({ selectedDate: date }),

      setSchedules: (schedules) => set({ schedules }),

      clearHighlightedId: () => set({ highlightedId: null }),

      clearError: () => set({ error: null }),

      setHasSeenCompletionNotice: (value) => set({ hasSeenCompletionNotice: value }),
    }),
    {
      name: 'schedule-store',
      partialize: (state) => ({
        selectedDate: state.selectedDate,
        hasSeenCompletionNotice: state.hasSeenCompletionNotice,
        // highlightedId는 persist하지 않음 (임시값)
      }),
    }
  )
);