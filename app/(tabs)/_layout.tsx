import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/src/theme/tokens';

const icons = {
  index: 'compass-outline',
  itinerary: 'calendar-blank-outline',
  map: 'map-outline',
  food: 'silverware-fork-knife',
  costs: 'wallet-outline'
} as const;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.forest,
      tabBarInactiveTintColor: '#7C867F',
      tabBarStyle: {
        position: Platform.OS === 'web' ? 'fixed' : 'absolute',
        height: Platform.OS === 'ios' ? 86 : 68,
        paddingTop: 8,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderTopColor: colors.line
      },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      tabBarIcon: ({ color, size }) => (
        <MaterialCommunityIcons name={icons[route.name as keyof typeof icons]} size={size} color={color} />
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
