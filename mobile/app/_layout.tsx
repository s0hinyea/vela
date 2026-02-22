import { Stack, usePathname, useRootNavigationState, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, DeviceEventEmitter, Animated, Easing } from "react-native";
import { useEffect, useRef, useState } from "react";
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
import { VelaAvatar } from "../components/VelaAvatar";

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
  const [splashElapsed, setSplashElapsed] = useState(false);
  const [initialRouteSettled, setInitialRouteSettled] = useState(false);
  const [initialRouteStabilized, setInitialRouteStabilized] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const profileLoadRunId = useRef(0);
  const lastInitialTarget = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const navState = useRootNavigationState();
  const { scheduleAll } = useNotifications();

  // Check profile state when user changes
  useEffect(() => {
    let cancelled = false;

    async function initProfile(quiet = false) {
      const runId = ++profileLoadRunId.current;
      if (!quiet) setProfileLoaded(false);

      try {
        const userId = user?.id;
        if (!userId) return;

        if (DEMO_MODE) {
          const { fetchProfile } = await import("../api");
          const { MOCK_PROFILE } = await import("../mocks");
          const p = await fetchProfile(MOCK_PROFILE.id);
          if (cancelled || runId !== profileLoadRunId.current) return;
          const { setProfile, setMedications, setSchedule } = useVelaStore.getState();
          setProfile(p);
          const meds = await fetchMedications(p.id);
          if (cancelled || runId !== profileLoadRunId.current) return;
          setMedications(meds);
          const schedule = await fetchTodaySchedule(p.id);
          if (cancelled || runId !== profileLoadRunId.current) return;
          setSchedule(schedule.slots, schedule.allTaken);
          setHasSeniorConfigured(true);
          return;
        }

        const { supabase } = await import("../lib/supabase");
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (cancelled || runId !== profileLoadRunId.current) return;

        if (error || !data || !data.senior_name) {
          setHasSeniorConfigured(false);
        } else {
          const { setProfile, setMedications, setSchedule } = useVelaStore.getState();
          setProfile({
            id: data.id,
            seniorName: data.senior_name,
            caregiverName: data.caregiver_name,
            preferredLanguage: data.preferred_language ?? "en",
            seniorPhotoUrl: data.senior_photo_url ?? null,
            createdAt: data.created_at,
          });

          setHasSeniorConfigured(true);
          fetchMedications(data.id)
            .then((meds) => setMedications(meds))
            .catch((e) => console.error("Layout: Failed to load medications", e));

          fetchTodaySchedule(data.id)
            .then((schedule) => setSchedule(schedule.slots, schedule.allTaken))
            .catch((e) => console.error("Layout: Failed to load schedule", e));
        }
      } catch (err) {
        if (cancelled || runId !== profileLoadRunId.current) return;
        console.error("Failed to initialize profile:", err);
        setHasSeniorConfigured(false);
      } finally {
        if (cancelled || runId !== profileLoadRunId.current) return;
        setProfileLoaded(true);
      }
    }

    if (!user) {
      profileLoadRunId.current += 1;
      useVelaStore.getState().reset();
      setHasSeniorConfigured(false);
      setProfileLoaded(true);
      return;
    }

    void initProfile();

    const sub = DeviceEventEmitter.addListener("seniorNameConfigured", () => {
      void initProfile(true);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => setSplashElapsed(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      })
    );
    loop.start();
    return () => {
      loop.stop();
      spin.stopAnimation();
      spin.setValue(0);
    };
  }, [spin]);

  // Schedule notifications when user is authenticated
  useEffect(() => {
    if (user && hasSeniorConfigured) {
      scheduleAll(user.id);
    }
  }, [user, hasSeniorConfigured, scheduleAll]);

  const authResolved = !authLoading;
  const profileResolved = !user || profileLoaded;
  const startupReady = fontsLoaded && authResolved && profileResolved;
  const canRoute = startupReady && splashElapsed && !!navState?.key;
  const initialTarget = !user ? "/welcome" : !hasSeniorConfigured ? "/onboarding" : "/greeting";

  useEffect(() => {
    if (lastInitialTarget.current !== initialTarget) {
      setInitialRouteSettled(false);
      setInitialRouteStabilized(false);
      lastInitialTarget.current = initialTarget;
    }
  }, [initialTarget]);

  useEffect(() => {
    if (DEMO_MODE) {
      setInitialRouteStabilized(true);
      return;
    }

    if (!initialRouteSettled) {
      setInitialRouteStabilized(false);
      return;
    }

    const timer = setTimeout(() => setInitialRouteStabilized(true), 180);
    return () => clearTimeout(timer);
  }, [initialRouteSettled]);

  // Startup + guard routing with deterministic target selection.
  useEffect(() => {
    if (!canRoute || DEMO_MODE || !pathname) return;

    const inAuthGroup = pathname === "/welcome" || pathname === "/signin" || pathname === "/signup";
    const inOnboardingGroup = pathname === "/onboarding";

    if (!initialRouteSettled) {
      if (pathname !== initialTarget) {
        router.replace(initialTarget);
        return;
      }
      setInitialRouteSettled(true);
      return;
    }

    if (!user && !inAuthGroup) {
      router.replace("/welcome");
      return;
    }

    if (user && !hasSeniorConfigured && !inOnboardingGroup) {
      router.replace("/onboarding");
    }
  }, [
    canRoute,
    pathname,
    initialTarget,
    initialRouteSettled,
    user,
    hasSeniorConfigured,
    router,
  ]);

  const showSplash = !startupReady || !splashElapsed || (!DEMO_MODE && !initialRouteStabilized);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: "fade",
          }}
        >
          <Stack.Screen name="welcome" options={{ animation: "none" }} />
          <Stack.Screen name="signin" options={{ animation: "none" }} />
          <Stack.Screen name="signup" options={{ animation: "none" }} />
          <Stack.Screen name="onboarding" options={{ animation: "none" }} />
          <Stack.Screen name="greeting" options={{ animation: "none" }} />
          <Stack.Screen
            name="edit-medication"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="profile-photo"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
        </Stack>

        {showSplash ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: theme.colors.background,
            }}
            pointerEvents="none"
          >
            <View
              style={{
                width: 110,
                height: 110,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Animated.View
                style={{
                  transform: [{ rotate }],
                }}
              >
                <VelaAvatar />
              </Animated.View>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}
