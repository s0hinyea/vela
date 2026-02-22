import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { theme } from "../theme";
import { useVelaStore } from "../store/useVelaStore";
import { supabase } from "../lib/supabase";

type PickerAsset = {
  base64?: string | null;
  mimeType?: string | null;
  uri: string;
};

type PickerResult = {
  canceled: boolean;
  assets?: PickerAsset[];
};

type ImagePickerModule = {
  MediaTypeOptions: { Images: string | number };
  requestMediaLibraryPermissionsAsync: () => Promise<{ granted: boolean }>;
  launchImageLibraryAsync: (options: Record<string, unknown>) => Promise<PickerResult>;
};

function getImagePicker(): ImagePickerModule | null {
  try {
    // Use dynamic require so app stays stable even before dependency install.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-image-picker") as ImagePickerModule;
  } catch {
    return null;
  }
}

export default function ProfilePhotoScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const { profile, setProfile } = useVelaStore();

  const handlePickAndUpload = async () => {
    if (!profile || saving) return;
    const ImagePicker = getImagePicker();
    if (!ImagePicker) {
      Alert.alert(
        "Image Picker Missing",
        "Install expo-image-picker, then restart the app."
      );
      return;
    }

    setSaving(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow photo library access to choose a profile photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.45,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        throw new Error("Could not read selected image.");
      }

      setPreviewUri(asset.uri);
      const mimeType = asset.mimeType || "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${asset.base64}`;
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Senior Photo</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.previewWrap}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.previewPlaceholderText}>Choose from photo library</Text>
            </View>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.pickButton,
            pressed && styles.pickPressed,
            saving && styles.buttonDisabled,
          ]}
          onPress={handlePickAndUpload}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.textOnPrimary} />
          ) : (
            <Text style={styles.pickButtonText}>Pick & Upload Photo</Text>
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
  body: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    justifyContent: "center",
    gap: theme.spacing.lg,
  },
  previewWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surface,
  },
  previewPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
  },
  previewPlaceholderText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  pickButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.xl,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pickPressed: {
    backgroundColor: theme.colors.primaryLight,
    transform: [{ scale: 0.98 }],
  },
  pickButtonText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textOnPrimary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
