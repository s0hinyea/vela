import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View, Text } from "react-native";
import { useEffect } from "react";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { theme } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { DEMO_MODE } from "../mocks";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Route protection: redirect based on auth state
  useEffect(() => {
    if (authLoading || !fontsLoaded) return;

    // Demo mode skips auth entirely
    if (DEMO_MODE) return;

    const inAuthGroup =
      segments[0] === "welcome" ||
      segments[0] === "signup" ||
      segments[0] === "signin";

    if (!user && !inAuthGroup) {
      // Not authenticated → go to welcome
      router.replace("/welcome");
    } else if (user && inAuthGroup) {
      // Authenticated but still on auth screen → go to greeting
      router.replace("/");
    }
  }, [user, authLoading, fontsLoaded, segments]);

  if (!fontsLoaded || authLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <Text
          style={{
            fontFamily: "System",
            fontSize: 28,
            fontWeight: "700",
            color: theme.colors.accent,
            letterSpacing: 2,
            marginBottom: 16,
          }}
        >
          Vela
        </Text>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: "fade",
        }}
      />
    </SafeAreaProvider>
  );
}
