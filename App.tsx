import React, { useEffect, useRef, useState } from "react";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootStackParamList } from "./src/types/navigation";
import authService from "./src/services/auth.service";
import { onSessionExpired } from "./src/core/sessionEvents";
import { colors } from "./src/theme";
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

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>("Login");

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

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <BrandMark size={72} />
        <Text style={styles.loadingTitle}>Glancewise</Text>
        <ActivityIndicator size="small" color={colors.white} style={styles.spinner} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.textHeading,
              headerTitleStyle: { fontWeight: "700" },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
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
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
    marginTop: 16,
    fontSize: 22,
    fontWeight: "700",
    color: colors.white,
  },
  spinner: {
    marginTop: 20,
  },
});
