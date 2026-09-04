import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, AppState, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebAuthLoginScreenProps } from "../types/navigation";
import { FRONTEND_URL } from "../config/env";
import { apiClient } from "../config/api";
import authService from "../services/auth.service";
import { offerEnableAfterLogin } from "../services/biometric.service";
import type { LoginResponse } from "../types/models";
import Button from "../components/Button";
import { useThemedStyles, type ThemeTokens } from "../theme";

const AUTH_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_MS = 1500;

type StartResponse = {
  session_id: string;
  session_secret: string;
  login_path: string;
  user_code: string;
};

let startGeneration = 0;

function buildAppLoginUrl(frontendUrl: string, loginPath: string): string {
  const origin = String(frontendUrl || "").replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(origin)) {
    throw new Error("Web sign-in URL is not configured.");
  }
  if (!loginPath.startsWith("/app-login")) {
    throw new Error("Invalid sign-in path from the server.");
  }
  const parsed = new URL(loginPath, `${origin}/`);
  const expected = new URL(origin);
  if (parsed.origin !== expected.origin || parsed.pathname !== "/app-login") {
    throw new Error("Invalid sign-in path from the server.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid sign-in URL.");
  }
  return parsed.toString();
}

export default function WebAuthLoginScreen({ navigation }: WebAuthLoginScreenProps) {
  const styles = useThemedStyles(createStyles);
  const settled = useRef(false);
  const pollInFlight = useRef(false);
  const sessionRef = useRef<StartResponse | null>(null);
  const [statusText, setStatusText] = useState("Opening your browser...");
  const [userCode, setUserCode] = useState("");
  const [canRetry, setCanRetry] = useState(false);

  const finishSuccess = useCallback(
    async (data: LoginResponse) => {
      if (settled.current || !data?.access) {
        return;
      }
      settled.current = true;
      try {
        await authService.persistLoginSession(data);
        if (!data.tenants?.length) {
          Alert.alert(
            "No workspaces",
            "Your account has no active company memberships yet. Accept an invitation on the web app, then try again."
          );
          navigation.goBack();
          return;
        }
        offerEnableAfterLogin();
        navigation.reset({ index: 0, routes: [{ name: "CompanySelection" }] });
      } catch {
        settled.current = false;
        Alert.alert("Sign in failed", "Could not save your session. Please try again.");
      }
    },
    [navigation]
  );

  const cancelSession = useCallback(async (session?: StartResponse | null) => {
    const target = session || sessionRef.current;
    if (!target) {
      return;
    }
    try {
      await apiClient.post("/users/app-login/cancel/", {
        session_id: target.session_id,
        session_secret: target.session_secret,
      });
    } catch {
      // Best-effort cancel.
    }
  }, []);

  const pollOnce = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || settled.current || pollInFlight.current) {
      return;
    }
    pollInFlight.current = true;
    try {
      const { data, status } = await apiClient.post<LoginResponse | { status?: string; detail?: string }>(
        "/users/app-login/poll/",
        {
          session_id: session.session_id,
          session_secret: session.session_secret,
        },
        { validateStatus: () => true }
      );
      if (status === 200 && data && "access" in data && data.access) {
        await finishSuccess(data);
        return;
      }
      if (status === 409 && !settled.current) {
        settled.current = true;
        Alert.alert("Sign in ended", ("detail" in data && data.detail) || "Please try again.");
        navigation.goBack();
      }
    } finally {
      pollInFlight.current = false;
    }
  }, [finishSuccess, navigation]);

  const openBrowser = useCallback(async (loginPath: string) => {
    const loginUrl = buildAppLoginUrl(FRONTEND_URL, loginPath);
    const canOpen = await Linking.canOpenURL(loginUrl);
    if (!canOpen) {
      throw new Error(`Cannot open ${loginUrl}`);
    }
    await Linking.openURL(loginUrl);
  }, []);

  useEffect(() => {
    const generation = ++startGeneration;
    let cancelled = false;
    settled.current = false;
    setCanRetry(false);
    setUserCode("");
    setStatusText("Opening your browser...");

    (async () => {
      try {
        const { data } = await apiClient.post<StartResponse>("/users/app-login/start/", { client: "mobile" });
        if (cancelled || generation !== startGeneration) {
          await cancelSession(data);
          return;
        }
        sessionRef.current = data;
        if (!data.user_code) {
          throw new Error("Sign-in session did not include a confirmation code.");
        }
        setUserCode(data.user_code);
        await openBrowser(data.login_path);
        if (cancelled || generation !== startGeneration) {
          return;
        }
        setStatusText("Enter this code in your browser, then finish sign in there.");
        setCanRetry(true);
      } catch (error) {
        if (!cancelled && generation === startGeneration) {
          Alert.alert("Could not start sign in", error?.message || "Please try again.");
          navigation.goBack();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cancelSession, navigation, openBrowser]);

  useEffect(() => {
    const timer = setInterval(() => {
      void pollOnce().catch(() => undefined);
    }, POLL_MS);
    const timeout = setTimeout(() => {
      if (!settled.current) {
        void cancelSession();
        Alert.alert("Sign in timed out", "Please try again.");
        navigation.goBack();
      }
    }, AUTH_TIMEOUT_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [cancelSession, navigation, pollOnce]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void pollOnce().catch(() => undefined);
      }
    });
    const linking = Linking.addEventListener("url", () => {
      void pollOnce().catch(() => undefined);
    });
    return () => {
      sub.remove();
      linking.remove();
    };
  }, [pollOnce]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            void cancelSession();
            navigation.goBack();
          }}
          hitSlop={8}
        >
          <Text style={styles.close}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign in to Glance</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Waiting for browser sign-in</Text>
        <Text style={styles.lead}>{statusText}</Text>
        {userCode ? <Text style={styles.userCode}>{userCode}</Text> : null}
        {canRetry && sessionRef.current ? (
          <Button
            label="Open browser again"
            onPress={() => {
              void openBrowser(sessionRef.current!.login_path).catch(() => undefined);
            }}
            icon="open-outline"
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    safe: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      height: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    close: {
      ...type.subtitle,
      color: colors.interactive,
      width: 64,
    },
    headerTitle: {
      ...type.subtitle,
      color: colors.textHeading,
    },
    headerSpacer: {
      width: 64,
    },
    body: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 32,
    },
    title: {
      ...type.title,
      marginBottom: 12,
    },
    lead: {
      ...type.callout,
      color: colors.textSecondary,
      marginBottom: 24,
    },
    userCode: {
      ...type.title,
      letterSpacing: 4,
      textAlign: "center" as const,
      marginBottom: 24,
      fontVariant: ["tabular-nums"],
    },
  } as const;
}
