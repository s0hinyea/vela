import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View, Text, DeviceEventEmitter } from "react-native";
import { useEffect, useState } from "react";
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
import { useNotifications } from "../hooks/useNotifications";
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
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [hasSeniorConfigured, setHasSeniorConfigured] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { scheduleAll } = useNotifications();

  // Check profile state when user changes
  useEffect(() => {
    if (!user) {
      setProfileLoaded(true);
      return;
    }

    // Check if senior_name exists
    import("../lib/supabase").then(({ supabase }) => {
      supabase.from("profiles")
        .select("senior_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setHasSeniorConfigured(!!data?.senior_name);
          setProfileLoaded(true);
        });
    });

    const sub = DeviceEventEmitter.addListener("seniorNameConfigured", () => {
      setHasSeniorConfigured(true);
    });

    return () => sub.remove();
  }, [user]);

  // Schedule notifications when user is authenticated
  useEffect(() => {
    if (user && hasSeniorConfigured) {
      scheduleAll(user.id);
    }
  }, [user, hasSeniorConfigured, scheduleAll]);

  // Route protection: redirect based on auth + profile state
  useEffect(() => {
    if (authLoading || !fontsLoaded || !profileLoaded) return;

    // Demo mode skips auth + onboarding entirely
    if (DEMO_MODE) return;

    const inAuthGroup =
      segments[0] === "welcome" ||
      segments[0] === "signup" ||
      segments[0] === "signin";

    const onOnboarding = segments[0] === "onboarding";

    if (!user && !inAuthGroup) {
      // 1. Not signed in → Welcome
      router.replace("/welcome");
    } else if (user) {
      // 2. Signed in, but hasn't named senior → Onboarding
      if (!hasSeniorConfigured && !onOnboarding) {
        router.replace("/onboarding");
      }
      // 3. Signed in, HAS named senior, but still on auth/onboarding screens → Home
      else if (hasSeniorConfigured && (inAuthGroup || onOnboarding)) {
        router.replace("/");
      }
    }
  }, [user, authLoading, fontsLoaded, profileLoaded, hasSeniorConfigured, segments]);

  if (!fontsLoaded || authLoading || !profileLoaded) {
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
