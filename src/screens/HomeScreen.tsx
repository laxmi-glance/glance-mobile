import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert } from "react-native";
import { HomeScreenProps } from "../types/navigation";
import Screen from "../components/Screen";
import BrandMark from "../components/BrandMark";
import Button from "../components/Button";
import FeatureGrid from "../components/FeatureGrid";
import tenantService from "../services/tenant.service";
import authService from "../services/auth.service";
import type { Tenant, UserProfile } from "../types/models";
import { useDocumentUpload } from "../hooks/useDocumentUpload";
import { apiErrorMessage } from "../utils/errors";
import { colors, radius, space, type } from "../theme";
import type { AppFeature } from "../config/features";

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { uploading, upload } = useDocumentUpload();

  const load = useCallback(async () => {
    try {
      const [me, selected] = await Promise.all([
        authService.getProfile().catch(() => null),
        tenantService.getSelectedTenant(),
      ]);
      setProfile(me);
      setTenant(selected);
    } catch (error: unknown) {
      Alert.alert("Could not load workspace", apiErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const firstName = profile?.first_name || profile?.username || "there";

  return (
    <Screen>
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
        <View style={styles.hero}>
          <BrandMark size={36} framed />
          <View style={styles.heroText}>
            <Text style={styles.brand}>Glancewise</Text>
            <Text style={styles.workspace} numberOfLines={1}>
              {tenant?.company_name || "Workspace"}
            </Text>
          </View>
        </View>

        <Text style={styles.greeting}>Hello, {firstName}</Text>
        <Text style={styles.lead}>
          Capture documents, review processed amounts, and approve payables from your phone.
        </Text>

        <Button
          label="Upload document"
          icon="cloud-upload-outline"
          onPress={upload}
          loading={uploading}
          style={styles.uploadBtn}
        />
        <Text style={styles.uploadHint}>Camera, photos, or PDF</Text>

        <Text style={styles.sectionTitle}>Workspace</Text>
        <FeatureGrid
          onOpenFeature={(feature: AppFeature) => {
            if (feature.tab) {
              navigation.navigate(feature.tab);
              return;
            }
            if (feature.stack === "Notifications") {
              navigation.navigate("Notifications");
            }
          }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.xl,
    paddingBottom: 40,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.xl,
  },
  heroText: {
    flex: 1,
  },
  brand: {
    ...type.subtitle,
    color: colors.brand,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  workspace: {
    ...type.heading,
    marginTop: 2,
  },
  greeting: {
    ...type.title,
  },
  lead: {
    ...type.meta,
    marginTop: 6,
    marginBottom: space.xl,
    fontSize: 15,
    lineHeight: 22,
  },
  uploadBtn: {
    minHeight: 56,
    borderRadius: radius.lg,
  },
  uploadHint: {
    marginTop: space.sm,
    marginBottom: space.xxl,
    textAlign: "center",
    fontSize: 13,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textHeading,
    marginBottom: space.md,
  },
});
