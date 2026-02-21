/**
 * useNotifications — handles Expo local notification scheduling for Vela.
 *
 * - Requests permission on mount
 * - Schedules grouped medication reminders from the backend
 * - Provides a simulateNextReminder() for the hackathon demo
 * - Routes notification taps → Now Card screen
 */
import { useEffect, useRef, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { fetchNotificationSchedule } from "../api";
import { useVelaStore } from "../store/useVelaStore";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowInForeground: true,
    }),
});

export interface ScheduledNotification {
    id: string;
    stage: string;
    triggerTime: string;
    scheduledTime: string;
    title: string;
    body: string;
    medications: { id: string; name: string; dosage: string }[];
    allTaken: boolean;
}

export function useNotifications() {
    const router = useRouter();
    const responseListener = useRef<Notifications.Subscription | null>(null);
    const forceDue = useVelaStore((s) => s.forceDue);

    // ── Request permission on mount ─────────────────────────────────────────
    useEffect(() => {
        (async () => {
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== "granted") {
                await Notifications.requestPermissionsAsync();
            }
        })();
    }, []);

    // ── Handle notification tap → navigate to Now Card ──────────────────────
    useEffect(() => {
        responseListener.current =
            Notifications.addNotificationResponseReceivedListener((response) => {
                const data = response.notification.request.content.data;
                if (data?.screen === "now") {
                    // Force the next upcoming slot to "due" so the Now Card has something to show
                    forceDue();
                    router.push("/now");
                }
            });

        return () => {
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [router, forceDue]);

    // ── Schedule all notifications from backend ─────────────────────────────
    const scheduleAll = useCallback(async (profileId: string) => {
        try {
            // 1. Cancel all previously scheduled notifications (idempotent)
            await Notifications.cancelAllScheduledNotificationsAsync();

            // 2. Fetch the grouped schedule from the backend
            const schedule = await fetchNotificationSchedule(profileId);

            if (!schedule?.notifications) return;

            const now = new Date();
            const todayStr = now.toISOString().split("T")[0];

            // 3. Schedule each notification that's still in the future
            for (const notif of schedule.notifications) {
                const [h, m] = notif.triggerTime.split(":").map(Number);
                const triggerDate = new Date(todayStr + "T00:00:00");
                triggerDate.setHours(h, m, 0, 0);

                // Skip notifications in the past
                if (triggerDate <= now) continue;

                // Skip if all meds at this time are already taken
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

            console.log(
                `[Vela] Scheduled ${schedule.notifications.length} notifications for ${profileId}`
            );
        } catch (err) {
            console.error("[Vela] Failed to schedule notifications:", err);
        }
    }, []);

    // ── Simulate next reminder (demo button) ────────────────────────────────
    const simulateNextReminder = useCallback(
        async (profileId: string) => {
            try {
                const schedule = await fetchNotificationSchedule(profileId);
                if (!schedule?.notifications?.length) return;

                // Find the next "action" stage notification (the main reminder)
                const nextAction = schedule.notifications.find(
                    (n: ScheduledNotification) => n.stage === "action" && !n.allTaken
                );
                const notif = nextAction ?? schedule.notifications[0];

                // Fire it in 2 seconds
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
        },
        []
    );

    return { scheduleAll, simulateNextReminder };
}
