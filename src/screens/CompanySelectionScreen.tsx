import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CompanySelectionScreenProps } from "../types/navigation";
import tenantService from "../services/tenant.service";
import authService from "../services/auth.service";
import type { Tenant } from "../types/models";
import { apiErrorMessage } from "../utils/errors";
import Screen from "../components/Screen";
import BrandMark from "../components/BrandMark";
import EmptyState from "../components/EmptyState";
import { colors, radius, space } from "../theme";

export default function CompanySelectionScreen({ navigation }: CompanySelectionScreenProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const stored = await authService.getStoredTenants();
      if (stored.length) {
        setTenants(stored);
      }
      const data = await tenantService.listTenants();
      setTenants(data);
    } catch (error: unknown) {
      const stored = await authService.getStoredTenants();
      if (stored.length) {
        setTenants(stored);
      } else {
        Alert.alert("Could not load workspaces", apiErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = async (tenant: Tenant) => {
    if (tenant.is_deactivated) {
      Alert.alert("Workspace unavailable", tenant.access_notice || "This company is not active.");
      return;
    }

    setSelectingId(tenant.tenant_id);
    try {
      await authService.selectTenant(tenant.tenant_id);
      await tenantService.persistSelectedTenant(tenant);
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (error: unknown) {
      Alert.alert("Could not open workspace", apiErrorMessage(error));
    } finally {
      setSelectingId(null);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await authService.logout();
          navigation.replace("Login");
        },
      },
    ]);
  };

  const renderTenant = ({ item }: { item: Tenant }) => {
    const disabled = Boolean(item.is_deactivated);
    const busy = selectingId === item.tenant_id;
    const initial = (item.company_name || "W").trim().charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.card, disabled && styles.cardDisabled]}
        onPress={() => handleSelectTenant(item)}
        disabled={disabled || Boolean(selectingId)}
        activeOpacity={0.8}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.companyName}>{item.company_name || "Untitled workspace"}</Text>
          <Text style={styles.meta}>
            {item.role}
            {item.lifecycle_status ? ` · ${item.lifecycle_status}` : ""}
          </Text>
          {disabled && item.access_notice ? (
            <Text style={styles.notice}>{item.access_notice}</Text>
          ) : null}
        </View>
        {busy ? (
          <ActivityIndicator color={colors.brand} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BrandMark size={32} framed />
          <View>
            {navigation.canGoBack() ? (
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.title}>Select workspace</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} hitSlop={8}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tenants}
        renderItem={renderTenant}
        keyExtractor={(item) => item.tenant_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="No workspaces" hint="No companies are linked to this account yet." />
        }
      />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    flex: 1,
    marginRight: space.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textHeading,
  },
  backText: {
    color: colors.interactive,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "600",
  },
  list: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.brand,
  },
  cardInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  notice: {
    marginTop: 8,
    fontSize: 13,
    color: colors.danger,
  },
});
