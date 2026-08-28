import React, { useEffect, useRef, useState } from "react";
import { BackHandler, Platform, View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import BrandMark from "./BrandMark";
import Button from "./Button";
import {
  authenticate,
  getCapability,
  type BiometricCapability,
} from "../services/biometric.service";
import { colors, space, type } from "../theme";

type Props = {
  onUnlock: () => void;
  onSignInElsewhere: () => void;
};

export default function BiometricLock({ onUnlock, onSignInElsewhere }: Props) {
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const prompted = useRef(false);

  const label = capability?.label || "Biometrics";
  const checking = capability === null;
  const available = capability?.available === true;

  const unlock = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const ok = await authenticate(`Unlock Glancewise with ${label}`);
      if (ok) {
        onUnlock();
        return;
      }
      setError(`Could not verify ${label}. Try again, or sign in another way.`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await getCapability();
      if (cancelled) {
        return;
      }
      setCapability(next);
      if (next.available && !prompted.current) {
        prompted.current = true;
        setBusy(true);
        const ok = await authenticate(`Unlock Glancewise with ${next.label}`);
        if (cancelled) {
          return;
        }
        setBusy(false);
        if (ok) {
          onUnlock();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onUnlock]);

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <BrandMark size={72} />
        <Text style={styles.logo}>Glancewise</Text>
        <Text style={styles.tagline}>Unlock to continue</Text>
      </View>
      <SafeAreaView style={styles.sheet} edges={["bottom"]}>
        <Text style={styles.title}>
          {checking ? "Unlock to continue" : available ? `Unlock with ${label}` : "Unlock required"}
        </Text>
        <Text style={styles.lead}>
          {checking
            ? "Checking this device…"
            : available
              ? `Your session is still signed in. Confirm with ${label} to open payables and documents.`
              : "Biometrics are not available on this device. Sign in again to continue."}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {available ? (
          <Button
            label={`Unlock with ${label}`}
            onPress={() => void unlock()}
            loading={busy}
            icon="finger-print-outline"
            style={styles.cta}
          />
        ) : null}
        <Button
          label="Sign in another way"
          onPress={onSignInElsewhere}
          variant="ghost"
          disabled={busy}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: Platform.OS === "android" ? 50 : 0,
    backgroundColor: colors.brandNavy,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxxl,
  },
  logo: {
    ...type.display,
    marginTop: space.lg,
    fontSize: 32,
    lineHeight: 38,
    color: colors.white,
  },
  tagline: {
    ...type.body,
    marginTop: space.sm,
    color: colors.textOnDarkMuted,
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
    ...type.title,
    fontSize: 24,
    lineHeight: 30,
  },
  lead: {
    ...type.callout,
    marginTop: space.sm,
    marginBottom: space.lg,
    color: colors.textSecondary,
  },
  error: {
    ...type.meta,
    color: colors.danger,
    marginBottom: space.md,
  },
  cta: {
    marginBottom: space.sm,
  },
});
