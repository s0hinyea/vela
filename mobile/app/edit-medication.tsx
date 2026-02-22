import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { theme } from "../theme";
import { updateMedication } from "../api";
import { useVelaStore } from "../store/useVelaStore";
import type { Medication } from "../types";

export default function EditMedicationScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();
  const { profile, medications, setMedications } = useVelaStore();

  const med: Medication | null = data ? JSON.parse(data) : null;

  const [name, setName] = useState(med?.name || "");
  const [dosage, setDosage] = useState(med?.dosage || "");
  const [instructions, setInstructions] = useState(med?.instructions || "");
  const [saving, setSaving] = useState(false);

  if (!med) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>No medication data found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim()) {
      Alert.alert("Missing Fields", "Please provide a name and dosage.");
      return;
    }

    setSaving(true);
    try {
      const updatedMed = await updateMedication(med.id, {
        name: name.trim(),
        dosage: dosage.trim(),
        instructions: instructions.trim(),
      });

      // Optimistically update the store
      setMedications(
        medications.map((m) => (m.id === med.id ? { ...m, ...updatedMed } : m))
      );

      router.back();
    } catch (e) {
        console.error("Failed to update medication:", e);
      Alert.alert("Error", "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
             <Text style={styles.backButtonText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Edit Medication</Text>
          <View style={{ width: 44 }} /> {/* alignment spacer */}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Medication Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Lisinopril"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Dosage</Text>
          <TextInput
            style={styles.input}
            value={dosage}
            onChangeText={setDosage}
            placeholder="e.g. 10mg"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Instructions</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="e.g. Take with food"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
            saving && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.textOnPrimary} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
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
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    paddingVertical: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  backButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.md,
    color: theme.colors.accent,
  },
  headerTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
  },
  multilineInput: {
    minHeight: 100,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.full,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textOnPrimary,
  },
});
