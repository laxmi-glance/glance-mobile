import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface DashboardHeaderProps {
  title: string;
  companyName: string;
  userLabel: string;
  onChangeTenant: () => void;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
  onLogout?: () => void;
  onOpenThemeSettings?: () => void;
}

export default function DashboardHeader({
  title,
  companyName,
  userLabel,
  onChangeTenant,
  onProfilePress,
  onNotificationPress,
  onLogout,
  onOpenThemeSettings,
}: DashboardHeaderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const logoSource = require('../../../assets/favicon.png');
  const initial = userLabel.trim().charAt(0).toUpperCase() || 'U';
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleAvatarPress = () => {
    if (!onLogout && !onProfilePress) return;
    setProfileMenuOpen((prev) => !prev);
    onProfilePress?.();
  };

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={styles.brandWrap}>
          <Image source={logoSource} style={styles.brandLogo} resizeMode="contain" />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn} onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onOpenThemeSettings}>
            <Ionicons name="contrast-outline" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.avatarBtn} onPress={handleAvatarPress}>
            <Text style={styles.avatarText}>{initial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.titleRow}>
        <Ionicons name="business-outline" size={18} color={theme.colors.textMuted} />
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {profileMenuOpen ? (
        <>
          <Pressable style={styles.menuBackdrop} onPress={() => setProfileMenuOpen(false)} />
          <View style={styles.profileMenu}>
            <TouchableOpacity
              style={styles.menuCompanyCard}
              onPress={() => {
                setProfileMenuOpen(false);
                onChangeTenant();
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.menuCompanyHint}>Switch Company</Text>
              <Text style={styles.menuCompanyName} numberOfLines={1}>
                {companyName}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuLogoutBtn}
              onPress={() => {
                setProfileMenuOpen(false);
                onLogout?.();
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.menuLogoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}
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
    brandWrap: {
      flex: 1,
      alignItems: 'flex-start',
      justifyContent: 'center',
      marginRight: theme.spacing[3],
    },
    brandLogo: {
      width: 28,
      height: 28,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconBtn: {
      width: theme.button.height,
      height: theme.button.height,
      borderRadius: theme.button.radius,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      marginRight: theme.spacing[2],
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
    },
    avatarBtn: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryAccent,
      borderWidth: 1,
      borderColor: theme.colors.primaryAccent,
    },
    avatarText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.size.small,
      fontWeight: theme.typography.weight.bold,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    titleRow: {
      marginTop: theme.spacing[3],
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      marginLeft: theme.spacing[2],
      fontSize: theme.typography.size.lg,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamilyPrimary,
      flex: 1,
    },
    menuBackdrop: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10,
    },
    profileMenu: {
      position: 'absolute',
      top: 58,
      right: theme.spacing[4],
      width: 250,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing[3],
      zIndex: 11,
      shadowColor: theme.colors.textPrimary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      elevation: 8,
    },
    menuCompanyCard: {
      borderRadius: theme.button.radius,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.button.horizontalPadding,
      paddingVertical: theme.spacing[2],
      marginBottom: theme.spacing[3],
    },
    menuCompanyHint: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
      marginBottom: 2,
      fontWeight: theme.typography.weight.medium,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    menuCompanyName: {
      fontSize: theme.button.fontSize,
      color: theme.colors.primaryAccent,
      fontWeight: theme.button.fontWeight,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    menuLogoutBtn: {
      minHeight: theme.button.height,
      borderRadius: theme.button.radius,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.error,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuLogoutText: {
      color: theme.colors.error,
      fontSize: theme.button.fontSize,
      fontWeight: theme.button.fontWeight,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
  });
