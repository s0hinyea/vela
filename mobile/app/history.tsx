import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { theme } from "../theme";
import { useVelaStore } from "../store/useVelaStore";
import { fetchScheduleHistory } from "../api";
import { DoseSlot } from "../types";

type HistoryDay = {
    date: string;
    slots: DoseSlot[];
};

export default function HistoryScreen() {
    const router = useRouter();
    const { profile } = useVelaStore();

    const [history, setHistory] = useState<HistoryDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadHistory = useCallback(async () => {
        if (!profile) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchScheduleHistory(profile.id);
            setHistory(data.history);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load history");
        } finally {
            setLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const formatDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        return new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
        }).format(date);
    };

    const getStatusLabel = (status: string) => {
        if (status === "taken") return "Taken";
        if (status === "missed") return "Missed";
        if (status === "due") return "Due Now";
        return "Upcoming";
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                    <Text style={styles.backBtnText}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Medication History</Text>
                <View style={{ width: 44 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable onPress={loadHistory} style={styles.retryBtn}>
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {history.length === 0 ? (
                        <Text style={styles.emptyText}>No history available yet.</Text>
                    ) : (
                        history.map((day) => {
                            const takenCount = day.slots.filter(s => s.status === "taken").length;
                            const totalCount = day.slots.length;

                            return (
                                <View key={day.date} style={styles.dayCard}>
                                    <View style={styles.dayHeader}>
                                        <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                                        {totalCount > 0 && (
                                            <Text style={styles.dayScore}>
                                                {takenCount}/{totalCount}
                                            </Text>
                                        )}
                                    </View>

                                    {totalCount === 0 ? (
                                        <Text style={styles.noMedsText}>No medications scheduled.</Text>
                                    ) : (
                                        <View style={styles.slotsList}>
                                            {day.slots.map((slot) => (
                                                <View key={slot.id} style={styles.slotRow}>
                                                    <View
                                                        style={[
                                                            styles.statusDot,
                                                            slot.status === "taken" && styles.statusDotTaken,
                                                            slot.status === "missed" && styles.statusDotMissed,
                                                            slot.status === "due" && styles.statusDotDue,
                                                            slot.status === "upcoming" && styles.statusDotUpcoming,
                                                        ]}
                                                    />
                                                    <View style={styles.slotDetails}>
                                                        <Text style={styles.slotTime}>{slot.scheduledTimeLabel}</Text>
                                                        <Text style={styles.slotName}>{slot.medicationName}</Text>
                                                    </View>
                                                    <Text
                                                        style={[
                                                            styles.statusText,
                                                            slot.status === "taken" && styles.statusTextTaken,
                                                            slot.status === "missed" && styles.statusTextMissed,
                                                            slot.status === "due" && styles.statusTextDue,
                                                            slot.status === "upcoming" && styles.statusTextUpcoming,
                                                        ]}
                                                    >
                                                        {getStatusLabel(slot.status)}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    backBtn: {
        padding: theme.spacing.xs,
        width: 44,
    },
    backBtnText: {
        fontSize: 24,
        color: theme.colors.primary,
    },
    headerTitle: {
        fontFamily: theme.fonts.bold,
        fontSize: theme.fontSizes.lg,
        color: theme.colors.textPrimary,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing.xl,
    },
    errorText: {
        fontFamily: theme.fonts.medium,
        color: theme.colors.danger,
        marginBottom: theme.spacing.md,
        textAlign: "center",
    },
    retryBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radii.full,
    },
    retryBtnText: {
        fontFamily: theme.fonts.semiBold,
        color: theme.colors.textOnPrimary,
    },
    scrollContent: {
        padding: theme.spacing.lg,
    },
    emptyText: {
        fontFamily: theme.fonts.medium,
        color: theme.colors.textSecondary,
        textAlign: "center",
        marginTop: 40,
    },
    dayCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.borderLight,
        ...theme.shadows.card,
    },
    dayHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceWarm,
    },
    dayDate: {
        fontFamily: theme.fonts.bold,
        fontSize: theme.fontSizes.md,
        color: theme.colors.primary,
        textTransform: "capitalize",
    },
    dayScore: {
        fontFamily: theme.fonts.semiBold,
        fontSize: theme.fontSizes.sm,
        color: theme.colors.textSecondary,
        backgroundColor: theme.colors.surfaceWarm,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    noMedsText: {
        fontFamily: theme.fonts.regular,
        fontSize: theme.fontSizes.sm,
        color: theme.colors.textSecondary,
        fontStyle: "italic",
    },
    slotsList: {
        gap: 12,
    },
    slotRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
    },
    statusDotTaken: { backgroundColor: theme.colors.success },
    statusDotMissed: { backgroundColor: theme.colors.danger },
    statusDotDue: { backgroundColor: theme.colors.accent },
    statusDotUpcoming: { backgroundColor: theme.colors.border },
    slotDetails: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    slotTime: {
        fontFamily: theme.fonts.semiBold,
        fontSize: theme.fontSizes.sm,
        color: theme.colors.textPrimary,
        width: 70,
    },
    slotName: {
        fontFamily: theme.fonts.medium,
        fontSize: theme.fontSizes.sm,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    statusText: {
        fontFamily: theme.fonts.semiBold,
        fontSize: 12,
        marginLeft: 8,
    },
    statusTextTaken: { color: theme.colors.success },
    statusTextMissed: { color: theme.colors.danger },
    statusTextDue: { color: theme.colors.accent },
    statusTextUpcoming: { color: theme.colors.textSecondary },
});
