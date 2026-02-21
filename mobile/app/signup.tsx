/**
 * Screen — Sign Up
 * Email + password + caregiver name + 4-digit PIN.
 * Creates auth user then inserts into Person B's existing profiles table.
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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { useAuth } from "../hooks/useAuth";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [caregiverName, setCaregiverName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!caregiverName.trim()) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Required", "Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Required", "Password must be at least 6 characters.");
      return;
    }
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      Alert.alert("Required", "PIN must be exactly 4 digits.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(
        email.trim(),
        password,
        caregiverName.trim(),
        pin
      );

      if (error) {
        Alert.alert("Sign up failed", error);
        return;
      }

      // Sign-up successful → navigate to onboarding to name the senior
      router.replace("/onboarding");
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back</Text>
          </Pressable>

          {/* Header */}
          <Text style={styles.heading}>Create your account</Text>
          <Text style={styles.sub}>
            As a caregiver, you'll manage medications for your loved one.
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                style={styles.input}
                value={caregiverName}
                onChangeText={setCaregiverName}
                placeholder="e.g. Sarah"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Caregiver PIN</Text>
              <Text style={styles.pinHint}>
                A 4-digit code only you will know. Used to access caregiver features.
              </Text>
              <TextInput
                style={[styles.input, styles.pinInput]}
                value={pin}
                onChangeText={(t) => setPin(t.replace(/[^0-9]/g, "").slice(0, 4))}
                placeholder="• • • •"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textOnPrimary} />
            ) : (
              <Text style={styles.submitButtonText}>Create account</Text>
            )}
          </Pressable>

          {/* Sign in link */}
          <Pressable onPress={() => router.replace("/signin")} style={styles.altLink}>
            <Text style={styles.altLinkText}>
              Already have an account? <Text style={styles.altLinkBold}>Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  backLink: { marginBottom: theme.spacing.md },
  backLinkText: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.accent,
    fontSize: theme.fontSizes.sm,
  },
  heading: {
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  sub: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  form: { gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  field: {},
  label: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  pinHint: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
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
  pinInput: {
    letterSpacing: 12,
    textAlign: "center",
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.xl,
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
  altLink: { alignItems: "center", marginTop: theme.spacing.md },
  altLinkText: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  altLinkBold: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.accent,
  },
});
