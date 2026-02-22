import React from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../theme";

export function VelaAvatar() {
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

const styles = StyleSheet.create({
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
});
