import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";
import { WebAuthLoginScreenProps } from "../types/navigation";
import { WEB_LOGIN_URL } from "../config/env";
import { READ_CAPTURED_LOGIN_JS, WEB_LOGIN_CAPTURE_HOOK } from "../auth/webLoginHook";
import authService from "../services/auth.service";
import type { LoginResponse } from "../types/models";
import { colors } from "../theme";

const AUTH_TIMEOUT_MS = 10 * 60 * 1000;

export default function WebAuthLoginScreen({ navigation }: WebAuthLoginScreenProps) {
  const webRef = useRef<WebView>(null);
  const settled = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!settled.current) {
        Alert.alert("Sign in timed out", "Please try again.");
        navigation.goBack();
      }
    }, AUTH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [navigation]);

  const finishSuccess = async (data: LoginResponse) => {
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
      navigation.reset({ index: 0, routes: [{ name: "CompanySelection" }] });
    } catch {
      settled.current = false;
      Alert.alert("Sign in failed", "Could not save your session. Please try again.");
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; data?: LoginResponse };
      if (message.type === "login" && message.data?.access) {
        void finishSuccess(message.data);
      }
    } catch {
      // Ignore unrelated page messages.
    }
  };

  const handleNav = (nav: WebViewNavigation) => {
    if (!nav.url.includes("/select-tenant")) {
      return;
    }
    webRef.current?.injectJavaScript(READ_CAPTURED_LOGIN_JS);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.close}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign in to Glance</Text>
        <View style={styles.headerSpacer} />
      </View>
      <WebView
        ref={webRef}
        source={{ uri: WEB_LOGIN_URL }}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        originWhitelist={["*"]}
        injectedJavaScriptBeforeContentLoaded={WEB_LOGIN_CAPTURE_HOOK}
        onLoadEnd={() => webRef.current?.injectJavaScript(WEB_LOGIN_CAPTURE_HOOK)}
        onMessage={handleMessage}
        onNavigationStateChange={handleNav}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={styles.loadingText}>Opening sign-in window...</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    color: colors.interactive,
    fontSize: 16,
    fontWeight: "600",
    width: 64,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textHeading,
  },
  headerSpacer: {
    width: 64,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
});
