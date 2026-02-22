/**
 * Tab Layout — Bottom tab bar with two tabs.
 * Tab 1: Medications (the Now Card / schedule)
 * Tab 2: Profile (settings, senior info, sign out)
 */
import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { theme } from "../../theme";

function MedicationAvatar() {
  return (
    <View style={[styles.iconWrap, styles.medWrap]}>
      <View style={styles.capsule}>
        <View style={styles.capsuleLeft} />
        <View style={styles.capsuleRight} />
      </View>
    </View>
  );
}

function AskVelaAvatar() {
  return (
    <View style={[styles.iconWrap, styles.velaWrap]}>
      <View style={styles.flameBase}>
        <View style={styles.flameCore} />
      </View>
      <View style={styles.velaEyes}>
        <View style={styles.eye} />
        <View style={styles.eye} />
      </View>
    </View>
  );
}

function ProfileAvatar() {
  return (
    <View style={[styles.iconWrap, styles.profileWrap]}>
      <View style={styles.head} />
      <View style={styles.body} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.borderLight,
          paddingBottom: 8,
          paddingTop: 8,
          height: 85,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: theme.fonts.semiBold,
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Medications",
          tabBarIcon: () => <MedicationAvatar />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Ask Vela",
          tabBarIcon: () => <AskVelaAvatar />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: () => <ProfileAvatar />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  medWrap: {
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  capsule: {
    width: 14,
    height: 8,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.primary,
    flexDirection: "row",
  },
  capsuleLeft: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  capsuleRight: {
    flex: 1,
    backgroundColor: theme.colors.accent,
  },
  velaWrap: {
    backgroundColor: "#FFF1DF",
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  flameBase: {
    width: 10,
    height: 12,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 2,
    backgroundColor: theme.colors.accent,
    transform: [{ rotate: "8deg" }],
  },
  flameCore: {
    width: 4,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.surface,
    position: "absolute",
    top: 4,
    left: 3,
  },
  velaEyes: {
    position: "absolute",
    flexDirection: "row",
    gap: 2,
    top: 12,
  },
  eye: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.colors.primary,
  },
  profileWrap: {
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  head: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginBottom: 1,
  },
  body: {
    width: 12,
    height: 7,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: theme.colors.primaryLight,
  },
});
