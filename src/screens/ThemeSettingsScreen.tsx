import React, { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemeSettingsScreenProps } from '../types/navigation';
import { ThemeMode, useTheme } from '../theme';

const OPTIONS: Array<{ key: ThemeMode; label: string; hint: string }> = [
  { key: 'light', label: 'Light', hint: 'Always use the light theme.' },
  { key: 'dark', label: 'Dark', hint: 'Always use the dark theme.' },
  { key: 'auto', label: 'Auto', hint: 'Follow your device appearance setting.' },
];

export default function ThemeSettingsScreen({ navigation }: ThemeSettingsScreenProps) {
  const { theme, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.9}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Appearance</Text>
      </View>

      <View style={styles.content}>
        {OPTIONS.map((option) => {
          const isActive = mode === option.key;
          const optionCardStyle = [styles.optionCard, isActive ? styles.optionCardActive : null];
          const optionLabelStyle = [styles.optionLabel, isActive ? styles.optionLabelActive : null];
          const radioOuterStyle = [styles.radioOuter, isActive ? styles.radioOuterActive : null];
          return (
            <TouchableOpacity
              key={option.key}
              style={optionCardStyle}
              onPress={() => void setMode(option.key)}
              activeOpacity={0.9}
            >
              <View style={styles.optionTextWrap}>
                <Text style={optionLabelStyle}>{option.label}</Text>
                <Text style={styles.optionHint}>{option.hint}</Text>
              </View>
              <View style={radioOuterStyle}>
                {isActive ? <View style={styles.radioInner} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surfaceMuted,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backIconButton: {
      width: theme.button.height,
      height: theme.button.height,
      borderRadius: theme.button.radius,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      marginRight: theme.spacing[3],
    },
    title: {
      fontSize: theme.typography.size.lg,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    content: {
      padding: theme.spacing[4],
      gap: theme.spacing[3],
    },
    optionCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing[4],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionCardActive: {
      borderColor: theme.colors.primaryAccent,
    },
    optionTextWrap: {
      flex: 1,
      paddingRight: theme.spacing[3],
    },
    optionLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.size.md,
      fontWeight: theme.typography.weight.semibold,
      fontFamily: theme.typography.fontFamilyPrimary,
      marginBottom: theme.spacing[1],
    },
    optionLabelActive: {
      color: theme.colors.primaryAccent,
    },
    optionHint: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.size.small,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuterActive: {
      borderColor: theme.colors.primaryAccent,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primaryAccent,
    },
  });
