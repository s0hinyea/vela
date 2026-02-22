import React, { useEffect, useRef } from "react";
import { StyleSheet, Animated, Easing, View, Text } from "react-native";
import { BlurView } from "expo-blur";
import { VelaAvatar } from "./VelaAvatar";
import { theme } from "../theme";
import { useT } from "../i18n";

interface PulsingVelaOverlayProps {
    isPulsing: boolean;
}

export function PulsingVelaOverlay({ isPulsing }: PulsingVelaOverlayProps) {
    const t = useT();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Handle Fade In / Out
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: isPulsing ? 1 : 0,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
        }).start();
    }, [isPulsing, fadeAnim]);

    // Handle Pulsing Loop
    useEffect(() => {
        if (isPulsing) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 1000,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isPulsing, pulseAnim]);

    return (
        <Animated.View
            pointerEvents={isPulsing ? "auto" : "none"}
            style={[
                StyleSheet.absoluteFill,
                styles.container,
                { opacity: fadeAnim },
            ]}
        >
            <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill}>
                <View style={styles.content}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <VelaAvatar />
                    </Animated.View>
                </View>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        zIndex: 9999, // Ensure it covers everything
        elevation: 9999,
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
});
