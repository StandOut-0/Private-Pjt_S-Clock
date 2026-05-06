import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { display: 'none' }, // 탭 바 숨김
        headerShown: false, // 헤더를 각 화면에서 직접 관리
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '일정',
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: '일정',
        }}
      />
    </Tabs>
  );
}