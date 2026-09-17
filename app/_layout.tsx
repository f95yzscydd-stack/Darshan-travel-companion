import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TripProvider } from '@/src/context/TripContext';
import { colors } from '@/src/theme/tokens';

export default function RootLayout() {
  return (
    <TripProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        headerTintColor: colors.forestDark,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: colors.canvas }
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="day/[id]" options={{ title: 'Day plan', presentation: 'card' }} />
        <Stack.Screen name="place/[id]" options={{ title: 'Place details', presentation: 'modal' }} />
        <Stack.Screen name="pivot" options={{ title: 'Pivot mode', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="porto" options={{ title: 'Porto' }} />
        <Stack.Screen name="mallorca" options={{ title: 'Mallorca' }} />
      </Stack>
    </TripProvider>
  );
}
