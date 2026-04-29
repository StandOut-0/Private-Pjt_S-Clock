import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ring',
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'List',
        }}
      />
    </Tabs>
  );
}