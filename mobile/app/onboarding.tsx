/**
 * Screen — Onboarding
 * Shown right after sign-up to capture the senior's name.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [seniorName, setSeniorName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!seniorName.trim()) {
      Alert.alert("Required", "Please enter the name of the person you are caring for.");
      return;
    }

    if (!user) return; // Should never happen if routed correctly

    setLoading(true);
    try {
      // Update the existing profile row with the senior's name
      const { error } = await supabase
        .from("profiles")
        .update({ senior_name: seniorName.trim() })
        .eq("id", user.id);

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      // Done onboarding — head to the greeting screen
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <Text style={styles.heading}>One last thing...</Text>
          <Text style={styles.sub}>
            Who will you be managing medications for?
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Their first name</Text>
              <TextInput
                style={styles.input}
                value={seniorName}
                onChangeText={setSeniorName}
                placeholder="e.g. Martha"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="words"
                autoComplete="name-given"
                autoFocus
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
            onPress={handleFinish}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textOnPrimary} />
            ) : (
              <Text style={styles.submitButtonText}>Continue to Vela</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, padding: theme.spacing.lg, justifyContent: "center" },
  heading: {
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  sub: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  form: { marginBottom: theme.spacing.xl },
  field: {},
  label: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.xl,
    alignItems: "center",
    ...theme.shadows.card,
  },
  submitButtonText: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
    fontSize: theme.fontSizes.lg,
  },
  pressed: {
    backgroundColor: theme.colors.primaryLight,
    transform: [{ scale: 0.97 }],
  },
  disabled: { opacity: 0.6 },
});
