import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LoginScreenProps } from '../types/navigation';
import authService from '../services/auth.service';
import { useTheme } from '../theme';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      await authService.login({ username: username.trim(), password });
      // Navigate to company selection after successful login
      navigation.replace('CompanySelection');
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.response?.data?.detail || 'Invalid credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Glancewise</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Username or email"
            placeholderTextColor={theme.colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceMuted,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[6],
  },
  title: {
    fontSize: theme.typography.size['3xl'],
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
    textAlign: 'center',
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  subtitle: {
    fontSize: theme.typography.size.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing[12],
    textAlign: 'center',
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    fontSize: theme.typography.size.body,
    marginBottom: theme.spacing[4],
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  button: {
    backgroundColor: theme.colors.primaryAccent,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing[3] + 2,
    alignItems: 'center',
    marginTop: theme.spacing[2],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontSize: theme.typography.size.body,
    fontWeight: theme.typography.weight.semibold,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  });
