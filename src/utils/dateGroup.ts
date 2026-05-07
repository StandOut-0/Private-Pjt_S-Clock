// 날짜 그룹핑 유틸리티 - date-fns 사용
import { format, parseISO, isSameDay, compareAsc } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Schedule } from '../db/database';

export interface GroupedSchedule {
  year: number;
  month: number;
  day: number;
  dateString: string; // YYYY-MM-DD
  displayDate: string; // "1월 15일 (월)"
  schedules: Schedule[];
}

export interface YearMonthGroup {
  year: number;
  month: number;
  displayMonth: string; // "2024년 1월"
  days: GroupedSchedule[];
}

export interface WeekGroup {
  year: number;
  weekNumber: number;
  month: number;
  displayWeek: string; // "2024년 1월 3주차"
  days: GroupedSchedule[];
}

// 시간 문자열을 분으로 변환
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// 스케줄을 연도 → 월 → 일 3단계로 그룹핑
export function groupSchedulesByDate(schedules: Schedule[]): YearMonthGroup[] {
  // 날짜순 정렬
  const sorted = [...schedules].sort((a, b) => {
    const dateCompare = compareAsc(parseISO(a.date), parseISO(b.date));
    if (dateCompare !== 0) return dateCompare;
    // 같은 날이면 시작 시간순
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  // 일별 그룹핑
  const dayMap = new Map<string, GroupedSchedule>();

  sorted.forEach((schedule) => {
    const date = parseISO(schedule.date);
    const dateKey = schedule.date;

    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        dateString: dateKey,
        displayDate: format(date, 'M/d (EEE)', { locale: ko }),
        schedules: [],
      });
    }

    dayMap.get(dateKey)!.schedules.push(schedule);
  });

  // 연-월 그룹핑
  const yearMonthMap = new Map<string, YearMonthGroup>();

  dayMap.forEach((dayGroup) => {
    const key = `${dayGroup.year}-${dayGroup.month}`;

    if (!yearMonthMap.has(key)) {
      yearMonthMap.set(key, {
        year: dayGroup.year,
        month: dayGroup.month,
        displayMonth: `${dayGroup.year}/${dayGroup.month}`,
        days: [],
      });
    }

    yearMonthMap.get(key)!.days.push(dayGroup);
  });

  // 배열로 변환하고 연도→월 순 정렬
  return Array.from(yearMonthMap.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year; // 최신 연도 먼저
    return b.month - a.month; // 최신 월 먼저
  });
}

// 오늘 날짜와 가장 가까운 섹션 찾기
export function findNearestSection(groups: YearMonthGroup[]): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 오늘 데이터 있는지 확인
  const todayStr = format(today, 'yyyy-MM-dd');

  for (const group of groups) {
    for (const day of group.days) {
      if (day.dateString === todayStr) {
        return `${group.year}-${group.month}`;
      }
    }
  }

  // 오늘 데이터 없으면 가장 최근 날짜 반환
  if (groups.length > 0 && groups[0].days.length > 0) {
    return `${groups[0].year}-${groups[0].month}`;
  }

  return null;
}

// 해당 월-일 그룹이 오늘인지 확인
export function isToday(dateString: string): boolean {
  return isSameDay(parseISO(dateString), new Date());
}

// 스케줄을 주별로 그룹핑
export function groupSchedulesByWeek(schedules: Schedule[]): WeekGroup[] {
  // 날짜순 정렬
  const sorted = [...schedules].sort((a, b) => {
    const dateCompare = compareAsc(parseISO(a.date), parseISO(b.date));
    if (dateCompare !== 0) return dateCompare;
    // 같은 날이면 시작 시간순
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  // 일별 그룹핑
  const dayMap = new Map<string, GroupedSchedule>();

  sorted.forEach((schedule) => {
    const date = parseISO(schedule.date);
    const dateKey = schedule.date;

    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        dateString: dateKey,
        displayDate: format(date, 'M/d (EEE)', { locale: ko }),
        schedules: [],
      });
    }

    dayMap.get(dateKey)!.schedules.push(schedule);
  });

  // 주별 그룹핑 (월별 주차 사용)
  const weekMap = new Map<string, WeekGroup>();

  dayMap.forEach((dayGroup) => {
    const date = parseISO(dayGroup.dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const weekNumber = getWeekOfMonth(date);
    const key = `${year}-${month}-${weekNumber}`;

    if (!weekMap.has(key)) {
      weekMap.set(key, {
        year,
        weekNumber,
        month,
        displayWeek: `${year}년 ${month}월 ${weekNumber}주차`,
        days: [],
      });
    }

    weekMap.get(key)!.days.push(dayGroup);
  });

  // 배열로 변환하고 연도→월→주 순 정렬
  return Array.from(weekMap.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year; // 최신 연도 먼저
    if (a.month !== b.month) return b.month - a.month; // 최신 월 먼저
    return b.weekNumber - a.weekNumber; // 최신 주차 먼저
  });
}

// 월별 주차 계산 (해당 월의 몇 번째 주인지)
function getWeekOfMonth(date: Date): number {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  
  // 첫 날의 요일 (0: 일요일, 1: 월요일, ...)
  const firstDayOfWeek = firstDayOfMonth.getDay();
  
  // 해당 날까지의 총 일수 + 첫 주의 오프셋
  const totalDays = dayOfMonth + firstDayOfWeek;
  
  // 주차 계산 (올림)
  return Math.ceil(totalDays / 7);
}
