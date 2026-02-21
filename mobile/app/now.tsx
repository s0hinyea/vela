/**
 * Screen 2 — Now Card
 * The heart of Vela. One medication. One button. Nothing else.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { useVelaStore } from "../store/useVelaStore";
import { logDose } from "../api";
import { MOCK_PROFILE } from "../mocks";

export default function NowScreen() {
  const router = useRouter();
  const { currentSlot, allTaken, markTaken, profile } = useVelaStore();
  const [logging, setLogging] = useState(false);

  // If everything is done, navigate to the End of Day screen
  if (allTaken) {
    router.replace("/done");
    return null;
  }

  // No active slot right now — all upcoming
  if (!currentSlot) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.noSlotEmoji}>🌿</Text>
          <Text style={styles.noSlotTitle}>All caught up!</Text>
          <Text style={styles.noSlotSub}>
            No medications due right now. Check back later.
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Time label */}
        <Text style={styles.timeLabel}>{currentSlot.scheduledTimeLabel}</Text>

        {/* Main card */}
        <View style={styles.card}>
          <Text style={styles.medicationName}>{currentSlot.medicationName}</Text>
          <Text style={styles.dosage}>{currentSlot.dosage}</Text>
          <View style={styles.divider} />
          <Text style={styles.instructions}>{currentSlot.instructions}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.takenButton,
              pressed && styles.buttonPressed,
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
              <Text style={styles.takenButtonText}>I took it ✓</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.voiceButton, pressed && styles.buttonPressed]}
            onPress={() => {
              // Voice playback — audioUrl from DoseSlot if cached, else speak
              // Person B will populate audioUrl at integration
            }}
            accessibilityRole="button"
            accessibilityLabel="Hear reminder"
          >
            <Text style={styles.voiceButtonText}>🔊  Hear reminder</Text>
          </Pressable>
        </View>

        {/* Add Medication link (caregiver) */}
        <Pressable
          style={styles.addLink}
          onPress={() => router.push("/scan")}
          accessibilityRole="button"
          accessibilityLabel="Add a new medication"
        >
          <Text style={styles.addLinkText}>+ Add medication</Text>
        </Pressable>
      </View>
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
  noSlotEmoji: {
    fontSize: 56,
    marginBottom: theme.spacing.md,
  },
  noSlotTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  noSlotSub: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 28,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    justifyContent: "space-between",
  },
  timeLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.accent,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  medicationName: {
    fontSize: theme.fontSizes.xl,
    fontWeight: "800",
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  dosage: {
    fontSize: theme.fontSizes.lg,
    fontWeight: "600",
    color: theme.colors.accent,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  instructions: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    lineHeight: 28,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  takenButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.lg,
    alignItems: "center",
  },
  takenButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
    fontWeight: "700",
  },
  voiceButton: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    alignItems: "center",
  },
  voiceButtonText: {
    color: theme.colors.primary,
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
  addLink: {
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  addLinkText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.sm,
    fontWeight: "500",
  },
});
