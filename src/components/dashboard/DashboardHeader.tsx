import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme';

interface DashboardHeaderProps {
  title: string;
  companyName: string;
  userLabel: string;
  onChangeTenant: () => void;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
}

export default function DashboardHeader({
  title,
  companyName,
  userLabel,
  onChangeTenant,
  onProfilePress,
  onNotificationPress,
}: DashboardHeaderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const initial = userLabel.trim().charAt(0).toUpperCase() || 'U';

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.companySwitcher} onPress={onChangeTenant} activeOpacity={0.85}>
          <Text style={styles.companyHint}>CURRENT COMPANY</Text>
          <View style={styles.companyValueRow}>
            <Text style={styles.companyName} numberOfLines={1}>
              {companyName}
            </Text>
            <Text style={styles.companyChevron}>▼</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn} onPress={onNotificationPress}>
            <Text style={styles.iconText}>🔔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.avatarBtn} onPress={onProfilePress}>
            <Text style={styles.avatarText}>{initial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    root: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing[4],
      paddingTop: theme.spacing[3],
      paddingBottom: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    companySwitcher: {
      flex: 1,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[2] + 2,
      marginRight: theme.spacing[3],
    },
    companyHint: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
      letterSpacing: 0.4,
      marginBottom: 2,
      fontWeight: theme.typography.weight.medium,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    companyValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    companyName: {
      flex: 1,
      fontSize: theme.typography.size.lg,
      color: theme.colors.primaryAccent,
      fontWeight: theme.typography.weight.semibold,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    companyChevron: {
      marginLeft: theme.spacing[2],
      fontSize: theme.typography.size.xs,
      color: theme.colors.primaryAccent,
      fontWeight: theme.typography.weight.bold,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceElevated,
      marginRight: theme.spacing[2],
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconText: {
      fontSize: theme.typography.size.body,
    },
    avatarBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryAccent,
    },
    avatarText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.size.small,
      fontWeight: theme.typography.weight.bold,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    title: {
      marginTop: theme.spacing[3],
      fontSize: theme.typography.size['2xl'],
      fontWeight: theme.typography.weight.bold,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
  });
