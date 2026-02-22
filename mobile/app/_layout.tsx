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
    // If not authenticated, we know there's no profile to load
    if (!user) {
      setHasSeniorConfigured(false);
      setProfileLoaded(true);
      return;
    }

    // Reset profile loaded state when a user signs in, so we wait for the fetch
    setProfileLoaded(false);

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
    // 1. Wait until everything is fully loaded AND segments are available
    if (authLoading || !fontsLoaded || !profileLoaded || !segments.length) return;

    // 2. Demo mode skips auth + onboarding entirely
    if (DEMO_MODE) return;

    const inAuthGroup = segments[0] === "welcome" || segments[0] === "signup" || segments[0] === "signin";
    const inOnboardingGroup = segments[0] === "onboarding";

    if (!user) {
      // Not signed in -> Must be in auth group
      if (!inAuthGroup) {
        router.replace("/welcome");
      }
    } else {
      // Signed in
      if (!hasSeniorConfigured) {
        // Needs to configure senior -> Must be in onboarding
        if (!inOnboardingGroup) {
          router.replace("/onboarding");
        }
      } else {
        // Has a configured senior -> Must NOT be in auth or onboarding
        if (inAuthGroup || inOnboardingGroup) {
          router.replace("/greeting");
        }
      }
    }
  }, [user, authLoading, fontsLoaded, profileLoaded, hasSeniorConfigured, segments]);

  // Only render the router if we are absolutely sure about the auth state AND the profile state
  // to prevent the UI flashing "Welcome -> Onboarding -> Greeting" rapidly on app launch.
  const isReadyForRouting = fontsLoaded && !authLoading && profileLoaded;

  if (!isReadyForRouting) {
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
      >
        <Stack.Screen
          name="edit-medication"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
