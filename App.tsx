import React, { useEffect, useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/types/navigation';
import authService from './src/services/auth.service';
import companyService from './src/services/company.service';
import { navigationRef, resetToLogin, onNavigationReady } from './src/navigation/navigationRef';
import { subscribeSessionExpired } from './src/core/auth/authEvents';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import CompanySelectionScreen from './src/screens/CompanySelectionScreen';
import ProcessingQueueScreen from './src/screens/ProcessingQueueScreen';
import DocumentDetailScreen from './src/screens/DocumentDetailScreen';
import UploadDocumentScreen from './src/screens/UploadDocumentScreen';
import ThemeSettingsScreen from './src/screens/ThemeSettingsScreen';
import { ThemeProvider, useTheme } from './src/theme';

const Stack = createStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { theme, resolvedTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Login');

  const screenOptions = useMemo(
    () => ({
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTintColor: theme.colors.textPrimary,
      headerTitleStyle: {
        fontFamily: theme.typography.fontFamilyPrimary,
        fontWeight: theme.typography.weight.bold,
      },
      headerShadowVisible: false,
      headerBackTitleVisible: false,
    }),
    [theme]
  );

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    return subscribeSessionExpired(resetToLogin);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isAuthenticated = await authService.isAuthenticated();
      
      if (isAuthenticated) {
        const selectedCompany = await companyService.getSelectedCompany();
        setInitialRoute(selectedCompany ? 'ProcessingQueue' : 'CompanySelection');
      } else {
        setInitialRoute('Login');
      }
    } catch (error) {
      setInitialRoute('Login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primaryAccent} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
        <Stack.Navigator initialRouteName={initialRoute} detachInactiveScreens={false} screenOptions={screenOptions}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CompanySelection" component={CompanySelectionScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProcessingQueue" component={ProcessingQueueScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="UploadDocument" component={UploadDocumentScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={{ title: 'Document Details' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
