import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';
import { colors } from '@/src/theme/tokens';

const icons = {
  index: 'compass-outline',
  itinerary: 'calendar-blank-outline',
  map: 'map-outline',
  food: 'silverware-fork-knife',
  costs: 'wallet-outline'
} as const;

const webTabBarStyle = {
  position: 'fixed',
  height: 'calc(58px + env(safe-area-inset-bottom))',
  paddingTop: 4,
  paddingBottom: 'env(safe-area-inset-bottom)',
  backgroundColor: 'rgba(255,255,255,0.92)',
  borderTopColor: 'rgba(23,33,27,0.08)',
  boxShadow: '0 -8px 24px rgba(18,62,46,0.08)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)'
} as unknown as ViewStyle;

export default function TabsLayout() {
  return (
    <Tabs safeAreaInsets={Platform.OS === 'web' ? { bottom: 0 } : undefined} screenOptions={({ route }) => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.forest,
      tabBarInactiveTintColor: '#7C867F',
      tabBarStyle: Platform.OS === 'web' ? webTabBarStyle : {
        position: 'absolute',
        height: Platform.OS === 'ios' ? 82 : 62,
        paddingTop: 5,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderTopColor: colors.line
      },
      tabBarItemStyle: { minHeight: 54, paddingVertical: 3 },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: -2 },
      tabBarIcon: ({ color, focused }) => (
        <MaterialCommunityIcons
          name={icons[route.name as keyof typeof icons]}
          size={focused ? 28 : 26}
          color={color}
        />
      )
    })}>
      <Tabs.Screen name="index" options={{ title: 'Trip' }} />
      <Tabs.Screen name="itinerary" options={{ title: 'Days' }} />
      <Tabs.Screen name="map" options={{ title: 'Route' }} />
      <Tabs.Screen name="food" options={{ title: 'Food' }} />
      <Tabs.Screen name="costs" options={{ title: 'Costs' }} />
    </Tabs>
  );
}
