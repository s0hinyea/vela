/**
 * Screen 3 — Scan
 * Live camera feed with warm amber overlay.
 * Caregiver pans across the pill bottle label, captures, sends to Gemini.
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
  Dimensions,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { CameraView, useCameraPermissions } from "expo-camera";
import DateTimePicker from "@react-native-community/datetimepicker";
import { theme } from "../theme";
import { scanLabel } from "../api";

const { width: SCREEN_W } = Dimensions.get("window");

export default function ScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [scanning, setScanning] = useState(false);

  // Viewfinder pulse animation
  const pulse = useRef(new Animated.Value(1)).current;
  // Scanning progress bar
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.02, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Manual entry fields
  const [manualName, setManualName] = useState("");
  const [manualDosage, setManualDosage] = useState("");
  const [manualInstructions, setManualInstructions] = useState("");
  const [manualFrequency, setManualFrequency] = useState(1);
  const [manualTimes, setManualTimes] = useState<Date[]>([
    new Date(new Date().setHours(8, 0, 0, 0)),
  ]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default: +30 days
  );

  // Keep manualTimes array in sync with frequency selection
  const handleFrequencyChange = (count: number) => {
    setManualFrequency(count);
    const defaults = [8, 12, 18, 22]; // Sensible default hours
    const newTimes: Date[] = [];
    for (let i = 0; i < count; i++) {
      if (manualTimes[i]) {
        newTimes.push(manualTimes[i]); // Keep existing time if set
      } else {
        const d = new Date();
        d.setHours(defaults[i] ?? 8 + i * 4, 0, 0, 0);
        newTimes.push(d);
      }
    }
    setManualTimes(newTimes);
  };

  const updateManualTime = (index: number, newDate: Date) => {
    const updated = [...manualTimes];
    updated[index] = newDate;
    setManualTimes(updated);
  };

  // Format Date to backend HH:MM (24h)
  const formatTo24Hour = (d: Date) => {
    return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady) return;
    setScanning(true);

    // Animate progress bar
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    try {
      // Take the picture — get base64 for Gemini
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
        skipProcessing: false,
      });

      if (!photo || !photo.base64) {
        throw new Error("No image captured");
      }

      // Send base64 to scan API (mock or real)
      const result = await scanLabel(photo.base64);
      router.push({ pathname: "/confirm", params: { data: JSON.stringify(result) } });
    } catch (e: any) {
      console.error("Scan error:", e);
      Alert.alert(
        "Couldn't read label",
        "Please try again or type the medication details manually.",
        [
          { text: "Try again", style: "cancel" },
          { text: "Type instead", onPress: () => setMode("manual") },
        ]
      );
    } finally {
      setScanning(false);
      progress.setValue(0);
    }
  };

  const handleManualSubmit = () => {
    if (!manualName.trim() || !manualDosage.trim()) {
      Alert.alert("Required", "Please enter at least a medication name and dosage.");
      return;
    }
    const freqMap = ["once", "twice", "three_times", "four_times"] as const;
    const manualData = {
      name: manualName.trim(),
      brandName: null,
      dosage: manualDosage.trim(),
      form: "tablet" as const,
      frequency: freqMap[manualFrequency - 1],
      suggestedTimes: manualTimes.map(formatTo24Hour),
      instructions: manualInstructions.trim() || "As directed",
      color: null,
      confidence: 1,
      rawLabelText: "Manual entry",
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    };
    router.push({ pathname: "/confirm", params: { data: JSON.stringify(manualData) } });
  };

  // ─── Manual entry mode ────────────────────────────────────────────────────
  if (mode === "manual") {
    return (
      <SafeAreaView style={styles.manualContainer}>
        <ScrollView
          style={styles.manualForm}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => setMode("camera")} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Use camera</Text>
          </Pressable>

          <Text style={styles.formTitle}>Enter medication details</Text>
          <Text style={styles.formSub}>
            Can't scan the label? No problem — type it in.
          </Text>

          {/* 1. Medication Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Medication name</Text>
            <TextInput
              style={styles.input}
              value={manualName}
              onChangeText={(t) => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setManualName(t);
              }}
              placeholder="e.g. Metformin"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="words"
            />
          </View>

          {/* 2. Dosage (shows when Name is non-empty) */}
          {manualName.trim().length > 0 && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Dosage</Text>
              <TextInput
                style={styles.input}
                value={manualDosage}
                onChangeText={(t) => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setManualDosage(t);
                }}
                placeholder="e.g. 500mg"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          )}

          {/* 3. The Rest (shows when Name and Dosage are non-empty) */}
          {manualName.trim().length > 0 && manualDosage.trim().length > 0 && (
            <>
              {/* ── Frequency Picker ── */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>How many times per day?</Text>
                <View style={styles.freqRow}>
                  {[1, 2, 3, 4].map((n) => (
                    <Pressable
                      key={n}
                      style={[
                        styles.freqChip,
                        manualFrequency === n && styles.freqChipActive,
                      ]}
                      onPress={() => handleFrequencyChange(n)}
                    >
                      <Text
                        style={[
                          styles.freqChipText,
                          manualFrequency === n && styles.freqChipTextActive,
                        ]}
                      >
                        {n}×
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* ── Time Slots ── */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {manualFrequency === 1 ? "Dose time" : `Dose times (${manualFrequency})`}
                </Text>
                {manualTimes.map((t, i) => (
                  <View key={i} style={styles.timePickerContainer}>
                    <Text style={styles.timeSlotLabel}>Dose {i + 1}</Text>
                    <DateTimePicker
                      value={t}
                      mode="time"
                      display="default"
                      onChange={(event, date) => {
                        if (date) updateManualTime(i, date);
                      }}
                      themeVariant="light"
                    />
                  </View>
                ))}
              </View>

              {/* ── Date Range ── */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Start date</Text>
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      if (date) setStartDate(date);
                    }}
                    themeVariant="light"
                  />
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>End date</Text>
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    minimumDate={startDate}
                    onChange={(event, date) => {
                      if (date) setEndDate(date);
                    }}
                    themeVariant="light"
                  />
                </View>
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
                style={({ pressed }) => [styles.submitButton, pressed && styles.pressedGeneric]}
                onPress={handleManualSubmit}
              >
                <Text style={styles.submitButtonText}>Continue →</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Permission not yet granted ───────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            Vela uses your camera to read pill bottle labels. No photos are stored on your device.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.permissionButton, pressed && styles.pressedGeneric]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Allow camera access</Text>
          </Pressable>
          <Pressable onPress={() => setMode("manual")} style={styles.manualLink}>
            <Text style={styles.manualLinkText}>Enter manually instead →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Camera mode ──────────────────────────────────────────────────────────
  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.cameraContainer}>
      {/* Live camera feed */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
      />

      {/* Overlay on top of camera */}
      <SafeAreaView style={styles.cameraOverlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.topBarText}>← Back</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>Scan label</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Center — viewfinder */}
        <View style={styles.viewfinderArea}>
          <Animated.View style={[styles.viewfinder, { transform: [{ scale: pulse }] }]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </Animated.View>

          <Text style={styles.viewfinderHint}>
            Position the pill bottle label inside the frame
          </Text>
        </View>

        {/* Bottom — progress bar + actions */}
        <View style={styles.bottomArea}>
          {/* Progress bar (visible when scanning) */}
          {scanning && (
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.captureButton,
              pressed && styles.captureButtonPressed,
              (!cameraReady || scanning) && styles.buttonDisabled,
            ]}
            onPress={handleCapture}
            disabled={!cameraReady || scanning}
          >
            {scanning ? (
              <View style={styles.captureInner}>
                <ActivityIndicator color={theme.colors.accent} />
                <Text style={styles.captureTextScanning}>Reading label…</Text>
              </View>
            ) : (
              <View style={styles.captureInner}>
                {/* Camera shutter circle */}
                <View style={styles.shutterOuter}>
                  <View style={styles.shutterInner} />
                </View>
                <Text style={styles.captureText}>Capture</Text>
              </View>
            )}
          </Pressable>

          <Pressable onPress={() => setMode("manual")} style={styles.manualLink}>
            <Text style={styles.manualLinkText}>Type it instead →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  // Camera
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  topBarText: {
    fontFamily: theme.fonts.medium,
    color: "#FFF",
    fontSize: theme.fontSizes.sm,
    opacity: 0.85,
  },
  topBarTitle: {
    fontFamily: theme.fonts.semiBold,
    color: "#FFF",
    fontSize: theme.fontSizes.md,
  },
  // Viewfinder
  viewfinderArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
  },
  viewfinder: {
    width: SCREEN_W * 0.85,
    aspectRatio: 2,
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
    top: 0, left: 0,
    borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderColor: theme.colors.accent,
    borderTopLeftRadius: theme.radii.sm,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderColor: theme.colors.accent,
    borderTopRightRadius: theme.radii.sm,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderColor: theme.colors.accent,
    borderBottomLeftRadius: theme.radii.sm,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderColor: theme.colors.accent,
    borderBottomRightRadius: theme.radii.sm,
  },
  viewfinderHint: {
    fontFamily: theme.fonts.regular,
    color: "#FFF",
    fontSize: theme.fontSizes.sm,
    textAlign: "center",
    lineHeight: 22,
  },
  // Bottom
  bottomArea: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
    alignItems: "center",
  },
  // Progress bar
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  // Capture button
  captureButton: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
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
  shutterOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  shutterInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.accent,
  },
  captureText: {
    fontFamily: theme.fonts.bold,
    color: "#FFF",
    fontSize: theme.fontSizes.lg,
  },
  captureTextScanning: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.accent,
    fontSize: theme.fontSizes.md,
  },
  manualLink: { paddingVertical: theme.spacing.xs },
  manualLinkText: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.accent,
    fontSize: theme.fontSizes.sm,
    opacity: 0.9,
  },
  buttonDisabled: { opacity: 0.5 },
  pressedGeneric: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  // Permission screen
  permissionContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionContent: {
    paddingHorizontal: theme.spacing.lg,
    alignItems: "center",
  },
  permissionEmoji: { fontSize: 64, marginBottom: theme.spacing.lg },
  permissionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  permissionBody: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: theme.spacing.lg,
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radii.xl,
    ...theme.shadows.card,
  },
  permissionButtonText: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
  },
  // Manual form
  manualContainer: { flex: 1, backgroundColor: theme.colors.background },
  manualForm: { flex: 1, padding: theme.spacing.lg },
  backLink: { marginBottom: theme.spacing.md },
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
  fieldGroup: { marginBottom: theme.spacing.md },
  label: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
  },
  timePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  timeSlotLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    minWidth: 55,
  },
  freqRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  freqChip: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
  },
  freqChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  freqChipText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
  },
  freqChipTextActive: {
    color: theme.colors.textOnPrimary,
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
