/**
 * Screen 5 — Done (End of Day)
 * "All done for today, Martha. Great job."
 * Cozy nighttime theme — deep navy, warm amber glow, stars.
 * This is what judges remember during deliberation.
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
import { useT } from "../i18n";

const { width } = Dimensions.get("window");

// Nighttime palette
const night = {
  bg: "#1B2838",        // deep navy
  bgLight: "#243447",   // slightly lighter navy for contrast
  text: "#F5EFE0",      // warm off-white
  textSoft: "#A8B5C4",  // muted blue-gray
  amber: "#E8A84C",     // warm amber glow
  amberSoft: "rgba(232, 168, 76, 0.12)",
  amberGlow: "rgba(232, 168, 76, 0.06)",
};

export default function DoneScreen() {
  const router = useRouter();
  const { profile } = useVelaStore();
  const senior = profile?.seniorName ?? "Friend";
  const t = useT();

  // Staggered entrance animations
  const glowScale = useRef(new Animated.Value(0.3)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(15)).current;
  const subFade = useRef(new Animated.Value(0)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;
  const starsFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(250, [
      // Stars twinkle in
      Animated.timing(starsFade, { toValue: 1, duration: 800, useNativeDriver: true }),
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
        {/* Decorative stars */}
        <Animated.View style={[styles.starsContainer, { opacity: starsFade }]}>
          <Text style={[styles.star, { top: "8%", left: "15%", fontSize: 10 }]}>✦</Text>
          <Text style={[styles.star, { top: "12%", right: "20%", fontSize: 14 }]}>✦</Text>
          <Text style={[styles.star, { top: "25%", left: "10%", fontSize: 8 }]}>✦</Text>
          <Text style={[styles.star, { top: "18%", right: "12%", fontSize: 6 }]}>✦</Text>
          <Text style={[styles.star, { top: "5%", left: "45%", fontSize: 12 }]}>✦</Text>
          <Text style={[styles.star, { top: "30%", right: "30%", fontSize: 7 }]}>✦</Text>
          <Text style={[styles.star, { bottom: "35%", left: "20%", fontSize: 9 }]}>✦</Text>
          <Text style={[styles.star, { bottom: "30%", right: "15%", fontSize: 11 }]}>✦</Text>
        </Animated.View>

        {/* Warm glow circle */}
        <Animated.View
          style={[
            styles.glowOuter,
            { opacity: glowOpacity, transform: [{ scale: glowScale }] },
          ]}
        >
          <View style={styles.glowInner} />
        </Animated.View>

        {/* Moon icon in amber circle */}
        <Animated.View
          style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}
        >
          <Text style={styles.moonIcon}>🌙</Text>
        </Animated.View>

        {/* Main message */}
        <Animated.View
          style={{
            opacity: textFade,
            transform: [{ translateY: textSlide }],
          }}
        >
          <Text style={styles.headline}>{t.allDoneForToday},</Text>
          <Text style={styles.name}>{senior}.</Text>
        </Animated.View>

        {/* Divider */}
        <Animated.View style={[styles.divider, { opacity: subFade }]} />

        {/* Subtext */}
        <Animated.View style={{ opacity: subFade }}>
          <Text style={styles.subtext}>
            {t.everyOneGreatJob}
          </Text>
          <Text style={styles.subtext2}>{t.getSomeRest}</Text>
        </Animated.View>
      </View>

      {/* Bottom */}
      <Animated.View style={[styles.bottom, { opacity: buttonFade }]}>
        <Pressable
          style={styles.resetLink}
          onPress={() => router.replace("/(tabs)/")}
          accessibilityLabel="Return to home"
        >
          <Text style={styles.resetText}>{t.backToHome}</Text>
        </Pressable>
        <View style={styles.brandRow}>
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
    backgroundColor: night.bg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  // Stars
  starsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: "absolute",
    color: night.amber,
    opacity: 0.5,
  },
  // Glow
  glowOuter: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: night.amberGlow,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
  },
  glowInner: {
    width: GLOW_SIZE * 0.6,
    height: GLOW_SIZE * 0.6,
    borderRadius: (GLOW_SIZE * 0.6) / 2,
    backgroundColor: night.amberSoft,
  },
  // Moon circle
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: night.amber,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    shadowColor: night.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  moonIcon: {
    fontSize: 36,
  },
  // Text
  headline: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.xl,
    color: night.text,
    textAlign: "center",
    lineHeight: 42,
  },
  name: {
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.fontSizes.hero,
    color: night.text,
    textAlign: "center",
    lineHeight: 60,
    letterSpacing: -0.5,
    marginBottom: theme.spacing.sm,
  },
  divider: {
    width: 64,
    height: 3,
    backgroundColor: night.amber,
    borderRadius: theme.radii.full,
    marginVertical: theme.spacing.md,
  },
  subtext: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.lg,
    color: night.textSoft,
    textAlign: "center",
    lineHeight: 34,
  },
  subtext2: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.md,
    color: night.textSoft,
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
    color: night.textSoft,
    fontSize: theme.fontSizes.sm,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    opacity: 0.4,
  },
  brandName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: night.amber,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
