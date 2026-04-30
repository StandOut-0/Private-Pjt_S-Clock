import { openDatabase, SQLiteDatabase } from 'expo-sqlite/legacy';
import { Platform } from 'react-native';

export interface Schedule {
  id: string;
  title: string;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  color: string; // hex color
  memo?: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

let db: SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

const STORAGE_KEY = 'sring_schedules';

// 웹 환경 체크
const isWeb = Platform.OS === 'web';

// 데이터베이스 초기화
export async function initDatabase(): Promise<void> {
  if (isWeb) {
    console.log('[DB] Web mode - using localStorage');
    return;
  }
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    db = openDatabase('sring.db');
    console.log('[DB] Database opened');

    await db.execAsync([
      {
        sql: `
      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        color TEXT NOT NULL,
        memo TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
    `,
        args: [],
      }
    ], false);
    console.log('[DB] Tables created');
  })();

  return initPromise;
}

// 데이터베이스 인스턴스 가져오기 (자동 초기화)
export async function getDatabase(): Promise<SQLiteDatabase> {
  await initDatabase();
  if (!db) throw new Error('DB init failed');
  return db;
}

// 웹용 localStorage 함수들
function getWebSchedules(): Schedule[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setWebSchedules(schedules: Schedule[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  } catch (e) {
    console.error('[DB] Failed to save to localStorage:', e);
  }
}

async function executeSql<T = any>(database: SQLiteDatabase, sql: string, params: (string | number | null)[] = []): Promise<T[]> {
  const resultSets = await database.execAsync([{ sql, args: params }], false);
  if (!resultSets || resultSets.length === 0) {
    return [];
  }

  const resultSet = resultSets[0] as { error?: Error; rows: any };
  if ('error' in resultSet && resultSet.error) {
    throw resultSet.error;
  }

  const rows = resultSet.rows;
  if (Array.isArray(rows)) {
    return rows;
  }
  if (rows && Array.isArray(rows._array)) {
    return rows._array;
  }
  if (rows && typeof rows.length === 'number' && typeof rows.item === 'function') {
    const items: T[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      items.push(rows.item(i));
    }
    return items;
  }

  return [];
}

// 스케줄 생성
export async function createSchedule(schedule: Omit<Schedule, 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = Date.now();
  const newSchedule: Schedule = {
    ...schedule,
    createdAt: now,
    updatedAt: now,
  };

  if (isWeb) {
    const schedules = getWebSchedules();
    schedules.push(newSchedule);
    setWebSchedules(schedules);
    console.log('[DB] Created schedule (web):', schedule.title);
    return;
  }

  const database = await getDatabase();
  await executeSql(
    database,
    `INSERT INTO schedules (id, title, date, startTime, endTime, color, memo, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      schedule.id,
      schedule.title,
      schedule.date,
      schedule.startTime,
      schedule.endTime,
      schedule.color,
      schedule.memo || null,
      now,
      now,
    ]
  );
}

// 날짜별 스케줄 조회
export async function getSchedulesByDate(date: string): Promise<Schedule[]> {
  if (isWeb) {
    const schedules = getWebSchedules().filter(s => s.date === date);
    console.log('[DB] Query result (web):', schedules.length);
    return schedules;
  }

  const database = await getDatabase();
  console.log('[DB] Querying schedules for date:', date);
  const result = await executeSql<Schedule>(database, `SELECT * FROM schedules WHERE date = ? ORDER BY startTime ASC`, [date]);
  console.log('[DB] Query result:', result.length);
  return result;
}

// 모든 스케줄 조회
export async function getAllSchedules(): Promise<Schedule[]> {
  if (isWeb) {
    return getWebSchedules();
  }
  const database = await getDatabase();
  return executeSql<Schedule>(database, `SELECT * FROM schedules ORDER BY date ASC, startTime ASC`);
}

// 스케줄 수정
export async function updateSchedule(
  id: string,
  updates: Partial<Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const now = Date.now();

  if (isWeb) {
    const schedules = getWebSchedules();
    const index = schedules.findIndex(s => s.id === id);
    if (index !== -1) {
      schedules[index] = { ...schedules[index], ...updates, updatedAt: now };
      setWebSchedules(schedules);
    }
    return;
  }

  const database = await getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.date !== undefined) {
    fields.push('date = ?');
    values.push(updates.date);
  }
  if (updates.startTime !== undefined) {
    fields.push('startTime = ?');
    values.push(updates.startTime);
  }
  if (updates.endTime !== undefined) {
    fields.push('endTime = ?');
    values.push(updates.endTime);
  }
  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }
  if (updates.memo !== undefined) {
    fields.push('memo = ?');
    values.push(updates.memo || null);
  }

  fields.push('updatedAt = ?');
  values.push(now);
  values.push(id);

  await executeSql(database, `UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`, values);
}

// 스케줄 삭제
export async function deleteSchedule(id: string): Promise<void> {
  if (isWeb) {
    const schedules = getWebSchedules().filter(s => s.id !== id);
    setWebSchedules(schedules);
    return;
  }
  const database = await getDatabase();
  await executeSql(database, 'DELETE FROM schedules WHERE id = ?', [id]);
}

// ID로 스케줄 조회
export async function getScheduleById(id: string): Promise<Schedule | null> {
  if (isWeb) {
    return getWebSchedules().find(s => s.id === id) ?? null;
  }
  const database = await getDatabase();
  const rows = await executeSql<Schedule>(database, 'SELECT * FROM schedules WHERE id = ?', [id]);
  return rows[0] ?? null;
}