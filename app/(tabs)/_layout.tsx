import { Tabs } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SettingsButton } from '../../src/components/SettingsButton';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerRight: () => <SettingsButton />,
      }}
    >
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