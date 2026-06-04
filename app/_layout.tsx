/**
 * @file _layout.tsx
 * @description 애플리케이션의 루트 레이아웃 컴포넌트입니다.
 * - ThemeProvider를 통한 앱의 전역 테마(다크/라이트 모드)를 설정합니다.
 * - Stack 네비게이터를 정의하여 화면 전환을 제어합니다.
 * - SafeAreaProvider를 감싸 하위 컴포넌트에서 안전 영역(Safe Area Insets)을 정상 감지하도록 보장합니다.
 */
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
