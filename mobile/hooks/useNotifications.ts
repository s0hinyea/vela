import { useEffect, useRef, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { fetchNotificationSchedule } from "../api";
import { useVelaStore } from "../store/useVelaStore";
import { theme } from "../theme";

const VELA_CHANNEL_ID = "vela-reminders";

function toBrandedTitle(title: string, stage: string) {
  if (title.toLowerCase().startsWith("vela")) return title;
  const stagePrefix = stage === "action" ? "Vela" : "Vela Reminder";
  return `${stagePrefix}: ${title}`;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications(play?: (opts: { audioUrl: string | null; fallbackText: string; language?: string }) => void) {
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const forceDue = useVelaStore((s) => s.forceDue);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(VELA_CHANNEL_ID, {
          name: "Vela Reminders",
          importance: Notifications.AndroidImportance.HIGH,
          lightColor: theme.colors.accent,
          enableLights: true,
          vibrationPattern: [0, 200, 120, 200],
          showBadge: false,
          sound: "default",
        });
      }
    })();
  }, []);

  useEffect(() => {
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.screen === "now") {
          forceDue();

          if (play && data.audioUrl) {
            play({
              audioUrl: (data.audioUrl as string) || null,
              fallbackText: (data.audioText as string) || "It is time for your medication.",
            });
          }

          router.push("/(tabs)");
        }
      });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router, forceDue, play]);

  const scheduleAll = useCallback(async (profileId: string) => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      const schedule = await fetchNotificationSchedule(profileId);
      if (!schedule?.notifications) return;

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      for (const notif of schedule.notifications) {
        const [h, m] = notif.triggerTime.split(":").map(Number);
        const triggerDate = new Date(todayStr + "T00:00:00");
        triggerDate.setHours(h, m, 0, 0);

        if (triggerDate <= now) continue;
        if (notif.allTaken) continue;

        const secondsFromNow = Math.floor(
          (triggerDate.getTime() - now.getTime()) / 1000
        );

        await Notifications.scheduleNotificationAsync({
          content: {
            title: toBrandedTitle(notif.title, notif.stage),
            body: notif.body,
            sound: "default",
            subtitle: "Vela",
            color: theme.colors.accent,
            data: {
              screen: "now",
              stage: notif.stage,
              scheduledTime: notif.scheduledTime,
              medications: notif.medications,
              audioUrl: (notif as any).audioUrl,
              audioText: (notif as any).audioText,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(1, secondsFromNow),
            ...(Platform.OS === "android" ? { channelId: VELA_CHANNEL_ID } : {}),
          },
        });
      }
    } catch (err) {
      console.error("[Vela] Failed to schedule notifications:", err);
    }
  }, []);

  const simulateNextReminder = useCallback(async (profileId: string) => {
    try {
      const schedule = await fetchNotificationSchedule(profileId);
      if (!schedule?.notifications?.length) return;

      const nextAction = schedule.notifications.find(
        (n) => n.stage === "action" && !n.allTaken
      );
      const notif = nextAction ?? schedule.notifications[0];
      if (!notif) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: toBrandedTitle(notif.title, notif.stage),
          body: notif.body,
          sound: "default",
          subtitle: "Vela",
          color: theme.colors.accent,
          data: {
            screen: "now",
            stage: notif.stage,
            scheduledTime: notif.scheduledTime,
            medications: notif.medications,
            audioUrl: (notif as any).audioUrl,
            audioText: (notif as any).audioText,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
          ...(Platform.OS === "android" ? { channelId: VELA_CHANNEL_ID } : {}),
        },
      });
    } catch (err) {
      console.error("[Vela] Simulate failed:", err);
    }
  }, []);

  return { scheduleAll, simulateNextReminder };
}
