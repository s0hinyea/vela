/**
 * Screen — Welcome
 * Branded landing page. Sign Up or Sign In.
 */
import React, { useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { VelaAvatar } from "../components/VelaAvatar";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();

  const fadeBrand = useRef(new Animated.Value(0)).current;
  const fadeTagline = useRef(new Animated.Value(0)).current;
  const fadeButtons = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;
  const avatarDrop = useRef(new Animated.Value(-56)).current;
  const avatarOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.parallel([
        Animated.timing(avatarOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(120),
          Animated.spring(avatarDrop, { toValue: 0, tension: 36, friction: 14, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(300),
        Animated.stagger(180, [
          Animated.timing(fadeBrand, { toValue: 1, duration: 450, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(fadeTagline, { toValue: 1, duration: 420, useNativeDriver: true }),
            Animated.timing(slideUp, { toValue: 0, duration: 420, useNativeDriver: true }),
          ]),
          Animated.timing(fadeButtons, { toValue: 1, duration: 360, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, [avatarDrop, avatarOpacity, fadeBrand, fadeButtons, fadeTagline, slideUp]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Glow circle */}
        <View style={styles.glowCircle} />

        {/* Brand */}
        <Animated.View style={[styles.brandBlock, { opacity: fadeBrand }]}>
          <Text style={styles.brandName}>Vela</Text>
          <View style={styles.divider} />
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={{ opacity: fadeTagline, transform: [{ translateY: slideUp }] }}
        >
          <Text style={styles.tagline}>
            A warm, guiding light for daily medication.
          </Text>
        </Animated.View>

        {/* Avatar anchor between tagline and CTA buttons */}
        <Animated.View
          style={[
            styles.avatarAnchor,
            {
              opacity: avatarOpacity,
              transform: [{ translateY: avatarDrop }],
            },
          ]}
        >
          <VelaAvatar />
        </Animated.View>
      </View>

      {/* Buttons */}
      <Animated.View style={[styles.buttons, { opacity: fadeButtons }]}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => router.push("/signup")}
        >
          <Text style={styles.primaryButtonText}>Get started</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}
          onPress={() => router.push("/signin")}
        >
          <Text style={styles.secondaryButtonText}>I have an account</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const GLOW_SIZE = width * 0.5;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  glowCircle: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: "rgba(212, 130, 42, 0.06)",
    position: "absolute",
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  brandName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 64,
    color: theme.colors.accent,
    letterSpacing: -1,
  },
  divider: {
    width: 48,
    height: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.full,
    marginTop: theme.spacing.sm,
  },
  tagline: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 36,
  },
  avatarAnchor: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  buttons: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.xl,
    alignItems: "center",
    ...theme.shadows.card,
  },
  primaryButtonText: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.xl,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.md,
  },
  pressed: {
    backgroundColor: theme.colors.accentLight,
    transform: [{ scale: 0.97 }],
  },
  secondaryPressed: {
    backgroundColor: theme.colors.surfaceWarm,
    transform: [{ scale: 0.97 }],
  },
});
