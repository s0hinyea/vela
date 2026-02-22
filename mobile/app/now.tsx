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
import { useVoicePlayer } from "../hooks/useVoicePlayer";
import { useAuth } from "../hooks/useAuth";

export default function NowScreen() {
  const router = useRouter();
  const { currentSlot, todaySlots, allTaken, markTaken, profile, forceDue } = useVelaStore();
  const { signOut } = useAuth();
  const [logging, setLogging] = useState(false);
  const { play, stop, isPlaying } = useVoicePlayer();

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

  // No active slot right now — show today's progress
  if (!currentSlot) {
    const taken = todaySlots.filter((s) => s.status === "taken");
    const upcoming = todaySlots.filter((s) => s.status === "upcoming");

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Pressable style={styles.headerLeft} onLongPress={forceDue} delayLongPress={300}>
              <Text style={styles.headerTitle}>Vela</Text>
            </Pressable>
            {upcoming.length > 0 && (
              <View style={styles.pillCounter}>
                <Text style={styles.pillCounterText}>
                  {upcoming.length} upcoming
                </Text>
              </View>
            )}
          </View>
          <Pressable onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status message */}
          <View style={styles.caughtUpHeader}>
            <Text style={styles.caughtUpEmoji}>🌿</Text>
            <View>
              <Text style={styles.caughtUpTitle}>All caught up!</Text>
              <Text style={styles.caughtUpSub}>
                {upcoming.length > 0
                  ? `Next medication is later today`
                  : todaySlots.length > 0
                  ? "No more medications today"
                  : "Welcome to Vela"}
              </Text>
            </View>
          </View>

          {/* Empty state if nothing scheduled at all */}
          {todaySlots.length === 0 && (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateEmoji}>✨</Text>
              <Text style={styles.emptyStateTitle}>Your schedule is empty</Text>
              <Text style={styles.emptyStateSub}>
                Tap the button below to scan your first pill bottle or prescription label.
              </Text>
            </View>
          )}

          {/* Today's medication list */}
          {todaySlots.length > 0 && (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>Today's medications</Text>
              {todaySlots.map((slot) => (
                <View key={slot.id} style={styles.progressRow}>
                  <View
                    style={[
                      styles.statusDot,
                      slot.status === "taken" && styles.statusDotTaken,
                      slot.status === "upcoming" && styles.statusDotUpcoming,
                    ]}
                  >
                    {slot.status === "taken" && (
                      <Text style={styles.statusCheck}>✓</Text>
                    )}
                  </View>
                  <View style={styles.progressInfo}>
                    <Text
                      style={[
                        styles.progressMedName,
                        slot.status === "taken" && styles.progressMedNameTaken,
                      ]}
                    >
                      {slot.medicationName}
                    </Text>
                    <Text style={styles.progressMedDetail}>
                      {slot.dosage} · {slot.scheduledTimeLabel}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      slot.status === "taken" && styles.statusBadgeTaken,
                      slot.status === "upcoming" && styles.statusBadgeUpcoming,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        slot.status === "taken" && styles.statusBadgeTextTaken,
                        slot.status === "upcoming" && styles.statusBadgeTextUpcoming,
                      ]}
                    >
                      {slot.status === "taken" ? "Taken" : "Upcoming"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Add medication */}
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={() => router.push("/scan")}
          accessibilityRole="button"
          accessibilityLabel="Add a new medication"
        >
          <Text style={styles.addButtonText}>+ Add medication</Text>
        </Pressable>
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
        scheduledTime: currentSlot.scheduledTime,
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
        <View style={styles.headerTitleRow}>
          <Pressable style={styles.headerLeft} onLongPress={forceDue} delayLongPress={300}>
            <Text style={styles.headerTitle}>Vela</Text>
          </Pressable>
          <View style={styles.pillCounter}>
            <Text style={styles.pillCounterText}>{todaySlots.length} meds today</Text>
          </View>
        </View>
        <Pressable onPress={signOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
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
              isPlaying && styles.voiceButtonActive,
              pressed && styles.voiceButtonPressed,
            ]}
            onPress={() => {
              if (isPlaying) {
                stop();
              } else {
                play({
                  audioUrl: currentSlot.audioUrl,
                  fallbackText: `It's time to take your ${currentSlot.medicationName}, ${currentSlot.dosage}. ${currentSlot.instructions}.`,
                });
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Stop reminder" : "Hear reminder"}
          >
            <Text style={styles.voiceButtonIcon}>{isPlaying ? "⏹" : "🔊"}</Text>
            <Text style={styles.voiceButtonText}>
              {isPlaying ? "Stop" : "Hear reminder"}
            </Text>
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
        style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        onPress={() => router.push("/scan")}
        accessibilityRole="button"
        accessibilityLabel="Add a new medication"
      >
        <Text style={styles.addButtonText}>+ Add medication</Text>
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
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
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
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.accent,
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  signOutText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  cardWrapper: {
    flex: 1,
    paddingHorizontal: 32,
    backgroundColor: theme.colors.surface,
  },
  // Caught up state
  caughtUpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.successSoft,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  caughtUpEmoji: { fontSize: 32 },
  caughtUpTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.md,
    color: theme.colors.primary,
  },
  caughtUpSub: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  // Empty State
  emptyStateCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderStyle: "dashed",
    marginTop: theme.spacing.lg,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyStateTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  emptyStateSub: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
  // Progress list
  progressSection: {
    gap: theme.spacing.sm,
  },
  progressLabel: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  statusDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  statusDotTaken: {
    backgroundColor: theme.colors.success,
  },
  statusDotUpcoming: {
    backgroundColor: theme.colors.borderLight,
  },
  statusCheck: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: theme.fonts.bold,
  },
  progressInfo: {
    flex: 1,
  },
  progressMedName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  progressMedNameTaken: {
    color: theme.colors.textSecondary,
  },
  progressMedDetail: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.border,
  },
  statusBadgeTaken: {
    backgroundColor: theme.colors.successSoft,
  },
  statusBadgeUpcoming: {
    backgroundColor: theme.colors.accentSoft,
  },
  statusBadgeText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statusBadgeTextTaken: {
    color: theme.colors.success,
  },
  statusBadgeTextUpcoming: {
    color: theme.colors.accent,
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
  voiceButtonActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
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
  // Add button
  addButton: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.xl,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    alignItems: "center",
    backgroundColor: theme.colors.accentSoft,
  },
  addButtonPressed: {
    backgroundColor: theme.colors.accent,
    transform: [{ scale: 0.97 }],
  },
  addButtonText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.accent,
    fontSize: theme.fontSizes.md,
  },
});
