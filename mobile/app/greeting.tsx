/**
 * Screen 1 — Greeting
 * Full-screen warm greeting. Senior's name, time of day, one button.
 * Feels like opening a warm letter — not a medical app.
 */
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { useVelaStore } from "../store/useVelaStore";
import { useAuth } from "../hooks/useAuth";
import { useT } from "../i18n";

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export default function GreetingScreen() {
  const router = useRouter();
  const { profile } = useVelaStore();
  const { signOut } = useAuth();
  const t = useT();

  // Staggered fade-in animations
  const fadeGreeting = useRef(new Animated.Value(0)).current;
  const fadeName = useRef(new Animated.Value(0)).current;
  const fadeSub = useRef(new Animated.Value(0)).current;
  const fadeButton = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;
  const avatarScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    fadeGreeting.setValue(0);
    fadeName.setValue(0);
    fadeSub.setValue(0);
    fadeButton.setValue(0);
    slideUp.setValue(20);
    avatarScale.setValue(0.8);

    const entry = Animated.stagger(180, [
      Animated.timing(fadeGreeting, { toValue: 1, duration: 560, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeName, { toValue: 1, duration: 620, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 620, useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(avatarScale, {
            toValue: 1.08,
            tension: 100,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(avatarScale, {
            toValue: 1,
            tension: 90,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.timing(fadeSub, { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.timing(fadeButton, { toValue: 1, duration: 360, useNativeDriver: true }),
    ]);

    entry.start();
    return () => entry.stop();
  }, [avatarScale, fadeButton, fadeGreeting, fadeName, fadeSub, slideUp]);

  const timeOfDay = getTimeOfDay();
  const senior = profile?.seniorName ?? "Friend";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Top — Vela branding and Sign Out */}
        <View style={styles.header}>
          <Pressable
            style={styles.brandRow}
            onLongPress={() => router.push("/done")}
            delayLongPress={300}
          >
            <Text style={styles.brandName}>Vela</Text>
          </Pressable>
          <Pressable onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        {/* Center — greeting */}
        <View style={styles.greetingBlock}>
          <Animated.Text style={[styles.timeLabel, { opacity: fadeGreeting }]}>
            {timeOfDay === "morning" ? t.goodMorning : timeOfDay === "afternoon" ? t.goodAfternoon : t.goodEvening}
          </Animated.Text>
          <Animated.View
            style={[
              styles.nameRow,
              { opacity: fadeName, transform: [{ translateY: slideUp }] },
            ]}
          >
            <Text style={styles.name}>{senior}.</Text>
            <Animated.View style={[styles.velaAvatarWrapSmall, { transform: [{ scale: avatarScale }] }]}>
              <View style={styles.velaFlameSmall}>
                <View style={styles.velaFlameCoreSmall} />
              </View>
              <View style={styles.velaFaceSmall}>
                <View style={styles.velaEyeSmall} />
                <View style={styles.velaEyeSmall} />
              </View>
            </Animated.View>
          </Animated.View>
          <Animated.View style={[styles.divider, { opacity: fadeSub }]} />
          <Animated.Text style={[styles.subtext, { opacity: fadeSub }]}>
            {t.letsSeeWhatsNext}
          </Animated.Text>
        </View>

        {/* Bottom — CTA */}
        <Animated.View style={{ opacity: fadeButton }}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.replace("/(tabs)")}
            accessibilityRole="button"
            accessibilityLabel="See today's medications"
          >
            <Text style={styles.buttonText}>{t.seeTodaysMeds}</Text>
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
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  signOutText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  // Greeting
  greetingBlock: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: theme.spacing.xl,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.sm,
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
    paddingVertical: theme.spacing.sm,
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
    fontSize: theme.fontSizes.md,
  },
  buttonArrow: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
  },
  velaAvatarWrapSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  velaFlameSmall: {
    width: 21,
    height: 24,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 6,
    backgroundColor: theme.colors.accent,
    transform: [{ rotate: "8deg" }],
  },
  velaFlameCoreSmall: {
    width: 8,
    height: 9,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
    position: "absolute",
    top: 9,
    left: 6,
  },
  velaFaceSmall: {
    position: "absolute",
    top: 28,
    flexDirection: "row",
    gap: 3,
  },
  velaEyeSmall: {
    width: 4,
    height: 4,
    borderRadius: 2.5,
    backgroundColor: theme.colors.primary,
  },
});
