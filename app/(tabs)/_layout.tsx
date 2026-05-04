import { Tabs } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SettingsButton } from '../../src/components/SettingsButton';
import { ViewToggleButton } from '../../src/components/ViewToggleButton';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { display: 'none' }, // 탭 바 숨김
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerLeft: () => <ViewToggleButton />,
        headerRight: () => <SettingsButton />,
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