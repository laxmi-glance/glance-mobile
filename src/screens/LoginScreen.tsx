import React, { useState } from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LoginScreenProps } from "../types/navigation";
import BrandMark from "../components/BrandMark";
import Button from "../components/Button";
import { colors, space } from "../theme";

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [opening, setOpening] = useState(false);

  const handleSignIn = () => {
    setOpening(true);
    navigation.navigate("WebAuthLogin");
    setTimeout(() => setOpening(false), 400);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <BrandMark size={72} />
        <Text style={styles.logo}>Glancewise</Text>
        <Text style={styles.tagline}>Finance operations on autopilot</Text>
      </View>

      <SafeAreaView style={styles.sheet} edges={["bottom"]}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.lead}>
          Connect this app to your Glance workspace. You will finish login in a secure Glance
          window, then return here.
        </Text>

        <Button
          label="Sign in to Glance"
          onPress={handleSignIn}
          loading={opening}
          icon="log-in-outline"
          style={styles.cta}
        />

        <Text style={styles.footer}>
          New to Glancewise?{" "}
          <Text style={styles.link} onPress={() => Linking.openURL("https://glancewise.app")}>
            Start a free trial
          </Text>
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brandNavy,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxxl,
  },
  logo: {
    marginTop: space.lg,
    fontSize: 32,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: -0.6,
  },
  tagline: {
    marginTop: space.sm,
    fontSize: 16,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: space.xxl,
    paddingTop: space.xxl,
    paddingBottom: space.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textHeading,
  },
  lead: {
    marginTop: space.sm,
    marginBottom: space.xl,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  cta: {
    marginBottom: space.lg,
  },
  footer: {
    textAlign: "center",
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: space.md,
  },
  link: {
    color: colors.interactive,
    fontWeight: "600",
  },
});
