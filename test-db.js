import { initDatabase, createSchedule, getAllSchedules } from './src/db/database';

// 테스트 함수
async function testDatabase() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    console.log('Database initialized.');

    console.log('Creating test schedules...');
    await createSchedule({
      id: 'test-1',
      title: 'Test Schedule 1',
      date: '2024-01-01',
      startTime: '09:00',
      endTime: '10:00',
      color: '#FF0000',
      memo: 'Test memo',
    });

    await createSchedule({
      id: 'test-2',
      title: 'Test Schedule 2',
      date: '2024-01-01',
      startTime: '11:00',
      endTime: '12:00',
      color: '#00FF00',
    });

    console.log('Test schedules created.');

    console.log('Fetching all schedules...');
    const schedules = await getAllSchedules();
    console.log('Schedules:', schedules);

    console.log('Database test completed successfully!');
  } catch (error) {
    console.error('Database test failed:', error);
  }
}

testDatabase();