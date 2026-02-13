import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../lib/theme';
import { useStore } from '../lib/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  const router = useRouter();
  const initialize = useStore(s => s.initialize);

  useEffect(() => {
    if (!fontsLoaded) return;
    (async () => {
      const seen = await AsyncStorage.getItem('onboardingDone');
      setCheckedOnboarding(true);
      await SplashScreen.hideAsync();
      if (!seen) {
        router.replace('/welcome');
      } else {
        await initialize();
      }
    })();
  }, [fontsLoaded]);

  if (!fontsLoaded || !checkedOnboarding) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="import-modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="chef/[id]" />
        <Stack.Screen name="channel/[id]" />
        <Stack.Screen name="collection/[id]" />
      </Stack>
    </>
  );
}
