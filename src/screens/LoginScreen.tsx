import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LoginScreenProps } from '../types/navigation';
import authService from '../services/auth.service';
import { useTheme } from '../theme';
import AppButton from '../components/common/AppButton';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const logoSource = require('../../assets/favicon.png');
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
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
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

          <AppButton
            label="Sign In"
            variant="primary"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
          />
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
    alignItems: 'center',
    paddingHorizontal: theme.spacing[6],
  },
  logo: {
    width: 64,
    height: 64,
    alignSelf: 'center',
    marginBottom: theme.spacing[12],
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
    maxWidth: 420,
    alignSelf: 'center',
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
    marginTop: theme.spacing[2],
  },
  });
