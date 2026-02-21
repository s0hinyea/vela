/**
 * Profile Tab — Settings, medication list, and account management.
 * Warm and clean, consistent with Vela's design language.
 */
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { theme } from "../../theme";
import { useVelaStore } from "../../store/useVelaStore";
import { useAuth } from "../../hooks/useAuth";
import { fetchMedications } from "../../api";

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, medications, setMedications } = useVelaStore();
  const { user, signOut } = useAuth();
  const seniorName = profile?.seniorName ?? "Friend";
  const caregiverName = profile?.caregiverName ?? "Caregiver";

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
              <Text style={styles.avatarText}>{seniorName[0]}</Text>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.seniorName}>{seniorName}</Text>
              <Text style={styles.caregiverLabel}>
                Caregiver: {caregiverName}
              </Text>
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
            ))
          )}
        </View>

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
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
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
});
