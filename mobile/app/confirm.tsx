/**
 * Screen 4 — Confirm
 * Conversational display of Gemini's extracted data + interaction check.
 * The AI wow moment of the demo.
 */
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  TextInput,
} from "react-native";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { theme } from "../theme";
import { checkInteractions, saveMedication } from "../api";
import { useVelaStore } from "../store/useVelaStore";
import type { ScannedMedication, InteractionWarning } from "../types";

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  MAJOR: { color: theme.colors.danger, bg: theme.colors.dangerSoft, icon: "🔴" },
  MODERATE: { color: theme.colors.warning, bg: "rgba(255,152,0,0.08)", icon: "🟡" },
  MINOR: { color: theme.colors.success, bg: theme.colors.successSoft, icon: "🟢" },
};

export default function ConfirmScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();
  const { medications, profile } = useVelaStore();

  const scanned: ScannedMedication | null = data ? JSON.parse(data) : null;

  // Local state for name and dosage so they can be edited to re-trigger checks
  const [editableName, setEditableName] = useState(scanned?.name || "");
  const [editableDosage, setEditableDosage] = useState(scanned?.dosage || "");

  const [warnings, setWarnings] = useState<InteractionWarning[]>([]);
  const [scheduleNotes, setScheduleNotes] = useState<string | null>(null);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [editableInstructions, setEditableInstructions] = useState(scanned?.instructions || "");
  const [editableTimes, setEditableTimes] = useState<string[]>(scanned?.suggestedTimes || []);

  const updateTime = (index: number, val: string) => {
    const newTimes = [...editableTimes];
    newTimes[index] = val;
    setEditableTimes(newTimes);
  };

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const warningFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!scanned) return;
    const existing = medications.map((m) => m.name);
    if (existing.length === 0) return;

    setCheckingInteractions(true);
    checkInteractions(existing, scanned.name)
      .then((result) => {
        setWarnings(result.warnings);
        setScheduleNotes(result.scheduleNotes);
        // Animate warnings in
        Animated.timing(warningFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      })
      .catch(console.error)
      .finally(() => setCheckingInteractions(false));
  }, []);

  const handleConfirm = async () => {
    if (!scanned || !profile) return;
    setSaving(true);
    try {
      await saveMedication({
        profileId: profile.id,
        scanned: { ...scanned, instructions: editableInstructions },
        interactions: warnings,
        finalTimes: editableTimes.filter(t => t.trim().length > 0), // Filter out empties
      });
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "Could not save medication. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!scanned) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            No scan data. Please go back and try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Confidence display
  const confidencePercent = Math.round(scanned.confidence * 100);
  const confidenceColor =
    confidencePercent >= 90
      ? theme.colors.success
      : confidencePercent >= 70
      ? theme.colors.warning
      : theme.colors.danger;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back link */}
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Back to scan</Text>
        </Pressable>

        {/* Conversational header */}
        <Animated.View style={[styles.headerBlock, { opacity: fadeIn }]}>
          <Text style={styles.heading}>We found this medication</Text>
          <Text style={styles.headingSub}>
            Please confirm the details are correct.
          </Text>
        </Animated.View>

        {/* Extracted data card */}
        <Animated.View style={[styles.extractCard, { opacity: fadeIn }]}>
          {/* Confidence badge */}
          <View style={styles.confidenceRow}>
            <View
              style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}
            >
              <Text style={styles.confidenceText}>
                {confidencePercent}% confident
              </Text>
            </View>
          </View>

          <TextInput
            style={styles.medNameInput}
            value={editableName}
            onChangeText={setEditableName}
            placeholder="Medication Name"
            placeholderTextColor={theme.colors.textSecondary}
          />
          {scanned.brandName && (
            <Text style={styles.brandName}>{scanned.brandName}</Text>
          )}

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>💊</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Dosage (Tap to edit)</Text>
                <TextInput
                  style={styles.inlineInput}
                  value={editableDosage}
                  onChangeText={setEditableDosage}
                  placeholder="e.g. 10mg"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>🕐</Text>
              <View>
                <Text style={styles.detailLabel}>Frequency</Text>
                <Text style={styles.detailValue}>
                  {scanned.frequency.replace("_", " ")} daily
                </Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📋</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Instructions (Tap to edit)</Text>
                <TextInput
                  style={styles.inlineInput}
                  value={editableInstructions}
                  onChangeText={setEditableInstructions}
                  multiline
                />
              </View>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>⏰</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Scheduled Times (Tap to edit)</Text>
                {editableTimes.map((t, i) => (
                  <View key={i} style={styles.timeInputRow}>
                    <TextInput
                      style={styles.timeInput}
                      value={t}
                      onChangeText={(val) => updateTime(i, val)}
                      placeholder="HH:MM"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                ))}
              </View>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>⏰</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.timesHeader}>
                  <Text style={styles.detailLabel}>Scheduled Times</Text>
                  <View style={styles.timesActions}>
                    {editableTimes.length > 1 && (
                      <Pressable
                        onPress={() => removeTimeSlot(editableTimes.length - 1)}
                        style={styles.timeActionBtn}
                      >
                        <Text style={styles.timeActionText}>−</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={addTimeSlot} style={styles.timeActionBtn}>
                      <Text style={styles.timeActionText}>+</Text>
                    </Pressable>
                  </View>
                </View>
                {editableTimes.map((t, i) => (
                  <View key={i} style={styles.timeInputRow}>
                    <Text style={styles.timeSlotLabel}>Dose {i + 1}</Text>
                    <DateTimePicker
                      value={t}
                      mode="time"
                      display="default"
                      onChange={(event, date) => {
                        if (date) updateTime(i, date);
                      }}
                      themeVariant="light"
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Hidden by default until "Show more" is tapped */}
            {showMoreDetails ? (
              <>
                {/* Date range */}
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>📅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Start Date</Text>
                    <DateTimePicker
                      value={editStartDate}
                      mode="date"
                      display="default"
                      onChange={(e, d) => { if (d) setEditStartDate(d); }}
                      themeVariant="light"
                    />
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>📅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>End Date</Text>
                    <DateTimePicker
                      value={editEndDate}
                      mode="date"
                      display="default"
                      minimumDate={editStartDate}
                      onChange={(e, d) => { if (d) setEditEndDate(d); }}
                      themeVariant="light"
                    />
                  </View>
                </View>
                {scanned.color && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>🔍</Text>
                    <View>
                      <Text style={styles.detailLabel}>Appearance</Text>
                      <Text style={styles.detailValue}>{scanned.color}</Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <Pressable
                style={styles.showMoreBtn}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowMoreDetails(true);
                }}
              >
                <Text style={styles.showMoreBtnText}>Review Dates / Appearance ↓</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Dosage warning */}
        {dosageWarning && (
          <View style={styles.dosageWarningCard}>
            <Text style={styles.dosageWarningIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.dosageWarningTitle}>Dosage Alert</Text>
              <Text style={styles.dosageWarningText}>{dosageWarning}</Text>
            </View>
          </View>
        )}

        {/* Interaction check */}
        {checkingInteractions && (
          <View style={styles.checkingCard}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
            <View>
              <Text style={styles.checkingTitle}>
                Checking interactions & dosage…
              </Text>
              <Text style={styles.checkingBody}>
                Comparing with {medications.length} current medication
                {medications.length > 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        )}

        {!checkingInteractions && warnings.length > 0 && (
          <Animated.View style={{ opacity: warningFade }}>
            <View style={styles.warningHeader}>
              <Text style={styles.warningTitle}>⚠️ Interaction Alert</Text>
            </View>
            {warnings.map((w, i) => {
              const config = SEVERITY_CONFIG[w.severity];
              return (
                <View
                  key={i}
                  style={[styles.warningCard, { borderColor: config.color, backgroundColor: config.bg }]}
                >
                  <View style={styles.warningTop}>
                    <Text style={styles.warningIcon}>{config.icon}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: config.color }]}>
                      <Text style={styles.severityText}>{w.severity}</Text>
                    </View>
                  </View>
                  <Text style={styles.warningDrugs}>
                    {w.drugs[0]} + {w.drugs[1]}
                  </Text>
                  <Text style={styles.warningExplanation}>{w.explanation}</Text>
                  <View style={styles.recRow}>
                    <Text style={styles.recIcon}>👨‍⚕️</Text>
                    <Text style={styles.warningRec}>{w.recommendation}</Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {scheduleNotes && (
          <View style={styles.scheduleNote}>
            <Text style={styles.scheduleNoteIcon}>📅</Text>
            <Text style={styles.scheduleNoteText}>{scheduleNotes}</Text>
          </View>
        )}

        {!checkingInteractions && warnings.length === 0 && medications.length > 0 && (
          <View style={styles.safePanel}>
            <Text style={styles.safeIcon}>✓</Text>
            <Text style={styles.safeText}>
              No interactions found with current medications
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.confirmButton,
              pressed && styles.confirmButtonPressed,
              saving && styles.buttonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.textOnPrimary} />
            ) : (
              <>
                <Text style={styles.confirmButtonText}>Yes, looks good</Text>
                <Text style={styles.confirmCheck}>✓</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.fixButton,
              pressed && styles.fixButtonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.fixButtonText}>Fix something</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  errorText: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  scroll: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  // Back link
  backLink: { marginBottom: theme.spacing.md },
  backLinkText: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.accent,
    fontSize: theme.fontSizes.sm,
  },
  // Header
  headerBlock: { marginBottom: theme.spacing.md },
  heading: {
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  headingSub: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  // Extract card
  extractCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  confidenceRow: {
    flexDirection: "row",
    marginBottom: theme.spacing.sm,
  },
  confidenceBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
  },
  confidenceText: {
    fontFamily: theme.fonts.semiBold,
    color: "#FFFFFF",
    fontSize: 12,
  },
  medNameInput: {
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.primary,
    letterSpacing: -0.3,
    padding: 0,
    marginBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  brandName: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  detailsGrid: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
  },
  detailIcon: { fontSize: 18, marginTop: 2 },
  detailLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  inlineInput: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.xs,
  },
  timeInputRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    flexWrap: "wrap",
  },
  timeInput: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: 90,
    textAlign: "center",
  },
  // Interaction checking
  checkingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radii.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  checkingTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
  },
  checkingBody: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  // Warnings
  warningHeader: { marginBottom: theme.spacing.sm },
  warningTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.danger,
  },
  warningCard: {
    borderWidth: 1.5,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  warningTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  warningIcon: { fontSize: 16 },
  severityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  severityText: {
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  warningDrugs: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
  },
  warningExplanation: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  recRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.xs,
    marginTop: 4,
  },
  recIcon: { fontSize: 16, marginTop: 1 },
  warningRec: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.accent,
    flex: 1,
    fontStyle: "italic",
    lineHeight: 22,
  },
  // Schedule note
  scheduleNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    marginBottom: theme.spacing.md,
  },
  scheduleNoteIcon: { fontSize: 18, marginTop: 2 },
  scheduleNoteText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.accent,
    flex: 1,
  },
  // Safe panel
  safePanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.successSoft,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  safeIcon: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.success,
    fontSize: theme.fontSizes.lg,
  },
  safeText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.success,
    flex: 1,
  },
  // Actions
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  confirmButtonPressed: {
    backgroundColor: theme.colors.primaryLight,
    transform: [{ scale: 0.97 }],
  },
  confirmButtonText: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
  },
  confirmCheck: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
  },
  fixButton: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.xl,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  fixButtonPressed: {
    backgroundColor: theme.colors.surfaceWarm,
    transform: [{ scale: 0.97 }],
  },
  fixButtonText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.md,
  },
  buttonDisabled: { opacity: 0.6 },
});
