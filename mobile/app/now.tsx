/**
 * Screen 2 — Now Card
 * The heart of Vela. One medication, one button, nothing else.
 * Feels like a calm, warm card — not a medical dashboard.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { useVelaStore } from "../store/useVelaStore";
import { logDose } from "../api";

export default function NowScreen() {
  const router = useRouter();
  const { currentSlot, todaySlots, allTaken, markTaken, profile } = useVelaStore();
  const [logging, setLogging] = useState(false);

  // Card entrance animation
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [currentSlot?.id]);

  // If everything is done → End of Day
  if (allTaken) {
    router.replace("/done");
    return null;
  }

  // No active slot right now
  if (!currentSlot) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brandIcon}>🕯️</Text>
          <Text style={styles.headerTitle}>Vela</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.noSlotEmoji}>🌿</Text>
          <Text style={styles.noSlotTitle}>All caught up!</Text>
          <Text style={styles.noSlotSub}>
            No medications due right now.{"\n"}Check back later.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleTaken = async () => {
    if (!profile) return;
    setLogging(true);
    try {
      await logDose({
        doseSlotId: currentSlot.id,
        profileId: profile.id,
        medicationId: currentSlot.medicationId,
        takenAt: new Date().toISOString(),
      });
      markTaken(currentSlot.id);
    } catch (e) {
      console.error("Failed to log dose", e);
    } finally {
      setLogging(false);
    }
  };

  // Count remaining doses
  const remaining = todaySlots.filter(
    (s) => s.status === "due" || s.status === "upcoming"
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.brandIcon}>🕯️</Text>
          <Text style={styles.headerTitle}>Vela</Text>
        </View>
        <View style={styles.pillCounter}>
          <Text style={styles.pillCounterText}>
            {remaining} remaining today
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Time badge */}
        <View style={styles.timeBadge}>
          <Text style={styles.timeBadgeText}>
            ⏰ {currentSlot.scheduledTimeLabel}
          </Text>
        </View>

        {/* Main Card */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          {/* Amber accent strip at top of card */}
          <View style={styles.cardAccent} />

          <View style={styles.cardContent}>
            <Text style={styles.medicationName}>
              {currentSlot.medicationName}
            </Text>
            <Text style={styles.dosage}>{currentSlot.dosage}</Text>

            <View style={styles.instructionRow}>
              <Text style={styles.instructionIcon}>💡</Text>
              <Text style={styles.instructions}>
                {currentSlot.instructions}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.takenButton,
              pressed && styles.takenButtonPressed,
              logging && styles.buttonDisabled,
            ]}
            onPress={handleTaken}
            disabled={logging}
            accessibilityRole="button"
            accessibilityLabel="I took it"
          >
            {logging ? (
              <ActivityIndicator color={theme.colors.textOnPrimary} />
            ) : (
              <>
                <Text style={styles.takenButtonText}>I took it</Text>
                <Text style={styles.takenCheck}>✓</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.voiceButton,
              pressed && styles.voiceButtonPressed,
            ]}
            onPress={() => {
              // Voice playback — placeholder for ElevenLabs
            }}
            accessibilityRole="button"
            accessibilityLabel="Hear reminder"
          >
            <Text style={styles.voiceButtonIcon}>🔊</Text>
            <Text style={styles.voiceButtonText}>Hear reminder</Text>
          </Pressable>
        </View>

        {/* Timeline — small dots showing today's progress */}
        <View style={styles.timeline}>
          {todaySlots.map((slot) => (
            <View key={slot.id} style={styles.timelineDot}>
              <View
                style={[
                  styles.dot,
                  slot.status === "taken" && styles.dotTaken,
                  slot.status === "due" && styles.dotDue,
                  slot.status === "upcoming" && styles.dotUpcoming,
                ]}
              />
              <Text
                style={[
                  styles.timelineName,
                  slot.status === "taken" && styles.timelineNameTaken,
                ]}
                numberOfLines={1}
              >
                {slot.medicationName}
              </Text>
              <Text style={styles.timelineTime}>{slot.scheduledTimeLabel}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add medication — caregiver access */}
      <Pressable
        style={styles.addLink}
        onPress={() => router.push("/scan")}
        accessibilityRole="button"
        accessibilityLabel="Add a new medication"
      >
        <Text style={styles.addLinkText}>+ Add medication</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  brandIcon: { fontSize: 22 },
  headerTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  pillCounter: {
    backgroundColor: theme.colors.accentSoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
  },
  pillCounterText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.accent,
  },
  // Empty state
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  noSlotEmoji: { fontSize: 56, marginBottom: theme.spacing.md },
  noSlotTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  noSlotSub: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 28,
  },
  // Scroll
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  // Time badge
  timeBadge: {
    alignSelf: "center",
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
  },
  timeBadgeText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.accent,
  },
  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  cardAccent: {
    height: 5,
    backgroundColor: theme.colors.accent,
  },
  cardContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  medicationName: {
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.primary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  dosage: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.accent,
    marginBottom: theme.spacing.md,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
  },
  instructionIcon: { fontSize: 18, marginTop: 2 },
  instructions: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    lineHeight: 28,
    flex: 1,
  },
  // Actions
  actions: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  takenButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  takenButtonPressed: {
    backgroundColor: theme.colors.primaryLight,
    transform: [{ scale: 0.97 }],
  },
  takenButtonText: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
  },
  takenCheck: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
  },
  voiceButton: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: "transparent",
  },
  voiceButtonPressed: {
    backgroundColor: theme.colors.accentSoft,
    transform: [{ scale: 0.97 }],
  },
  voiceButtonIcon: { fontSize: 20 },
  voiceButtonText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary,
    fontSize: theme.fontSizes.md,
  },
  buttonDisabled: { opacity: 0.6 },
  // Timeline
  timeline: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  timelineDot: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.border,
    marginBottom: 4,
  },
  dotTaken: { backgroundColor: theme.colors.success },
  dotDue: { backgroundColor: theme.colors.accent },
  dotUpcoming: { backgroundColor: theme.colors.borderLight },
  timelineName: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  timelineNameTaken: {
    textDecorationLine: "line-through",
    color: theme.colors.success,
  },
  timelineTime: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  // Add link
  addLink: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  addLinkText: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.sm,
  },
});
