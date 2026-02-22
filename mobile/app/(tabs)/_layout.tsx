/**
 * Tab Layout — Bottom tab bar with two tabs.
 * Tab 1: Medications (the Now Card / schedule)
 * Tab 2: Profile (settings, senior info, sign out)
 */
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { theme } from "../../theme";

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
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22 }}>💊</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Ask Vela",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22 }}>🔥</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22 }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
