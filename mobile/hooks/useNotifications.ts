import { useEffect, useRef, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { fetchNotificationSchedule } from "../api";
import { useVelaStore } from "../store/useVelaStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const forceDue = useVelaStore((s) => s.forceDue);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
    })();
  }, []);

  useEffect(() => {
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.screen === "now") {
          forceDue();
          router.push("/(tabs)");
        }
      });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router, forceDue]);

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
            title: notif.title,
            body: notif.body,
            sound: "default",
            data: {
              screen: "now",
              stage: notif.stage,
              scheduledTime: notif.scheduledTime,
              medications: notif.medications,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(1, secondsFromNow),
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
          title: notif.title,
          body: notif.body,
          sound: "default",
          data: {
            screen: "now",
            stage: notif.stage,
            scheduledTime: notif.scheduledTime,
            medications: notif.medications,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
        },
      });
    } catch (err) {
      console.error("[Vela] Simulate failed:", err);
    }
  }, []);

  return { scheduleAll, simulateNextReminder };
}
