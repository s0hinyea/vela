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
import { fetchMedications, fetchTodaySchedule } from "../api";
import { useVelaStore } from "../store/useVelaStore";

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
  const [hasRoutedInitialGreeting, setHasRoutedInitialGreeting] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { scheduleAll } = useNotifications();

  // Check profile state when user changes
  useEffect(() => {
    // 1. Unauthenticated: Clear memory, reset profile loading
    if (!user) {
      useVelaStore.getState().reset();
      setHasSeniorConfigured(false);
      setProfileLoaded(true);
      return;
    }

    // 2. Lock down routing, wait for all data fetches to pass
    setProfileLoaded(false);

    async function initProfile() {
      try {
        if (DEMO_MODE) {
          const { fetchProfile } = await import("../api");
          const { MOCK_PROFILE } = await import("../mocks");
          const p = await fetchProfile(MOCK_PROFILE.id);
          const { setProfile, setMedications, setSchedule } = useVelaStore.getState();
          setProfile(p);
          const meds = await fetchMedications(p.id);
          setMedications(meds);
          const schedule = await fetchTodaySchedule(p.id);
          setSchedule(schedule.slots, schedule.allTaken);
          setHasSeniorConfigured(true);
          return;
        }

        const { supabase } = await import("../lib/supabase");
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user!.id)
          .single();

        if (error || !data || !data.senior_name) {
          setHasSeniorConfigured(false);
        } else {
          // Fully populate store globally before rendering
          const { setProfile, setMedications, setSchedule } = useVelaStore.getState();
          
          setProfile({
            id: data.id,
            seniorName: data.senior_name,
            caregiverName: data.caregiver_name,
            preferredLanguage: data.preferred_language ?? "en",
            createdAt: data.created_at,
          });

          // Pre-fetch everything else
          try {
            const meds = await fetchMedications(data.id);
            setMedications(meds);
          } catch (e) {
            console.error("Layout: Failed to load medications", e);
          }

          try {
            const schedule = await fetchTodaySchedule(data.id);
            setSchedule(schedule.slots, schedule.allTaken);
          } catch (e) {
            console.error("Layout: Failed to load schedule", e);
          }

          setHasSeniorConfigured(true);
        }
      } catch (err) {
        console.error("Failed to initialize profile:", err);
        setHasSeniorConfigured(false);
      } finally {
        // Unlock router
        setProfileLoaded(true);
      }
    }

    initProfile();

    const sub = DeviceEventEmitter.addListener("seniorNameConfigured", () => {
      // Intentionally skipping setProfileLoaded(false) here so we don't unmount the navigator
      // and cause a "flash" of the loading screen. We fetch quietly.
      initProfile();
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
        setTimeout(() => router.replace("/welcome"), 1);
      }
    } else {
      // Signed in
      if (!hasSeniorConfigured) {
        // Needs to configure senior -> Must be in onboarding
        if (!inOnboardingGroup) {
          setTimeout(() => router.replace("/onboarding"), 1);
        }
      } else {
        // Has a configured senior
        if (!hasRoutedInitialGreeting) {
          // Always show greeting on first launch even if deep-linked
          setHasRoutedInitialGreeting(true);
          setTimeout(() => router.replace("/greeting"), 1);
        } else if (inAuthGroup || inOnboardingGroup) {
          // They explicitly shouldn't be here, redirect back to greeting
          setTimeout(() => router.replace("/greeting"), 1);
        }
      }
    }
  }, [user, authLoading, fontsLoaded, profileLoaded, hasSeniorConfigured, segments, hasRoutedInitialGreeting]);

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
