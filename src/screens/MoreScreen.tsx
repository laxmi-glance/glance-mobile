import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
  Image,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { MoreScreenProps } from "../types/navigation";
import authService from "../services/auth.service";
import tenantService from "../services/tenant.service";
import type { Tenant, UserProfile } from "../types/models";
import { apiErrorMessage } from "../utils/errors";
import { API_ENV, FRONTEND_URL } from "../config/env";
import { APP_FEATURES, comingSoonCopy } from "../config/features";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";
import ListRow from "../components/ListRow";
import {
  THEME_AUTO,
  radius,
  space,
  useAppTheme,
  useThemedStyles,
  type ThemeTokens,
} from "../theme";
import { useUnreadCount } from "../hooks/useUnreadCount";
import ThemePicker from "../components/ThemePicker";

const PROFILE_WEB_URL = `${FRONTEND_URL.replace(/\/+$/, "")}/user/user-profile`;
const PANEL_BG = "#1C1C1E";
const PANEL_BORDER = "rgba(167, 139, 250, 0.28)";
const USERNAME_COLOR = "#B4B7E8";
const ROLE_BG = "rgba(167, 139, 250, 0.16)";
const ICON_MUTED = "#C7C7CC";

function formatRole(role?: string | null) {
  const value = (role || "").trim();
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export default function MoreScreen({ navigation }: MoreScreenProps) {
  const unread = useUnreadCount();
  const { colors, setTheme, hydrateFromServer } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [me, selected] = await Promise.all([
          authService.getProfile(),
          tenantService.getSelectedTenant(),
        ]);
        setProfile(me);
        setTenant(selected);
      } catch (error: unknown) {
        Alert.alert("Could not load profile", apiErrorMessage(error));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setPhotoFailed(false);
  }, [profile?.profile_pic_url, profile?.profile_pic]);

  useFocusEffect(
    useCallback(() => {
      void hydrateFromServer();
    }, [hydrateFromServer])
  );

  const handleSwitchWorkspace = () => {
    navigation.getParent()?.navigate("CompanySelection");
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await authService.logout();
          await setTheme(THEME_AUTO, { syncBackend: false });
          navigation.getParent()?.reset({ index: 0, routes: [{ name: "Login" }] });
        },
      },
    ]);
  };

  const handleOpenSettings = () => {
    void Linking.openURL(PROFILE_WEB_URL);
  };

  if (loading) {
    return (
      <Screen edges={[]}>
        <PageHeader title="Account" subtitle="Profile and workspace" icon="person-circle-outline" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </Screen>
    );
  }

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.username ||
    "User";
  const username = (profile?.username || "").replace(/^@/, "").trim();
  const roleLabel = formatRole(profile?.role || tenant?.role);
  // `profile_pic` is the short-lived signed URL; `profile_pic_url` is the private S3 key.
  const photoUri = profile?.profile_pic || null;
  const showPhoto = Boolean(photoUri) && !photoFailed;
  const initial = displayName.trim().charAt(0).toUpperCase() || "G";

  return (
    <Screen edges={[]}>
      <PageHeader
        title="Account"
        subtitle="Profile and workspace"
        icon="person-circle-outline"
        supportingIcon="notifications-outline"
        supportingAccessibilityLabel="Notifications"
        supportingBadge={unread}
        onSupportingPress={() => navigation.navigate("Notifications")}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          <View style={styles.profileMain}>
            <View style={styles.avatarRing}>
              {showPhoto ? (
                <Image
                  source={{ uri: photoUri as string }}
                  style={styles.avatarPhoto}
                  resizeMode="cover"
                  accessibilityLabel="Profile photo"
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              )}
            </View>
            <View style={styles.identity}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              {username ? (
                <Text style={styles.username} numberOfLines={1}>
                  @{username}
                </Text>
              ) : null}
              {tenant?.company_name ? (
                <Text style={styles.company} numberOfLines={1}>
                  {tenant.company_name}
                </Text>
              ) : null}
              {roleLabel ? (
                <View style={styles.roleWrap}>
                  <Text style={styles.role}>{roleLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.toolbar}>
            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={handleOpenSettings}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={6}
            >
              <Ionicons name="settings-outline" size={18} color={ICON_MUTED} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={handleSignOut}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              hitSlop={6}
            >
              <Ionicons name="log-out-outline" size={18} color={ICON_MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.section}>Appearance</Text>
        <ThemePicker />

        <Text style={styles.section}>Workspace</Text>
        <ListRow
          icon="swap-horizontal-outline"
          label="Switch workspace"
          subtitle={tenant?.company_name}
          onPress={handleSwitchWorkspace}
        />
        <ListRow
          icon="open-outline"
          label="Open web app"
          subtitle="Full accounting workspace"
          onPress={() => Linking.openURL(FRONTEND_URL)}
        />

        <Text style={styles.section}>Coming next</Text>
        {APP_FEATURES.filter((feature) => !feature.available).map((feature) => (
          <ListRow
            key={feature.id}
            icon={feature.icon}
            label={feature.title}
            subtitle={feature.subtitle}
            onPress={() => Alert.alert("Coming soon", comingSoonCopy(feature.title))}
          />
        ))}

        <Text style={styles.env}>Glancewise · {API_ENV}</Text>
      </ScrollView>
    </Screen>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    content: {
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      paddingBottom: 40,
    },
    profile: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: space.md,
      marginBottom: space.xl,
      paddingVertical: 16,
      paddingHorizontal: 14,
      backgroundColor: PANEL_BG,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: PANEL_BORDER,
    },
    profileMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      minWidth: 0,
    },
    avatarRing: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: "#C4B5FD",
      overflow: "hidden",
      backgroundColor: "#3A3A5C",
    },
    avatarPhoto: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    avatarFallback: {
      flex: 1,
      borderRadius: 22,
      backgroundColor: "#3A3A5C",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      ...type.heading,
      color: colors.white,
    },
    identity: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      ...type.subtitle,
      color: colors.white,
      letterSpacing: -0.2,
    },
    username: {
      ...type.label,
      marginTop: 2,
      color: USERNAME_COLOR,
    },
    company: {
      ...type.caption,
      marginTop: 6,
      color: colors.textPlaceholder,
    },
    roleWrap: {
      alignSelf: "flex-start",
      marginTop: 8,
      backgroundColor: ROLE_BG,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: PANEL_BORDER,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    role: {
      ...type.overline,
      color: USERNAME_COLOR,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      padding: 2,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.14)",
      backgroundColor: "rgba(255,255,255,0.04)",
    },
    toolbarBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    section: {
      ...type.overline,
      marginTop: space.sm,
      marginBottom: space.sm,
      marginLeft: 4,
      textTransform: "uppercase",
    },
    env: {
      ...type.overline,
      marginTop: space.xl,
      textAlign: "center",
    },
  };
}
