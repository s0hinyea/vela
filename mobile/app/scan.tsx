/**
 * Screen 3 — Scan
 * Caregiver scans a pill bottle label.
 * Dark camera mode with warm amber accents — the demo's wow entry point.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { scanLabel } from "../api";

export default function ScanScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [scanning, setScanning] = useState(false);

  // Viewfinder pulse animation
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Manual entry fields
  const [manualName, setManualName] = useState("");
  const [manualDosage, setManualDosage] = useState("");
  const [manualInstructions, setManualInstructions] = useState("");

  const handleSimulateScan = async () => {
    setScanning(true);
    try {
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

  if (mode === "manual") {
    return (
      <SafeAreaView style={styles.manualContainer}>
        <View style={styles.manualForm}>
          {/* Back to camera */}
          <Pressable onPress={() => setMode("camera")} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Use camera</Text>
          </Pressable>

          <Text style={styles.formTitle}>Enter medication details</Text>
          <Text style={styles.formSub}>
            Can't scan the label? No problem — type it in.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Medication name</Text>
            <TextInput
              style={styles.input}
              value={manualName}
              onChangeText={setManualName}
              placeholder="e.g. Metformin"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Dosage</Text>
            <TextInput
              style={styles.input}
              value={manualDosage}
              onChangeText={setManualDosage}
              placeholder="e.g. 500mg"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Instructions (optional)</Text>
            <TextInput
              style={styles.input}
              value={manualInstructions}
              onChangeText={setManualInstructions}
              placeholder="e.g. Take with food"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleManualSubmit}
          >
            <Text style={styles.submitButtonText}>Continue →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <SafeAreaView style={styles.cameraInner}>
        {/* Top — back + title */}
        <View style={styles.cameraHeader}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.cameraBackText}>← Back</Text>
          </Pressable>
          <Text style={styles.cameraTitle}>Scan Label</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Center — viewfinder */}
        <View style={styles.viewfinderArea}>
          <Animated.View
            style={[styles.viewfinder, { transform: [{ scale: pulse }] }]}
          >
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </Animated.View>
          <Text style={styles.viewfinderHint}>
            Position the pill bottle label inside the frame
          </Text>
        </View>

        {/* Bottom — actions */}
        <View style={styles.cameraBottom}>
          <Pressable
            style={({ pressed }) => [
              styles.captureButton,
              pressed && styles.captureButtonPressed,
              scanning && styles.buttonDisabled,
            ]}
            onPress={handleSimulateScan}
            disabled={scanning}
          >
            {scanning ? (
              <View style={styles.captureInner}>
                <ActivityIndicator color={theme.colors.accent} />
                <Text style={styles.captureTextScanning}>Reading label…</Text>
              </View>
            ) : (
              <View style={styles.captureInner}>
                <View style={styles.captureCircle} />
                <Text style={styles.captureText}>Capture</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => setMode("manual")}
            style={styles.manualLink}
          >
            <Text style={styles.manualLinkText}>Type it instead →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  // Camera mode
  cameraContainer: {
    flex: 1,
    backgroundColor: "#111111",
  },
  cameraInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  cameraHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  cameraBackText: {
    fontFamily: theme.fonts.medium,
    color: "#FFFFFF",
    fontSize: theme.fontSizes.sm,
    opacity: 0.8,
  },
  cameraTitle: {
    fontFamily: theme.fonts.semiBold,
    color: "#FFFFFF",
    fontSize: theme.fontSizes.md,
  },
  viewfinderArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  viewfinder: {
    width: "90%",
    aspectRatio: 2.2,
    borderRadius: theme.radii.md,
    position: "relative",
    marginBottom: theme.spacing.md,
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: theme.colors.accent,
    borderTopLeftRadius: theme.radii.sm,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: theme.colors.accent,
    borderTopRightRadius: theme.radii.sm,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: theme.colors.accent,
    borderBottomLeftRadius: theme.radii.sm,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: theme.colors.accent,
    borderBottomRightRadius: theme.radii.sm,
  },
  viewfinderHint: {
    fontFamily: theme.fonts.regular,
    color: "#FFFFFF",
    fontSize: theme.fontSizes.sm,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 22,
  },
  cameraBottom: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
    alignItems: "center",
  },
  captureButton: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: theme.radii.xl,
    paddingVertical: theme.spacing.md,
  },
  captureButtonPressed: {
    backgroundColor: "rgba(212,130,42,0.15)",
    transform: [{ scale: 0.97 }],
  },
  captureInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  captureCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.accent,
  },
  captureText: {
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
    fontSize: theme.fontSizes.lg,
  },
  captureTextScanning: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.accent,
    fontSize: theme.fontSizes.md,
  },
  manualLink: {
    paddingVertical: theme.spacing.xs,
  },
  manualLinkText: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.accent,
    fontSize: theme.fontSizes.sm,
    opacity: 0.9,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonPressed: {
    backgroundColor: theme.colors.primaryLight,
    transform: [{ scale: 0.97 }],
  },
  // Manual mode
  manualContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  manualForm: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  backLink: {
    marginBottom: theme.spacing.md,
  },
  backLinkText: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.accent,
    fontSize: theme.fontSizes.sm,
  },
  formTitle: {
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  formSub: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  fieldGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.xl,
    alignItems: "center",
    marginTop: theme.spacing.sm,
    ...theme.shadows.card,
  },
  submitButtonText: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
  },
});
