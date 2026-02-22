import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../theme";
import { useVelaStore } from "../../store/useVelaStore";
import { askVelaChat, resetVelaChatLimit } from "../../api";
import type { Medication } from "../../types";

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Message = {
  id: string;
  sender: "user" | "vela";
  text: string;
  timestamp: Date;
  risk?: "low" | "medium" | "high" | "unknown";
};

function MedicationAvatar() {
  return (
    <View style={styles.medAvatarWrap}>
      <View style={styles.medCapsule}>
        <View style={styles.medCapsuleLeft} />
        <View style={styles.medCapsuleRight} />
      </View>
    </View>
  );
}

function VelaAvatar() {
  return (
    <View style={styles.velaAvatarWrap}>
      <View style={styles.velaFlame}>
        <View style={styles.velaFlameCore} />
      </View>
      <View style={styles.velaFace}>
        <View style={styles.velaEye} />
        <View style={styles.velaEye} />
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { profile, medications } = useVelaStore();
  
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(3);
  const [resettingLimit, setResettingLimit] = useState(false);
  const logoTapCountRef = useRef(0);
  const logoTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const floatingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  useEffect(() => {
    return () => {
      if (logoTapTimerRef.current) {
        clearTimeout(logoTapTimerRef.current);
        logoTapTimerRef.current = null;
      }
    };
  }, []);

  const floatY = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const handleSelectMed = (med: Medication) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedMed(med);
    // Initial greeting from Vela
    setMessages([
      {
        id: "1",
        sender: "vela",
        text: `Hi! I'm Vela. I'm here to help you with ${med.name}. What would you like to know?`,
        timestamp: new Date(),
      }
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedMed || !profile || loading) return;
    const question = input.trim();
    const startedAt = Date.now();
    const uiRequestId = `ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    console.log(
      `[ChatUI:${uiRequestId}] send start profile=${profile.id} med=${selectedMed.id} qLen=${question.length} q="${question.slice(0, 80)}"`
    );

    try {
      const result = await askVelaChat(profile.id, selectedMed.id, question);
      
      const velaMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "vela",
        text: result.answer,
        timestamp: new Date(),
        risk: result.risk,
      };

      setMessages((prev) => [...prev, velaMessage]);
      setRemaining(result.remaining);
      console.log(
        `[ChatUI:${uiRequestId}] send success remaining=${result.remaining} elapsedMs=${Date.now() - startedAt}`
      );
    } catch (e: any) {
      console.error(
        `[ChatUI:${uiRequestId}] send failed elapsedMs=${Date.now() - startedAt}:`,
        e
      );
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "vela",
        text: e.message || "I'm having trouble connecting right now. Please try again later!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      console.log(`[ChatUI:${uiRequestId}] loading=false`);
    }
  };

  const handleHiddenResetLimit = async () => {
    if (!profile || resettingLimit) return;

    const uiResetId = `reset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    setResettingLimit(true);
    console.log(`[ChatUI:${uiResetId}] hidden reset trigger pressed`);

    try {
      const result = await resetVelaChatLimit(profile.id);
      setRemaining(result.remaining);

      if (selectedMed) {
        const resetMessage: Message = {
          id: (Date.now() + 2).toString(),
          sender: "vela",
          text: "Demo reset complete. You now have 3 questions again for today.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, resetMessage]);
      }

      console.log(
        `[ChatUI:${uiResetId}] hidden reset success deleted=${result.deleted} remaining=${result.remaining}`
      );
    } catch (e) {
      console.error(`[ChatUI:${uiResetId}] hidden reset failed:`, e);
    } finally {
      setResettingLimit(false);
    }
  };

  const handleHiddenLogoPress = () => {
    logoTapCountRef.current += 1;

    if (logoTapTimerRef.current) {
      clearTimeout(logoTapTimerRef.current);
    }

    logoTapTimerRef.current = setTimeout(() => {
      logoTapCountRef.current = 0;
      logoTapTimerRef.current = null;
    }, 1200);

    if (logoTapCountRef.current >= 5) {
      logoTapCountRef.current = 0;
      if (logoTapTimerRef.current) {
        clearTimeout(logoTapTimerRef.current);
        logoTapTimerRef.current = null;
      }
      void handleHiddenResetLimit();
    }
  };

  const resetSelection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedMed(null);
    setMessages([]);
  };

  if (!selectedMed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.selectionHeader}>
          <Pressable onPress={handleHiddenLogoPress}>
            <Animated.View style={{ transform: [{ translateY: floatY }] }}>
              <VelaAvatar />
            </Animated.View>
          </Pressable>
          <Text style={styles.title}>Ask Vela</Text>
          <Text style={styles.subtitle}>Select a medication to discuss</Text>
        </View>

        <ScrollView contentContainerStyle={styles.medList}>
          {medications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>You haven't added any medications yet!</Text>
            </View>
          ) : (
            medications.map((med) => (
              <Pressable
                key={med.id}
                style={({ pressed }) => [
                  styles.medItem,
                  pressed && styles.medItemPressed,
                ]}
                onPress={() => handleSelectMed(med)}
              >
                <View style={styles.medIcon}>
                  <MedicationAvatar />
                </View>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDosage}>{med.dosage}</Text>
                </View>
                <Text style={styles.chevron}>→</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.chatHeader}>
          <Pressable onPress={resetSelection} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Change</Text>
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Vela & {selectedMed.name}</Text>
            <View style={styles.limitBadge}>
              <Text style={styles.limitText}>{remaining} questions left today</Text>
            </View>
          </View>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView 
          style={styles.chatList}
          contentContainerStyle={{ paddingBottom: 20 }}
          ref={(ref) => ref?.scrollToEnd({ animated: true })}
        >
          <View style={styles.avatarContainer}>
            <Pressable onPress={handleHiddenLogoPress}>
              <Animated.View style={{ transform: [{ translateY: floatY }] }}>
                <VelaAvatar />
              </Animated.View>
            </Pressable>
          </View>

          {messages.map((msg) => (
            <View 
              key={msg.id} 
              style={[
                styles.messageRow,
                msg.sender === "user" ? styles.userRow : styles.velaRow
              ]}
            >
              <View style={[
                styles.bubble,
                msg.sender === "user" ? styles.userBubble : styles.velaBubble
              ]}>
                {msg.sender === "vela" && msg.risk ? (
                  <View style={[
                    styles.riskBadge,
                    msg.risk === "low"
                      ? styles.riskLow
                      : msg.risk === "medium"
                      ? styles.riskMedium
                      : msg.risk === "high"
                      ? styles.riskHigh
                      : styles.riskUnknown
                  ]}>
                    <Text style={styles.riskBadgeText}>Risk: {msg.risk.toUpperCase()}</Text>
                  </View>
                ) : null}
                <Text style={[
                  styles.messageText,
                  msg.sender === "user" ? styles.userText : styles.velaText
                ]}>
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={styles.velaRow}>
              <View style={[styles.bubble, styles.velaBubble, { paddingVertical: 12 }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything..."
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={200}
          />
          <Pressable 
            onPress={handleSend}
            disabled={!input.trim() || loading || remaining <= 0}
            style={[
              styles.sendBtn,
              (!input.trim() || loading || remaining <= 0) && styles.sendBtnDisabled
            ]}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // Selection View
  selectionHeader: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontFamily: theme.fonts.extraBold,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.primary,
  },
  subtitle: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  medList: {
    paddingHorizontal: theme.spacing.lg,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  medItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  medItemPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  medIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.surfaceWarm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  medAvatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  medCapsule: {
    width: 18,
    height: 10,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.primary,
    flexDirection: "row",
  },
  medCapsuleLeft: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  medCapsuleRight: {
    flex: 1,
    backgroundColor: theme.colors.accent,
  },
  medInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  medName: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  medDosage: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: theme.colors.accent,
    fontFamily: theme.fonts.bold,
  },

  // Chat View
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 12,
    borderBottomWidth:1,
    borderBottomColor: theme.colors.borderLight,
  },
  backBtn: {
    padding: 8,
  },
  backBtnText: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.accent,
    fontSize: 14,
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.primary,
  },
  limitBadge: {
    backgroundColor: theme.colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  limitText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 10,
    color: theme.colors.accent,
    textTransform: "uppercase",
  },
  chatList: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  avatarContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  velaAvatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.card,
    borderWidth: 2,
    borderColor: theme.colors.accentLight,
  },
  velaFlame: {
    width: 34,
    height: 40,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 10,
    backgroundColor: theme.colors.accent,
    transform: [{ rotate: "8deg" }],
  },
  velaFlameCore: {
    width: 13,
    height: 15,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
    position: "absolute",
    top: 14,
    left: 10,
  },
  velaFace: {
    position: "absolute",
    top: 42,
    flexDirection: "row",
    gap: 4,
  },
  velaEye: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  messageRow: {
    marginVertical: 4,
    maxWidth: "85%",
  },
  userRow: {
    alignSelf: "flex-end",
  },
  velaRow: {
    alignSelf: "flex-start",
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  velaBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageText: {
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    lineHeight: 22,
  },
  riskBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  riskLow: {
    backgroundColor: "#E7F6EC",
  },
  riskMedium: {
    backgroundColor: "#FFF4DD",
  },
  riskHigh: {
    backgroundColor: "#FCE8E8",
  },
  riskUnknown: {
    backgroundColor: theme.colors.borderLight,
  },
  riskBadgeText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
    color: theme.colors.primary,
    letterSpacing: 0.2,
  },
  userText: {
    color: theme.colors.textOnPrimary,
  },
  velaText: {
    color: theme.colors.textPrimary,
  },
  inputContainer: {
    flexDirection: "row",
    padding: theme.spacing.md,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    maxHeight: 100,
    color: theme.colors.textPrimary,
  },
  sendBtn: {
    marginLeft: 12,
    backgroundColor: theme.colors.accent,
    width: 65,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
  sendBtnText: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
    fontSize: 14,
  },
});
