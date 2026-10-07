import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { useStore } from './src/store/useStore';
import { colors, isDark } from './src/theme';
import { preloadArt } from './src/services/preloadArt';
import { getLang, setLanguage } from './src/i18n';

// Start fetching the 3D artwork straight away.
preloadArt();

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());
  const textScale = useStore((s) => s.settings.textScale);
  const language = useStore((s) => s.settings.language);
  // Apply the language before anything renders (the screens read it as they draw).
  if (getLang() !== language) setLanguage(language);

  // Settings → Text size. On the web the whole app scales; on phones text also follows the phone's own text size.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    (document.documentElement.style as any).zoom = textScale === 1 ? '' : String(textScale);
  }, [textScale]);

  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useStore.persist.hasHydrated());
    return unsub;
  }, []);

  if (!fontsLoaded || !hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.forest} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark() ? 'light' : 'dark'} />
      {/* Re-draw every screen when the language changes. */}
      <RootNavigator key={language} />
    </SafeAreaProvider>
  );
}
