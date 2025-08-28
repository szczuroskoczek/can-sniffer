import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SettingsProvider } from '../context/SettingsContext';
import { useColorScheme } from '../hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SettingsProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="main-menu" options={{ title: 'CAN Sniffer' }} />
          <Stack.Screen name="server-select" options={{ title: 'Select Server' }} />
          <Stack.Screen name="sniff" options={{ title: 'Sniff CAN Messages' }} />
          <Stack.Screen name="log-all" options={{ title: 'Log All Messages' }} />
          <Stack.Screen name="send-custom" options={{ title: 'Send Custom Message' }} />
          <Stack.Screen name="saved-messages" options={{ title: 'Saved Messages' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="settings/servers" options={{ title: 'Manage Servers' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </SettingsProvider>
    </ThemeProvider>
  );
}
