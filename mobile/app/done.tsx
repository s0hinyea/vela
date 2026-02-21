/**
 * Screen 5 — Done (End of Day)
 * "All done for today, Martha. Great job."
 * Warm golden full-screen card. This is what judges remember.
 */
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Animated,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { useVelaStore } from "../store/useVelaStore";

const { width } = Dimensions.get("window");

export default function DoneScreen() {
  const router = useRouter();
  const { profile } = useVelaStore();
  const senior = profile?.seniorName ?? "Friend";

  // Staggered entrance animations
  const glowScale = useRef(new Animated.Value(0.3)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(15)).current;
  const subFade = useRef(new Animated.Value(0)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(250, [
      // Glow circle expands
      Animated.parallel([
        Animated.spring(glowScale, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      // Checkmark pops in
      Animated.spring(checkScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
      // Text slides up
      Animated.parallel([
        Animated.timing(textFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(textSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      // Subtext
      Animated.timing(subFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      // Button
      Animated.timing(buttonFade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Warm glow circle */}
        <Animated.View
          style={[
            styles.glowOuter,
            { opacity: glowOpacity, transform: [{ scale: glowScale }] },
          ]}
        >
          <View style={styles.glowInner} />
        </Animated.View>

        {/* Checkmark */}
        <Animated.View
          style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}
        >
          <Text style={styles.checkmark}>✓</Text>
        </Animated.View>

        {/* Main message */}
        <Animated.View
          style={{
            opacity: textFade,
            transform: [{ translateY: textSlide }],
          }}
        >
          <Text style={styles.headline}>All done for today,</Text>
          <Text style={styles.name}>{senior}.</Text>
        </Animated.View>

        {/* Divider */}
        <Animated.View style={[styles.divider, { opacity: subFade }]} />

        {/* Subtext */}
        <Animated.View style={{ opacity: subFade }}>
          <Text style={styles.subtext}>
            Every single one. You did great.
          </Text>
          <Text style={styles.subtext2}>Get some rest ✨</Text>
        </Animated.View>
      </View>

      {/* Bottom — vela branding + back link */}
      <Animated.View style={[styles.bottom, { opacity: buttonFade }]}>
        <Pressable
          style={styles.resetLink}
          onPress={() => router.replace("/")}
          accessibilityLabel="Return to home"
        >
          <Text style={styles.resetText}>← Back to home</Text>
        </Pressable>
        <View style={styles.brandRow}>
          <Text style={styles.brandIcon}>🕯️</Text>
          <Text style={styles.brandName}>Vela</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const GLOW_SIZE = width * 0.6;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF0DC", // warmer gold-cream
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  // Glow
  glowOuter: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: "rgba(212, 130, 42, 0.06)",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
  },
  glowInner: {
    width: GLOW_SIZE * 0.6,
    height: GLOW_SIZE * 0.6,
    borderRadius: (GLOW_SIZE * 0.6) / 2,
    backgroundColor: "rgba(212, 130, 42, 0.08)",
  },
  // Check
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  checkmark: {
    fontSize: 40,
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
  },
  // Text
  headline: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.primary,
    textAlign: "center",
    lineHeight: 42,
  },
  name: {
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.fontSizes.hero,
    color: theme.colors.primary,
    textAlign: "center",
    lineHeight: 60,
    letterSpacing: -0.5,
    marginBottom: theme.spacing.sm,
  },
  divider: {
    width: 64,
    height: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.full,
    marginVertical: theme.spacing.md,
  },
  subtext: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 34,
  },
  subtext2: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  // Bottom
  bottom: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  resetLink: {
    paddingVertical: theme.spacing.xs,
  },
  resetText: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.sm,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    opacity: 0.5,
  },
  brandIcon: { fontSize: 16 },
  brandName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
