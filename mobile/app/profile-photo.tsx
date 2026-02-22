import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { theme } from "../theme";
import { useVelaStore } from "../store/useVelaStore";
import { supabase } from "../lib/supabase";

export default function ProfilePhotoScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const { profile, setProfile } = useVelaStore();

  const handleCapture = async () => {
    if (!profile || !cameraRef.current || !cameraReady || saving) return;
    setSaving(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.45,
        base64: true,
        skipProcessing: false,
      });

      if (!photo?.base64) {
        throw new Error("Could not capture image.");
      }

      const dataUrl = `data:image/jpeg;base64,${photo.base64}`;
      const { error } = await supabase
        .from("profiles")
        .update({ senior_photo_url: dataUrl })
        .eq("id", profile.id);
      if (error) throw error;

      setProfile({ ...profile, seniorPhotoUrl: dataUrl });
      router.back();
    } catch (err: any) {
      Alert.alert("Upload failed", err?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.title}>Camera permission needed</Text>
          <Text style={styles.sub}>
            Allow camera access to capture and upload a senior profile photo.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => requestPermission()}>
            <Text style={styles.primaryButtonText}>Allow Camera</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Senior Photo</Text>
      </View>

      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          onCameraReady={() => setCameraReady(true)}
        />
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.captureButton,
            pressed && styles.capturePressed,
            (!cameraReady || saving) && styles.buttonDisabled,
          ]}
          onPress={handleCapture}
          disabled={!cameraReady || saving}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.textOnPrimary} />
          ) : (
            <Text style={styles.captureButtonText}>Capture & Upload</Text>
          )}
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
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.primary,
  },
  sub: {
    marginTop: 8,
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  backText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.accent,
    fontSize: theme.fontSizes.sm,
  },
  headerTitle: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
    fontSize: theme.fontSizes.md,
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  footer: {
    padding: theme.spacing.lg,
  },
  captureButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.xl,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  capturePressed: {
    backgroundColor: theme.colors.primaryLight,
    transform: [{ scale: 0.98 }],
  },
  captureButtonText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textOnPrimary,
  },
  primaryButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  primaryButtonText: {
    color: theme.colors.textOnPrimary,
    fontFamily: theme.fonts.semiBold,
  },
  secondaryButton: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
