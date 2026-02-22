/**
 * Screen 2 — Now Card
 * The heart of Vela. One medication, one button, nothing else.
 * Feels like a calm, warm card — not a medical dashboard.
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../theme";
import { useVelaStore } from "../../store/useVelaStore";
import { useVoicePlayer } from "../../hooks/useVoicePlayer";
import { useNotifications } from "../../hooks/useNotifications";
import { MOCK_PROFILE, DEMO_MODE } from "../../mocks";
import { logDose, fetchMedications, fetchTodaySchedule } from "../../api";
import { useT } from "../../i18n";
import { PulsingVelaOverlay } from "../../components/PulsingVelaOverlay";

export default function NowScreen() {
  const router = useRouter();
  const { currentSlot, todaySlots, allTaken, markTaken, profile, forceDue, setSchedule, setMedications } = useVelaStore();
  const [logging, setLogging] = useState(false);
  const { play, stop, isPlaying } = useVoicePlayer();
  const { simulateNextReminder } = useNotifications(play);
  const t = useT();

  // Real-time clock for the front page
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateString = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  // Card entrance animation
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  // Refresh functionality
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!profile) return;
    setRefreshing(true);
    try {
      const meds = await fetchMedications(profile.id);
      setMedications(meds);
      const schedule = await fetchTodaySchedule(profile.id);
      setSchedule(schedule.slots, schedule.allTaken);
    } catch (e) {
      console.error("Failed to refresh schedule:", e);
    } finally {
      setRefreshing(false);
    }
  }, [profile?.id, setMedications, setSchedule]);

  // Refetch schedule when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [currentSlot?.id]);

  const getStatusLabel = (status: string) => {
    if (status === "taken") return t.taken;
    if (status === "missed") return "Missed";
    if (status === "due") return "Due now";
    return t.upcoming;
  };

  // If everything is done → Render an inline "Done" card instead of redirecting
  if (allTaken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Vela</Text>
          </View>
          <View style={styles.headerDateRow}>
            <Text style={styles.headerDate}>{dateString}</Text>
            <Text style={styles.headerTime}>{timeString}</Text>
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: theme.spacing.xl }}>
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateEmoji}>🌙</Text>
            <Text style={styles.emptyStateTitle}>{t.allDoneForToday}</Text>
            <Text style={styles.emptyStateSub}>
              {t.greatJobAllMeds}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: theme.spacing.xl, marginBottom: 40 }}>
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed, { backgroundColor: theme.colors.surface, borderWidth: 2, borderColor: theme.colors.border }]}
            onPress={() => router.push("/scan")}
          >
            <Text style={[styles.addButtonText, { color: theme.colors.textPrimary }]}>{t.addNewMedication}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // No slots at all — empty state (brand new user)
  if (!currentSlot) {
    const upcoming = todaySlots.filter((s) => s.status === "upcoming");
    const missed = todaySlots.filter((s) => s.status === "missed");

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Vela</Text>
          </View>
          <View style={styles.headerDateRow}>
            <Text style={styles.headerDate}>{dateString}</Text>
            <Text style={styles.headerTime}>{timeString}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* Status message */}
          <View style={styles.caughtUpHeader}>
            <Text style={styles.caughtUpEmoji}>🌿</Text>
            <View>
              <Text style={styles.caughtUpTitle}>{t.allCaughtUp}</Text>
              <Text style={styles.caughtUpSub}>
                {missed.length > 0
                  ? "Some doses were missed earlier today"
                  : upcoming.length > 0
                  ? t.nextMedLater
                  : todaySlots.length > 0
                    ? t.noMoreMedsToday
                    : t.welcomeToVela}
              </Text>
            </View>
          </View>

          {/* Empty state if nothing scheduled at all */}
          {todaySlots.length === 0 && (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateEmoji}>✨</Text>
              <Text style={styles.emptyStateTitle}>{t.scheduleEmpty}</Text>
              <Text style={styles.emptyStateSub}>
                {t.scanFirstBottle}
              </Text>
            </View>
          )}

          {/* Today's medication list */}
          {todaySlots.length > 0 && (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>{t.todaysMeds}</Text>
              {todaySlots.map((slot) => (
                <View key={slot.id} style={styles.progressRow}>
                  <View
                    style={[
                      styles.statusDot,
                      slot.status === "taken" && styles.statusDotTaken,
                      slot.status === "due" && styles.statusDotDue,
                      slot.status === "missed" && styles.statusDotMissed,
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
                      slot.status === "due" && styles.statusBadgeDue,
                      slot.status === "missed" && styles.statusBadgeMissed,
                      slot.status === "upcoming" && styles.statusBadgeUpcoming,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        slot.status === "taken" && styles.statusBadgeTextTaken,
                        slot.status === "due" && styles.statusBadgeTextDue,
                        slot.status === "missed" && styles.statusBadgeTextMissed,
                        slot.status === "upcoming" && styles.statusBadgeTextUpcoming,
                      ]}
                    >
                      {getStatusLabel(slot.status)}
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
          <Text style={styles.addButtonText}>{t.addMedication}</Text>
        </Pressable>

        {/* Demo: simulate reminder */}
        <Pressable
          style={styles.simulateButton}
          onPress={() => {
            const id = DEMO_MODE ? MOCK_PROFILE.id : profile?.id;
            if (id) simulateNextReminder(id);
          }}
        >
          <Text style={styles.simulateText}>Simulate reminder</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const handleTaken = async () => {
    if (!profile || !currentSlot) return;
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

      // If this was the last one, transition to the Night screen
      const remaining = todaySlots.filter(
        (s) => s.status === "due" || s.status === "upcoming"
      ).length;
      const hasMissed = todaySlots.some((s) => s.status === "missed");

      if (remaining === 1) { // 1 before we mark it taken, meaning 0 after
        if (!hasMissed) {
          router.push("/done");
        }
      }
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
      <PulsingVelaOverlay isPulsing={isPlaying} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Pressable style={styles.headerLeft} onLongPress={forceDue} delayLongPress={300}>
            <Text style={styles.headerTitle}>Vela</Text>
          </Pressable>
        </View>
        <View style={styles.headerDateRow}>
          <Text style={styles.headerDate}>{dateString}</Text>
          <Text style={styles.headerTime}>{timeString}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
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
              <View style={{ flex: 1 }}>
                <Text style={styles.instructions}>
                  {currentSlot.instructionsTranslated ?? currentSlot.instructions}
                </Text>
                {currentSlot.instructionsTranslated && (
                  <Text style={styles.instructionsEnglish}>
                    {currentSlot.instructions}
                  </Text>
                )}
              </View>
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
                <Text style={styles.takenButtonText}>{t.iTookIt}</Text>
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
                const preferredLang = profile?.preferredLanguage ?? "en";
                const spokenText = currentSlot.instructionsTranslated
                  ? `${currentSlot.medicationName}, ${currentSlot.dosage}. ${currentSlot.instructionsTranslated}`
                  : `It's time to take your ${currentSlot.medicationName}, ${currentSlot.dosage}. ${currentSlot.instructions}.`;
                play({
                  audioUrl: currentSlot.audioUrl,
                  fallbackText: spokenText,
                  language: preferredLang,
                });
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Stop reminder" : "Hear reminder"}
          >
            <Text style={styles.voiceButtonIcon}>{isPlaying ? "⏹" : "🔊"}</Text>
            <Text style={styles.voiceButtonText}>
              {isPlaying ? t.stop : t.hearReminder}
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
                  slot.status === "missed" && styles.dotMissed,
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
        <Text style={styles.addButtonText}>{t.addMedication}</Text>
      </Pressable>

      {/* Demo: simulate reminder */}
      <Pressable
        style={styles.simulateButton}
        onPress={() => {
          const id = DEMO_MODE ? MOCK_PROFILE.id : profile?.id;
          if (id) simulateNextReminder(id);
        }}
      >
        <Text style={styles.simulateText}>Simulate reminder</Text>
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
  headerDateRow: {
    alignItems: "flex-end",
  },
  headerDate: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  headerTime: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textPrimary,
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
  statusDotDue: {
    backgroundColor: theme.colors.accent,
  },
  statusDotMissed: {
    backgroundColor: theme.colors.danger,
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
  statusBadgeDue: {
    backgroundColor: theme.colors.accentSoft,
  },
  statusBadgeMissed: {
    backgroundColor: theme.colors.dangerSoft,
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
  statusBadgeTextDue: {
    color: theme.colors.accent,
  },
  statusBadgeTextMissed: {
    color: theme.colors.danger,
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
  instructionsEnglish: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    opacity: 0.6,
    marginTop: 4,
    fontStyle: "italic",
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
  dotMissed: { backgroundColor: theme.colors.danger },
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
  simulateButton: {
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: theme.spacing.sm,
    opacity: 0.3,
  },
  simulateText: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
