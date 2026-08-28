import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, AppState, View, StyleSheet, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
  Urbanist_800ExtraBold,
} from "@expo-google-fonts/urbanist";
import { RootStackParamList } from "./src/types/navigation";
import authService from "./src/services/auth.service";
import { isEnabled as isBiometricEnabled } from "./src/services/biometric.service";
import { onSessionExpired } from "./src/core/sessionEvents";
import { ThemeProvider, colors, navigationFonts, type, useAppTheme } from "./src/theme";
import BrandMark from "./src/components/BrandMark";
import BiometricLock from "./src/components/BiometricLock";
import LoginScreen from "./src/screens/LoginScreen";
import WebAuthLoginScreen from "./src/screens/WebAuthLoginScreen";
import CompanySelectionScreen from "./src/screens/CompanySelectionScreen";
import DocumentDetailScreen from "./src/screens/DocumentDetailScreen";
import ApDocumentScreen from "./src/screens/ApDocumentScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import ProcessingQueueScreen from "./src/screens/ProcessingQueueScreen";
import ReportScreen from "./src/screens/ReportScreen";
import ScannerScreen from "./src/screens/ScannerScreen";
import MainTabs from "./src/navigation/MainTabs";
import rbacService from "./src/services/rbac.service";

const Stack = createNativeStackNavigator<RootStackParamList>();
const BACKGROUND_LOCK_MS = 45_000;

function Splash() {
  return (
    <View style={styles.loading}>
      <BrandMark size={72} />
      <Text style={styles.loadingTitle}>Glancewise</Text>
      <ActivityIndicator size="small" color={colors.white} style={styles.spinner} />
    </View>
  );
}

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>("Login");
  const [fontsLoaded, fontError] = useFonts({
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
    Urbanist_800ExtraBold,
  });
  const backgroundedAt = useRef<number | null>(null);

  const unlock = useCallback(() => {
    setLocked(false);
  }, []);

  const signInElsewhere = useCallback(async () => {
    await authService.logout();
    setLocked(false);
    navigationRef.current?.reset({ index: 0, routes: [{ name: "Login" }] });
  }, []);

  useEffect(() => {
    checkAuthStatus();
    return onSessionExpired(() => {
      setLocked(false);
      navigationRef.current?.reset({ index: 0, routes: [{ name: "Login" }] });
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "background") {
        backgroundedAt.current = Date.now();
        return;
      }
      if (next !== "active") {
        return;
      }
      const started = backgroundedAt.current;
      backgroundedAt.current = null;
      if (!started || Date.now() - started < BACKGROUND_LOCK_MS) {
        return;
      }
      const routeName = navigationRef.current?.getCurrentRoute()?.name;
      if (routeName === "Login" || routeName === "WebAuthLogin") {
        return;
      }
      void (async () => {
        const [authed, on] = await Promise.all([
          authService.isAuthenticated(),
          isBiometricEnabled(),
        ]);
        if (authed && on) {
          setLocked(true);
        }
      })();
    });
    return () => sub.remove();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isAuthenticated = await authService.isAuthenticated();
      if (!isAuthenticated) {
        setInitialRoute("Login");
        setLocked(false);
        return;
      }
      const [hasTenant, biometricOn] = await Promise.all([
        authService.hasSelectedTenant(),
        isBiometricEnabled(),
      ]);
      setInitialRoute(hasTenant ? "Main" : "CompanySelection");
      setLocked(biometricOn);
      if (hasTenant) {
        void rbacService.sync().catch(() => undefined);
      }
    } catch {
      setInitialRoute("Login");
      setLocked(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fontsReady = fontsLoaded || Boolean(fontError);
  const showSplash = isLoading || !fontsReady;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          {showSplash ? (
            <Splash />
          ) : (
            <>
              <ThemedNavigation navigationRef={navigationRef} initialRoute={initialRoute} />
              {locked ? (
                <BiometricLock onUnlock={unlock} onSignInElsewhere={() => void signInElsewhere()} />
              ) : null}
            </>
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedNavigation({
  navigationRef,
  initialRoute,
}: {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
  initialRoute: keyof RootStackParamList;
}) {
  const { colors: themeColors, isDark } = useAppTheme();
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: themeColors.brand,
      background: themeColors.background,
      card: themeColors.surface,
      text: themeColors.textHeading,
      border: themeColors.border,
      notification: themeColors.danger,
    },
  };

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: { backgroundColor: themeColors.surface },
            headerTintColor: themeColors.textHeading,
            headerTitleStyle: navigationFonts.headerTitle,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: themeColors.background },
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="WebAuthLogin"
            component={WebAuthLoginScreen}
            options={{ headerShown: false, presentation: "modal" }}
          />
          <Stack.Screen
            name="CompanySelection"
            component={CompanySelectionScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="DocumentDetail"
            component={DocumentDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ApDocument"
            component={ApDocumentScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Queue"
            component={ProcessingQueueScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Scanner"
            component={ScannerScreen}
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
              animation: "slide_from_bottom",
              contentStyle: { backgroundColor: "#000000" },
              statusBarStyle: "light",
            }}
          />
          <Stack.Screen name="Report" component={ReportScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.brandNavy,
  },
  loadingTitle: {
    ...type.title,
    marginTop: 16,
    color: colors.white,
  },
  spinner: {
    marginTop: 20,
  },
});
