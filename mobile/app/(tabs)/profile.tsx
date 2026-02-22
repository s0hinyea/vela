/**
 * Profile Tab — Settings, medication list, and account management.
 * Warm and clean, consistent with Vela's design language.
 */
import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { theme } from "../../theme";
import { useVelaStore } from "../../store/useVelaStore";
import { useAuth } from "../../hooks/useAuth";
import { fetchMedications, deleteMedication, updateLanguage } from "../../api";
import type { Medication } from "../../types";
import { supabase } from "../../lib/supabase";

const LANGUAGES = [
  { code: "en", flag: "🇺🇸", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "zh", flag: "🇨🇳", label: "中文" },
  { code: "hi", flag: "🇮🇳", label: "हिन्दी" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "ar", flag: "🇸🇦", label: "العربية" },
  { code: "pt", flag: "🇧🇷", label: "Português" },
  { code: "ko", flag: "🇰🇷", label: "한국어" },
  { code: "ja", flag: "🇯🇵", label: "日本語" },
  { code: "vi", flag: "🇻🇳", label: "Tiếng Việt" },
  { code: "tl", flag: "🇵🇭", label: "Tagalog" },
  { code: "ru", flag: "🇷🇺", label: "Русский" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, medications, setMedications, setProfile } = useVelaStore();
  const { user, signOut } = useAuth();
  const seniorName = profile?.seniorName ?? "Friend";
  const caregiverName = profile?.caregiverName ?? "Caregiver";
  const [selectedLanguage, setSelectedLanguage] = useState(
    profile?.preferredLanguage ?? "en"
  );
  const [savingLang, setSavingLang] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Sync dropdown with profile when it loads asynchronously
  useEffect(() => {
    if (profile?.preferredLanguage) {
      setSelectedLanguage(profile.preferredLanguage);
    }
  }, [profile?.preferredLanguage]);

  // Track whether the user has changed the language (unsaved)
  const savedLanguage = profile?.preferredLanguage ?? "en";
  const hasUnsavedChange = selectedLanguage !== savedLanguage;

  // Refresh medications when this tab is focused
  useFocusEffect(
    useCallback(() => {
      async function refresh() {
        if (!profile) return;
        try {
          const meds = await fetchMedications(profile.id);
          setMedications(meds);
        } catch (e) {
          console.error("Failed to refresh medications:", e);
        }
      }
      refresh();
    }, [profile?.id])
  );

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  };

  const handleDelete = (med: Medication) => {
    Alert.alert(
      "Remove medication?",
      `Are you sure you want to remove ${med.name} from your schedule? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            // Optimistic update
            const prev = [...medications];
            setMedications(medications.filter((m) => m.id !== med.id));
            try {
              await deleteMedication(med.id);
            } catch (e) {
              console.error("Failed to delete", e);
              // Revert on failure
              setMedications(prev);
              Alert.alert("Error", "Could not remove medication. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleOptions = (med: Medication) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Edit Medication", "Remove from schedule"],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            router.push({
              pathname: "/edit-medication",
              params: { data: JSON.stringify(med), id: med.id },
            });
          } else if (buttonIndex === 2) {
            handleDelete(med);
          }
        }
      );
    } else {
      // Android fallback
      Alert.alert(med.name, "What would you like to do?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Edit Medication",
          onPress: () =>
            router.push({
              pathname: "/edit-medication",
              params: { data: JSON.stringify(med), id: med.id },
            }),
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => handleDelete(med),
        },
      ]);
    }
  };

  const handleSaveLanguage = async () => {
    if (!profile || !hasUnsavedChange) return;
    setSavingLang(true);
    try {
      await updateLanguage(profile.id, selectedLanguage);

      // Update profile in store
      setProfile({ ...profile, preferredLanguage: selectedLanguage });

      // Refresh medications to get updated translations
      const meds = await fetchMedications(profile.id);
      setMedications(meds);

      const langObj = LANGUAGES.find((l) => l.code === selectedLanguage);
      Alert.alert(
        "Language Updated",
        `All medications have been retranslated to ${langObj?.label ?? selectedLanguage}.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Language save failed:", msg);
      Alert.alert("Error", `Failed to update language: ${msg}`);
    } finally {
      setSavingLang(false);
    }
  };

  const handleUploadPhoto = () => {
    router.push("/profile-photo");
  };

  const handleRemovePhoto = async () => {
    if (!profile || savingPhoto || !profile.seniorPhotoUrl) return;
    setSavingPhoto(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ senior_photo_url: null })
        .eq("id", profile.id);

      if (error) throw error;
      setProfile({ ...profile, seniorPhotoUrl: null });
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not remove photo.");
    } finally {
      setSavingPhoto(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.screenTitle}>Profile</Text>

        {/* Senior Info Card */}
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              {profile?.seniorPhotoUrl ? (
                <Image
                  source={{ uri: profile.seniorPhotoUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <>
                  <View style={styles.avatarHead} />
                  <View style={styles.avatarBody} />
                </>
              )}
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarBadgeText}>{seniorName[0]}</Text>
              </View>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.seniorName}>{seniorName}</Text>
              <Text style={styles.caregiverLabel}>
                Caregiver: {caregiverName}
              </Text>
              <View style={styles.photoActionRow}>
                <Pressable
                  onPress={handleUploadPhoto}
                  style={styles.photoActionButton}
                  disabled={savingPhoto}
                >
                  <Text style={styles.photoActionButtonText}>
                    {profile?.seniorPhotoUrl ? "Update photo" : "Upload photo"}
                  </Text>
                </Pressable>
                {profile?.seniorPhotoUrl ? (
                  <Pressable
                    onPress={handleRemovePhoto}
                    style={styles.photoRemoveButton}
                    disabled={savingPhoto}
                  >
                    {savingPhoto ? (
                      <ActivityIndicator size="small" color={theme.colors.danger} />
                    ) : (
                      <Text style={styles.photoRemoveButtonText}>Remove</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* Medications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Medications ({medications.length})
            </Text>
            <Pressable
              onPress={() => router.push("/scan")}
              style={styles.addMedLink}
            >
              <Text style={styles.addMedLinkText}>+ Add</Text>
            </Pressable>
          </View>

          {medications.length === 0 ? (
            <View style={styles.emptyMeds}>
              <Text style={styles.emptyMedsText}>
                No medications added yet.
              </Text>
            </View>
          ) : (
            medications.map((med) => (
              <View key={med.id} style={styles.medRow}>
                <View style={styles.medDot} />
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDetail}>
                    {med.dosage} · {med.frequency.replace("_", " ")} daily
                  </Text>
                  {med.instructions ? (
                    <Text style={styles.medInstructions}>
                      {med.instructions}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.medRight}>
                  <Pressable
                    onPress={() => handleOptions(med)}
                    style={styles.optionsButton}
                    hitSlop={12}
                  >
                    <Text style={styles.optionsIcon}>⋮</Text>
                  </Pressable>
                  <Text style={styles.medTimes}>
                    {med.scheduledTimes
                      .map((t) => {
                        const [h, m] = t.split(":");
                        const hour = parseInt(h, 10);
                        const ampm = hour >= 12 ? "PM" : "AM";
                        const h12 = hour % 12 || 12;
                        return `${h12}:${m} ${ampm}`;
                      })
                      .join(", ")}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {seniorName}'s Language
          </Text>
          <Text style={styles.langSubtext}>
            Reminders and instructions will be spoken in this language.
          </Text>

          {/* Dropdown trigger */}
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => setDropdownOpen(true)}
            disabled={savingLang}
          >
            <Text style={styles.dropdownFlag}>
              {LANGUAGES.find((l) => l.code === selectedLanguage)?.flag}
            </Text>
            <Text style={styles.dropdownLabel}>
              {LANGUAGES.find((l) => l.code === selectedLanguage)?.label}
            </Text>
            <Text style={styles.dropdownChevron}>▼</Text>
          </Pressable>

          {/* Save button — visible only when language has changed */}
          {hasUnsavedChange && (
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.saveButtonPressed,
                savingLang && styles.saveButtonDisabled,
              ]}
              onPress={handleSaveLanguage}
              disabled={savingLang}
            >
              {savingLang ? (
                <ActivityIndicator color={theme.colors.textOnPrimary} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save & Retranslate</Text>
              )}
            </Pressable>
          )}
          {savingLang && (
            <Text style={styles.savingHint}>
              Translating {medications.length} medication{medications.length !== 1 ? "s" : ""}…
            </Text>
          )}
        </View>

        {/* Language Dropdown Modal */}
        <Modal
          visible={dropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDropdownOpen(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setDropdownOpen(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <FlatList
                data={LANGUAGES}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => {
                  const isActive = item.code === selectedLanguage;
                  return (
                    <Pressable
                      style={[
                        styles.modalRow,
                        isActive && styles.modalRowActive,
                      ]}
                      onPress={() => {
                        setSelectedLanguage(item.code);
                        setDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.modalFlag}>{item.flag}</Text>
                      <Text
                        style={[
                          styles.modalLabel,
                          isActive && styles.modalLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {isActive && <Text style={styles.modalCheck}>✓</Text>}
                    </Pressable>
                  );
                }}
              />
            </View>
          </Pressable>
        </Modal>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Pressable
            style={({ pressed }) => [
              styles.accountRow,
              pressed && styles.accountRowPressed,
            ]}
            onPress={handleSignOut}
          >
            <Text style={styles.accountRowIcon}>🚪</Text>
            <Text style={styles.accountRowText}>Sign out</Text>
          </Pressable>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Vela</Text>
          <Text style={styles.appVersion}>
            A warm, guiding light for daily medication.
          </Text>
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
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  screenTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.primary,
    marginBottom: theme.spacing.lg,
  },
  // Senior Info Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  avatarHead: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    marginBottom: 2,
  },
  avatarBody: {
    width: 24,
    height: 14,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: theme.colors.primaryLight,
  },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    backgroundColor: theme.colors.accent,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  avatarBadgeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: theme.colors.textOnPrimary,
  },
  avatarInfo: {
    flex: 1,
  },
  seniorName: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.primary,
  },
  caregiverLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  photoActionRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  photoActionButton: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  photoActionButtonText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 12,
    color: theme.colors.accent,
  },
  photoRemoveButton: {
    borderRadius: theme.radii.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
  },
  photoRemoveButtonText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 12,
    color: theme.colors.danger,
  },
  // Sections
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  addMedLink: {
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.full,
  },
  addMedLinkText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.accent,
  },
  // Medication rows
  emptyMeds: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderStyle: "dashed",
  },
  emptyMedsText: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  medRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  medDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
    marginTop: 6,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
  },
  medDetail: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  medInstructions: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.accent,
    marginTop: 4,
    fontStyle: "italic",
  },
  medRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  optionsButton: {
    padding: 4,
  },
  optionsIcon: {
    fontSize: 20,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  medTimes: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.accent,
    marginTop: 4,
  },
  // Account rows
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  accountRowPressed: {
    backgroundColor: theme.colors.surfaceWarm,
    transform: [{ scale: 0.98 }],
  },
  accountRowIcon: {
    fontSize: 20,
  },
  accountRowText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
  },
  // App info
  appInfo: {
    alignItems: "center",
    paddingTop: theme.spacing.lg,
    opacity: 0.5,
  },
  appName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  appVersion: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  // Language dropdown
  langSubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderLight,
    padding: theme.spacing.md,
  },
  dropdownFlag: {
    fontSize: 22,
  },
  dropdownLabel: {
    flex: 1,
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
  },
  dropdownChevron: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.xl,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.sm,
  },
  saveButtonPressed: {
    backgroundColor: theme.colors.primaryLight,
    transform: [{ scale: 0.97 }],
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textOnPrimary,
  },
  savingHint: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.xs,
    fontStyle: "italic",
  },
  // Language modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    width: "100%",
    maxHeight: 480,
    overflow: "hidden",
  },
  modalTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.primary,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalRowActive: {
    backgroundColor: theme.colors.accentSoft,
  },
  modalFlag: {
    fontSize: 22,
  },
  modalLabel: {
    flex: 1,
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
  },
  modalLabelActive: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.accent,
  },
  modalCheck: {
    fontSize: 16,
    color: theme.colors.accent,
    fontFamily: theme.fonts.bold,
  },
});
