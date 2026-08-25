import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import { MoreScreenProps } from "../types/navigation";
import authService from "../services/auth.service";
import tenantService from "../services/tenant.service";
import type { Tenant, UserProfile } from "../types/models";
import { apiErrorMessage } from "../utils/errors";
import { API_ENV, FRONTEND_URL } from "../config/env";
import { APP_FEATURES, comingSoonCopy } from "../config/features";
import Screen from "../components/Screen";
import ListRow from "../components/ListRow";
import Card from "../components/Card";
import NotificationBell from "../components/NotificationBell";
import { colors, space } from "../theme";

export default function MoreScreen({ navigation }: MoreScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

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
          navigation.getParent()?.reset({ index: 0, routes: [{ name: "Login" }] });
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.username;
  const initial = (displayName || "G").trim().charAt(0).toUpperCase();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.heading}>More</Text>
        <NotificationBell onPress={() => navigation.navigate("Notifications")} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.meta}>{profile?.email || profile?.username}</Text>
            <Text style={styles.meta}>{tenant?.company_name}</Text>
            {profile?.role ? (
              <View style={styles.roleWrap}>
                <Text style={styles.role}>{profile.role}</Text>
              </View>
            ) : null}
          </View>
        </Card>

        <Text style={styles.section}>Workspace</Text>
        <ListRow
          icon="receipt-outline"
          label="Payables"
          subtitle="Amounts, status, and approvals"
          onPress={() => navigation.navigate("AP")}
        />
        <ListRow
          icon="notifications-outline"
          label="Notifications"
          subtitle="Approvals, failures, and mentions"
          onPress={() => navigation.navigate("Notifications")}
        />
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

        <Text style={styles.section}>Account</Text>
        <ListRow icon="log-out-outline" label="Sign out" danger onPress={handleSignOut} />

        <Text style={styles.env}>Glancewise · {API_ENV}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textHeading,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: 40,
  },
  profile: {
    flexDirection: "row",
    gap: space.lg,
    marginBottom: space.xl,
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.brand,
  },
  profileText: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textHeading,
  },
  meta: {
    marginTop: 2,
    fontSize: 14,
    color: colors.textSecondary,
  },
  roleWrap: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: colors.brandSoft,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  role: {
    color: colors.brand,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "capitalize",
  },
  section: {
    marginTop: space.sm,
    marginBottom: space.sm,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  env: {
    marginTop: space.xl,
    textAlign: "center",
    fontSize: 11,
    color: colors.textMuted,
  },
});
