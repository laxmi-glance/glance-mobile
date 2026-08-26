import React, { useCallback, useEffect, useState } from "react";
import { Text, ScrollView, StyleSheet, RefreshControl, Alert } from "react-native";
import { HomeScreenProps } from "../types/navigation";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";
import FeatureGrid from "../components/FeatureGrid";
import tenantService from "../services/tenant.service";
import companyService from "../services/company.service";
import authService from "../services/auth.service";
import type { UserProfile } from "../types/models";
import { apiErrorMessage } from "../utils/errors";
import { colors, space } from "../theme";
import type { AppFeature } from "../config/features";
import { useUnreadCount } from "../hooks/useUnreadCount";

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const unread = useUnreadCount();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [companyName, setCompanyName] = useState("Workspace");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, selected, company] = await Promise.all([
        authService.getProfile().catch(() => null),
        tenantService.getSelectedTenant(),
        companyService.getCurrent(),
      ]);
      setProfile(me);
      setCompanyName(company?.name || selected?.company_name || "Workspace");
      setLogoUri(
        company?.logo || company?.logo_url || selected?.logo || selected?.logo_url || null
      );
    } catch (error: unknown) {
      Alert.alert("Could not load workspace", apiErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.username ||
    "there";

  return (
    <Screen edges={[]}>
      <PageHeader
        title={companyName}
        subtitle={`Hello, ${displayName}`}
        iconUri={logoUri}
        supportingIcon="notifications-outline"
        supportingAccessibilityLabel="Notifications"
        supportingBadge={unread}
        onSupportingPress={() => navigation.navigate("Notifications")}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <Text style={styles.sectionTitle}>Workspace</Text>
        <FeatureGrid
          onOpenFeature={(feature: AppFeature) => {
            if (feature.tab) {
              navigation.navigate(feature.tab);
              return;
            }
            if (feature.stack === "Notifications" || feature.stack === "Queue") {
              navigation.navigate(feature.stack);
            }
          }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textHeading,
    marginBottom: space.md,
  },
});
