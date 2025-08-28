import { HeaderBackButton } from '@react-navigation/elements';
import { DarkTheme, DefaultTheme, ThemeProvider, useNavigation } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';
import HeaderConnectToggle from '../components/HeaderConnectToggle';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import { WebSocketProvider } from '../context/WebSocketContext';
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
        <WebSocketProvider>
          <Stack
            screenOptions={{
              headerLeft: () => <HeaderLeftConditional />,
            }}
          >
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
        </WebSocketProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

function HeaderLeftConditional() {
  const { state } = useSettings();
  const hasSelected = !!state.selectedServerId;
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  if (!canGoBack && !hasSelected) return null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {canGoBack ? (
        <HeaderBackButton onPress={() => navigation.goBack()} />
      ) : null}
      {hasSelected ? <HeaderConnectToggle /> : null}
    </View>
  );
}
