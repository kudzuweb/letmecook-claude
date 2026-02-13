import { Tabs } from 'expo-router';
import { BookOpen, Warehouse, ShoppingCart } from 'lucide-react-native';
import { colors, fonts, iconSizes } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color }) => (
            <BookOpen size={iconSizes.tabBar} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color }) => (
            <Warehouse size={iconSizes.tabBar} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Shopping Lists',
          tabBarIcon: ({ color }) => (
            <ShoppingCart size={iconSizes.tabBar} color={color} strokeWidth={1.5} />
          ),
        }}
      />
    </Tabs>
  );
}
