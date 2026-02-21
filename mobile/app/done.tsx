/**
 * Screen 5 — Done (End of Day)
 * Warm golden full-screen card. "All done for today, Martha."
 * This is what judges remember during deliberation.
 */
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Animated,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { useVelaStore } from "../store/useVelaStore";

export default function DoneScreen() {
  const router = useRouter();
  const { profile } = useVelaStore();
  const senior = profile?.seniorName ?? "Friend";

  // Warm fade-in animation
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        {/* Golden glow circle */}
        <View style={styles.glowCircle} />

        {/* Main message */}
        <Text style={styles.checkmark}>✓</Text>
        <Text style={styles.headline}>All done for today,</Text>
        <Text style={styles.name}>{senior}.</Text>
        <View style={styles.divider} />
        <Text style={styles.subtext}>Great job. Every single one.</Text>
        <Text style={styles.subtext2}>Get some rest. ✨</Text>
      </Animated.View>

      {/* Subtle restart link — hidden from senior, accessible to caregiver */}
      <Pressable
        style={styles.resetLink}
        onPress={() => router.replace("/")}
        accessibilityLabel="Return to home"
      >
        <Text style={styles.resetText}>← Back to home</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF0DC", // warmer gold-cream for the end-of-day feel
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  glowCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.accent,
    opacity: 0.12,
    position: "absolute",
  },
  checkmark: {
    fontSize: 72,
    color: theme.colors.accent,
    fontWeight: "900",
    marginBottom: theme.spacing.md,
  },
  headline: {
    fontSize: theme.fontSizes.xl,
    fontWeight: "700",
    color: theme.colors.primary,
    textAlign: "center",
    lineHeight: 42,
  },
  name: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: "800",
    color: theme.colors.primary,
    textAlign: "center",
    lineHeight: 54,
    marginBottom: theme.spacing.md,
  },
  divider: {
    width: 64,
    height: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.full,
    marginBottom: theme.spacing.lg,
  },
  subtext: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 34,
  },
  subtext2: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  resetLink: {
    alignItems: "center",
    paddingBottom: theme.spacing.xl,
  },
  resetText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.sm,
  },
});
