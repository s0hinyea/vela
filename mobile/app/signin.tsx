/**
 * Screen — Sign In
 * Email + password. Returns to greeting on success.
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

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Required", "Please enter a valid email.");
      return;
    }
    if (!password) {
      Alert.alert("Required", "Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        Alert.alert("Sign in failed", error);
        return;
      }
      router.replace("/greeting");
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
          {/* Back */}
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back</Text>
          </Pressable>

          {/* Header */}
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.sub}>
            Sign in to continue caring for your loved one.
          </Text>

          {/* Form */}
          <View style={styles.form}>
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
                placeholder="Your password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
                autoComplete="current-password"
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
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textOnPrimary} />
            ) : (
              <Text style={styles.submitButtonText}>Sign in</Text>
            )}
          </Pressable>

          {/* Sign up link */}
          <Pressable onPress={() => router.replace("/signup")} style={styles.altLink}>
            <Text style={styles.altLinkText}>
              Don't have an account? <Text style={styles.altLinkBold}>Sign up</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, padding: theme.spacing.lg, justifyContent: "center" },
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
  },
  form: { gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  field: {},
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
