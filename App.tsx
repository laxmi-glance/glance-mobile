import React, { useEffect, useRef, useState } from "react";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
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
import { onSessionExpired } from "./src/core/sessionEvents";
import { ThemeProvider, colors, navigationFonts, type, useAppTheme } from "./src/theme";
import BrandMark from "./src/components/BrandMark";
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
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>("Login");
  const [fontsLoaded, fontError] = useFonts({
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
    Urbanist_800ExtraBold,
  });

  useEffect(() => {
    checkAuthStatus();
    return onSessionExpired(() => {
      navigationRef.current?.reset({ index: 0, routes: [{ name: "Login" }] });
    });
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isAuthenticated = await authService.isAuthenticated();
      if (!isAuthenticated) {
        setInitialRoute("Login");
        return;
      }
      const hasTenant = await authService.hasSelectedTenant();
      setInitialRoute(hasTenant ? "Main" : "CompanySelection");
      if (hasTenant) {
        void rbacService.sync().catch(() => undefined);
      }
    } catch {
      setInitialRoute("Login");
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
            <ThemedNavigation navigationRef={navigationRef} initialRoute={initialRoute} />
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
