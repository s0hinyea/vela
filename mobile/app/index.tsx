/**
 * Screen 1 — Greeting
 * The first thing the senior sees. Their name, time of day, one button.
 */
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { useVelaStore } from "../store/useVelaStore";
import { fetchProfile, fetchTodaySchedule } from "../api";
import { MOCK_PROFILE } from "../mocks";

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export default function GreetingScreen() {
  const router = useRouter();
  const { profile, setProfile, setSchedule } = useVelaStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // In demo mode this resolves instantly to MOCK_PROFILE
        const p = await fetchProfile(MOCK_PROFILE.id);
        setProfile(p);
        const schedule = await fetchTodaySchedule(p.id);
        setSchedule(schedule.slots, schedule.allTaken);
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  const timeOfDay = getTimeOfDay();
  const senior = profile?.seniorName ?? "Friend";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Warm greeting — large, centered */}
        <View style={styles.greetingBlock}>
          <Text style={styles.timeLabel}>Good {timeOfDay}</Text>
          <Text style={styles.name}>{senior}.</Text>
          <View style={styles.divider} />
          <Text style={styles.subtext}>Let's see what's next for you today.</Text>
        </View>

        {/* Single action button */}
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push("/now")}
          accessibilityRole="button"
          accessibilityLabel="See today's medications"
        >
          <Text style={styles.buttonText}>See today's medications</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  greetingBlock: {
    flex: 1,
    justifyContent: "center",
  },
  timeLabel: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.accent,
    fontWeight: "600",
    marginBottom: theme.spacing.xs,
    textTransform: "capitalize",
  },
  name: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: "700",
    color: theme.colors.primary,
    lineHeight: 52,
  },
  divider: {
    width: 48,
    height: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.full,
    marginVertical: theme.spacing.md,
  },
  subtext: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textSecondary,
    lineHeight: 34,
    fontWeight: "400",
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.lg,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
    fontWeight: "700",
  },
});
