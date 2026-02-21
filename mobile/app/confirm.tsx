/**
 * Screen 4 — Confirm
 * Shows Gemini's extracted medication data conversationally.
 * Also shows the InteractionCheck panel if warnings exist.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { checkInteractions, saveMedication } from "../api";
import { useVelaStore } from "../store/useVelaStore";
import type { ScannedMedication, InteractionWarning } from "../types";

const SEVERITY_COLORS: Record<string, string> = {
  MAJOR: theme.colors.danger,
  MODERATE: theme.colors.warning,
  MINOR: theme.colors.success,
};

export default function ConfirmScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();
  const { medications, profile } = useVelaStore();

  const scanned: ScannedMedication = data ? JSON.parse(data) : null;

  const [warnings, setWarnings] = useState<InteractionWarning[]>([]);
  const [scheduleNotes, setScheduleNotes] = useState<string | null>(null);
  const [safe, setSafe] = useState(true);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!scanned) return;
    const existing = medications.map((m) => m.name);
    if (existing.length === 0) return; // No existing meds, skip interaction check

    setCheckingInteractions(true);
    checkInteractions(existing, scanned.name)
      .then((result) => {
        setWarnings(result.warnings);
        setScheduleNotes(result.scheduleNotes);
        setSafe(result.safe);
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
        scanned,
        interactions: warnings,
        finalTimes: scanned.suggestedTimes,
      });
      router.replace("/now");
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
          <Text style={styles.errorText}>No scan data. Please go back and scan again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Conversational header */}
        <Text style={styles.heading}>We found this medication</Text>
        <View style={styles.extractCard}>
          <Text style={styles.medName}>{scanned.name}</Text>
          {scanned.brandName && (
            <Text style={styles.brandName}>({scanned.brandName})</Text>
          )}
          <Text style={styles.detail}>💊 {scanned.dosage}</Text>
          <Text style={styles.detail}>🕐 {scanned.frequency.replace("_", " ")} daily</Text>
          <Text style={styles.detail}>📋 {scanned.instructions}</Text>
          {scanned.color && (
            <Text style={styles.detail}>🔍 {scanned.color}</Text>
          )}
        </View>

        {/* Interaction check panel */}
        {checkingInteractions && (
          <View style={styles.interactionLoading}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.interactionLoadingText}>
              Checking interactions with current medications…
            </Text>
          </View>
        )}

        {!checkingInteractions && warnings.length > 0 && (
          <View style={styles.interactionPanel}>
            <Text style={styles.interactionTitle}>⚠️ Interaction Alert</Text>
            {warnings.map((w, i) => (
              <View key={i} style={styles.warningCard}>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: SEVERITY_COLORS[w.severity] },
                  ]}
                >
                  <Text style={styles.severityText}>{w.severity}</Text>
                </View>
                <Text style={styles.warningDrugs}>
                  {w.drugs[0]} + {w.drugs[1]}
                </Text>
                <Text style={styles.warningExplanation}>{w.explanation}</Text>
                <Text style={styles.warningRec}>{w.recommendation}</Text>
              </View>
            ))}
          </View>
        )}

        {scheduleNotes && (
          <View style={styles.scheduleNote}>
            <Text style={styles.scheduleNoteText}>📅 {scheduleNotes}</Text>
          </View>
        )}

        {!checkingInteractions && warnings.length === 0 && medications.length > 0 && (
          <View style={styles.safePanel}>
            <Text style={styles.safeText}>✓ No interactions found with current medications</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.confirmButton, pressed && styles.buttonPressed, saving && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.textOnPrimary} />
            ) : (
              <Text style={styles.confirmButtonText}>Yes, looks good ✓</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.fixButton, pressed && styles.buttonPressed]}
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
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  scroll: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  heading: {
    fontSize: theme.fontSizes.lg,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  extractCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  medName: {
    fontSize: theme.fontSizes.xl,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  brandName: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  detail: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
    lineHeight: 28,
  },
  interactionLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
  },
  interactionLoadingText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  interactionPanel: {
    marginBottom: theme.spacing.md,
  },
  interactionTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: "700",
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
  },
  warningCard: {
    backgroundColor: "#FFF5F5",
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  severityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
  },
  severityText: {
    color: "#FFFFFF",
    fontSize: theme.fontSizes.xs,
    fontWeight: "700",
  },
  warningDrugs: {
    fontSize: theme.fontSizes.md,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  warningExplanation: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  warningRec: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.accent,
    fontWeight: "600",
    fontStyle: "italic",
  },
  scheduleNote: {
    backgroundColor: "#FFF8F0",
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    marginBottom: theme.spacing.md,
  },
  scheduleNoteText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.accent,
    fontWeight: "500",
  },
  safePanel: {
    backgroundColor: "#F0FFF4",
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  safeText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.success,
    fontWeight: "600",
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.lg,
    alignItems: "center",
  },
  confirmButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
    fontWeight: "700",
  },
  fixButton: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    alignItems: "center",
  },
  fixButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.md,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
