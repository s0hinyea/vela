/**
 * Screen 3 — Scan
 * Caregiver scans a pill bottle label. Camera with warm overlay.
 * For now uses a placeholder — camera integration comes after foundation.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { scanLabel } from "../api";
import { useVelaStore } from "../store/useVelaStore";

export default function ScanScreen() {
  const router = useRouter();
  const store = useVelaStore();

  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [scanning, setScanning] = useState(false);

  // Manual entry fields
  const [manualName, setManualName] = useState("");
  const [manualDosage, setManualDosage] = useState("");
  const [manualInstructions, setManualInstructions] = useState("");

  const handleSimulateScan = async () => {
    setScanning(true);
    try {
      // In demo mode this returns MOCK_SCAN_RESULT after 1.5s
      const result = await scanLabel("mock-image-base64");
      router.push({ pathname: "/confirm", params: { data: JSON.stringify(result) } });
    } catch {
      Alert.alert("Scan failed", "Couldn't read the label. Try typing it instead.");
    } finally {
      setScanning(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualName.trim() || !manualDosage.trim()) {
      Alert.alert("Required", "Please enter at least a medication name and dosage.");
      return;
    }
    const manualData = {
      name: manualName.trim(),
      brandName: null,
      dosage: manualDosage.trim(),
      form: "tablet" as const,
      frequency: "once" as const,
      suggestedTimes: ["08:00"],
      instructions: manualInstructions.trim() || "As directed",
      color: null,
      confidence: 1,
      rawLabelText: "",
    };
    router.push({ pathname: "/confirm", params: { data: JSON.stringify(manualData) } });
  };

  return (
    <SafeAreaView style={styles.container}>
      {mode === "camera" ? (
        <View style={styles.cameraView}>
          {/* Camera placeholder — amber overlay */}
          <View style={styles.overlay}>
            <View style={styles.viewfinder} />
            <Text style={styles.overlayText}>
              Slowly pan over the pill bottle label
            </Text>
          </View>

          {/* Scan trigger */}
          <View style={styles.cameraActions}>
            <Pressable
              style={({ pressed }) => [styles.scanButton, pressed && styles.buttonPressed]}
              onPress={handleSimulateScan}
              disabled={scanning}
            >
              {scanning ? (
                <ActivityIndicator color={theme.colors.textOnPrimary} />
              ) : (
                <Text style={styles.scanButtonText}>📸  Capture label</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setMode("manual")} style={styles.manualLink}>
              <Text style={styles.manualLinkText}>Type it instead →</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        /* Manual entry */
        <View style={styles.manualForm}>
          <Text style={styles.formTitle}>Enter medication details</Text>

          <Text style={styles.label}>Medication name *</Text>
          <TextInput
            style={styles.input}
            value={manualName}
            onChangeText={setManualName}
            placeholder="e.g. Metformin"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Dosage *</Text>
          <TextInput
            style={styles.input}
            value={manualDosage}
            onChangeText={setManualDosage}
            placeholder="e.g. 500mg"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <Text style={styles.label}>Instructions</Text>
          <TextInput
            style={styles.input}
            value={manualInstructions}
            onChangeText={setManualInstructions}
            placeholder="e.g. Take with food"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <View style={styles.formActions}>
            <Pressable
              style={({ pressed }) => [styles.submitButton, pressed && styles.buttonPressed]}
              onPress={handleManualSubmit}
            >
              <Text style={styles.submitButtonText}>Continue →</Text>
            </Pressable>
            <Pressable onPress={() => setMode("camera")} style={styles.manualLink}>
              <Text style={styles.manualLinkText}>← Use camera instead</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A", // dark for camera mode
  },
  cameraView: {
    flex: 1,
    justifyContent: "space-between",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  viewfinder: {
    width: "85%",
    aspectRatio: 2.5,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.lg,
  },
  overlayText: {
    color: "#FFFFFF",
    fontSize: theme.fontSizes.md,
    textAlign: "center",
    opacity: 0.85,
  },
  cameraActions: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  scanButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.lg,
    alignItems: "center",
  },
  scanButtonText: {
    color: "#FFFFFF",
    fontSize: theme.fontSizes.lg,
    fontWeight: "700",
  },
  manualLink: {
    alignItems: "center",
    paddingVertical: theme.spacing.xs,
  },
  manualLinkText: {
    color: theme.colors.accent,
    fontSize: theme.fontSizes.sm,
    fontWeight: "500",
  },
  // Manual form
  manualForm: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  formTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSizes.sm,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  formActions: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.lg,
    alignItems: "center",
  },
  submitButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
