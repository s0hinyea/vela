/**
 * Screen 1 — Greeting
 * Full-screen warm greeting. Senior's name, time of day, one button.
 * Feels like opening a warm letter — not a medical app.
 */
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { useVelaStore } from "../store/useVelaStore";
import { fetchProfile, fetchTodaySchedule } from "../api";
import { MOCK_PROFILE } from "../mocks";

function getTimeOfDay(): { label: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { label: "morning", emoji: "🌅" };
  if (hour < 17) return { label: "afternoon", emoji: "☀️" };
  return { label: "evening", emoji: "🌙" };
}

export default function GreetingScreen() {
  const router = useRouter();
  const { profile, setProfile, setSchedule } = useVelaStore();
  const [loading, setLoading] = useState(true);

  // Staggered fade-in animations
  const fadeGreeting = useRef(new Animated.Value(0)).current;
  const fadeName = useRef(new Animated.Value(0)).current;
  const fadeSub = useRef(new Animated.Value(0)).current;
  const fadeButton = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    async function load() {
      try {
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

  useEffect(() => {
    if (!loading) {
      Animated.stagger(200, [
        Animated.timing(fadeGreeting, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(fadeName, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
        Animated.timing(fadeSub, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(fadeButton, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingCandle}>🕯️</Text>
          <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  const { label, emoji } = getTimeOfDay();
  const senior = profile?.seniorName ?? "Friend";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Top — Vela branding */}
        <View style={styles.brandRow}>
          <Text style={styles.brandIcon}>🕯️</Text>
          <Text style={styles.brandName}>Vela</Text>
        </View>

        {/* Center — greeting */}
        <View style={styles.greetingBlock}>
          <Animated.Text style={[styles.timeLabel, { opacity: fadeGreeting }]}>
            Good {label} {emoji}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.name,
              { opacity: fadeName, transform: [{ translateY: slideUp }] },
            ]}
          >
            {senior}.
          </Animated.Text>
          <Animated.View style={[styles.divider, { opacity: fadeSub }]} />
          <Animated.Text style={[styles.subtext, { opacity: fadeSub }]}>
            Let's see what's next for you today.
          </Animated.Text>
        </View>

        {/* Bottom — CTA */}
        <Animated.View style={{ opacity: fadeButton }}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/now")}
            accessibilityRole="button"
            accessibilityLabel="See today's medications"
          >
            <Text style={styles.buttonText}>See today's medications</Text>
            <Text style={styles.buttonArrow}>→</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCandle: {
    fontSize: 48,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  // Branding
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  brandIcon: {
    fontSize: 24,
  },
  brandName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  // Greeting
  greetingBlock: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: theme.spacing.xl,
  },
  timeLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.md,
    color: theme.colors.accent,
    marginBottom: theme.spacing.sm,
  },
  name: {
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.fontSizes.hero,
    color: theme.colors.primary,
    lineHeight: 60,
    letterSpacing: -0.5,
  },
  divider: {
    width: 48,
    height: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.full,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  subtext: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textSecondary,
    lineHeight: 36,
  },
  // Button
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  buttonPressed: {
    backgroundColor: theme.colors.primaryLight,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
  },
  buttonArrow: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
  },
});
