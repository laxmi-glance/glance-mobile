import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { useTheme } from '../../theme';

type ButtonVariant = 'primary' | 'outline' | 'danger';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle | ViewStyle[];
}

export default function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
}: AppButtonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.outline,
        variant === 'danger' ? styles.danger : null,
        pressed && !isDisabled
          ? variant === 'primary'
            ? styles.primaryPressed
            : variant === 'danger'
              ? styles.dangerPressed
              : styles.outlinePressed
          : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.onPrimary : theme.colors.primaryAccent} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'primary' ? styles.primaryLabel : styles.outlineLabel,
            variant === 'danger' ? styles.dangerLabel : null,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    base: {
      minHeight: theme.button.height,
      borderRadius: theme.button.radius,
      borderWidth: 1,
      paddingHorizontal: theme.button.horizontalPadding,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    primary: {
      backgroundColor: theme.colors.primaryAccent,
      borderColor: theme.colors.primaryAccent,
    },
    primaryPressed: {
      backgroundColor: theme.colors.primaryAccentActive,
      borderColor: theme.colors.primaryAccentActive,
    },
    outline: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderStrong,
    },
    outlinePressed: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.primaryAccent,
    },
    danger: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.error,
    },
    dangerPressed: {
      backgroundColor: theme.colors.statusRejectedBg,
      borderColor: theme.colors.error,
    },
    disabled: {
      opacity: 0.6,
    },
    label: {
      fontFamily: theme.typography.fontFamilyPrimary,
      fontSize: theme.button.fontSize,
      fontWeight: theme.button.fontWeight,
      lineHeight: 22,
    },
    primaryLabel: {
      color: theme.colors.onPrimary,
    },
    outlineLabel: {
      color: theme.colors.textSecondary,
    },
    dangerLabel: {
      color: theme.colors.error,
    },
  });
