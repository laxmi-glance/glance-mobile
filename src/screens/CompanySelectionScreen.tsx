import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CompanySelectionScreenProps } from "../types/navigation";
import tenantService from "../services/tenant.service";
import authService from "../services/auth.service";
import type { Tenant } from "../types/models";
import { apiErrorMessage } from "../utils/errors";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";
import CompanyLogo from "../components/CompanyLogo";
import EmptyState from "../components/EmptyState";
import {
  THEME_AUTO,
  radius,
  space,
  useAppTheme,
  useThemedStyles,
  type ThemeTokens,
} from "../theme";

function formatRole(role?: string | null) {
  const value = (role || "").trim().replace(/_/g, " ");
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export default function CompanySelectionScreen({ navigation }: CompanySelectionScreenProps) {
  const { colors, hydrateFromServer, setTheme } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const canGoBack = navigation.canGoBack();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const loadTenants = useCallback(async (isRefresh = false) => {
    try {
      const [stored, current] = await Promise.all([
        authService.getStoredTenants(),
        tenantService.getSelectedTenant(),
      ]);
      if (stored.length && !isRefresh) {
        setTenants(stored);
      }
      if (current?.tenant_id) {
        setSelectedId(current.tenant_id);
      }
      const data = await tenantService.listTenants();
      setTenants(data);
      const latest = data.find((tenant) => tenant.is_current)?.tenant_id || current?.tenant_id;
      if (latest) {
        setSelectedId(latest);
      }
    } catch (error: unknown) {
      const stored = await authService.getStoredTenants();
      if (stored.length) {
        setTenants(stored);
      } else {
        Alert.alert("Could not load workspaces", apiErrorMessage(error));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  const openWorkspace = () => {
    if (canGoBack) {
      navigation.goBack();
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  const handleSelectTenant = async (tenant: Tenant) => {
    if (tenant.is_deactivated) {
      Alert.alert("Workspace unavailable", tenant.access_notice || "This company is not active.");
      return;
    }
    if (selectedId && tenant.tenant_id === selectedId) {
      openWorkspace();
      return;
    }

    setSelectingId(tenant.tenant_id);
    try {
      await authService.selectTenant(tenant.tenant_id);
      await tenantService.persistSelectedTenant({ ...tenant, is_current: true });
      await hydrateFromServer();
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
          await setTheme(THEME_AUTO, { syncBackend: false });
          navigation.replace("Login");
        },
      },
    ]);
  };

  const renderTenant = ({ item, index }: { item: Tenant; index: number }) => {
    const disabled = Boolean(item.is_deactivated);
    const busy = selectingId === item.tenant_id;
    const current = Boolean(selectedId && item.tenant_id === selectedId);
    const role = formatRole(item.role);
    const logoUri = item.logo || item.logo_url || null;

    return (
      <TouchableOpacity
        style={[
          styles.row,
          current && styles.rowCurrent,
          disabled && styles.rowDisabled,
          index === 0 && styles.rowFirst,
          index === tenants.length - 1 && styles.rowLast,
        ]}
        onPress={() => handleSelectTenant(item)}
        disabled={disabled || Boolean(selectingId)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ selected: current, disabled }}
        accessibilityLabel={item.company_name || "Workspace"}
      >
        <CompanyLogo uri={logoUri} size={40} />
        <View style={styles.rowInfo}>
          <Text style={styles.companyName} numberOfLines={1}>
            {item.company_name || "Untitled workspace"}
          </Text>
          <View style={styles.metaRow}>
            {role ? (
              <View style={[styles.rolePill, current && styles.rolePillCurrent]}>
                <Text style={[styles.roleText, current && styles.roleTextCurrent]}>{role}</Text>
              </View>
            ) : null}
            {item.lifecycle_status && item.lifecycle_status !== "ACTIVE" ? (
              <Text style={styles.lifecycle}>{item.lifecycle_status}</Text>
            ) : null}
          </View>
          {disabled && item.access_notice ? (
            <Text style={styles.notice} numberOfLines={2}>
              {item.access_notice}
            </Text>
          ) : null}
        </View>
        {busy ? (
          <ActivityIndicator color={colors.brand} />
        ) : current ? (
          <View style={styles.check}>
            <Ionicons name="checkmark" size={16} color={colors.white} />
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Screen edges={["bottom"]}>
      <PageHeader
        title="Workspaces"
        subtitle={canGoBack ? "Switch to another company" : "Choose a company to continue"}
        icon="swap-horizontal-outline"
        showBack={canGoBack}
        onBack={() => navigation.goBack()}
        menuActions={
          canGoBack
            ? [{ key: "refresh", label: "Refresh", onPress: () => void loadTenants(true) }]
            : [
                { key: "refresh", label: "Refresh", onPress: () => void loadTenants(true) },
                { key: "signout", label: "Sign out", destructive: true, onPress: handleLogout },
              ]
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={tenants}
          renderItem={renderTenant}
          keyExtractor={(item) => item.tenant_id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadTenants(true);
              }}
            />
          }
          ListHeaderComponent={
            tenants.length ? <Text style={styles.section}>Companies</Text> : null
          }
          ListEmptyComponent={
            <EmptyState title="No workspaces" hint="No companies are linked to this account yet." />
          }
          ListFooterComponent={
            canGoBack ? null : (
              <TouchableOpacity
                onPress={handleLogout}
                style={styles.signOut}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
              >
                <Text style={styles.signOutText}>Sign out</Text>
              </TouchableOpacity>
            )
          }
        />
      )}
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
    list: {
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      paddingBottom: space.xxxl,
    },
    section: {
      ...type.overline,
      marginBottom: space.sm,
      marginLeft: 4,
      textTransform: "uppercase",
    },
    row: {
      backgroundColor: colors.surface,
      paddingVertical: 14,
      paddingHorizontal: space.lg,
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.border,
    },
    rowCurrent: {
      backgroundColor: colors.brandSoft,
    },
    rowDisabled: {
      opacity: 0.55,
    },
    rowFirst: {
      borderTopWidth: 1,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    },
    rowLast: {
      borderBottomWidth: 1,
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 40 + space.lg + space.md,
    },
    rowInfo: {
      flex: 1,
      minWidth: 0,
    },
    companyName: {
      ...type.subtitle,
      color: colors.textHeading,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 6,
    },
    rolePill: {
      alignSelf: "flex-start",
      backgroundColor: colors.surfaceMuted,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    rolePillCurrent: {
      backgroundColor: colors.white,
    },
    roleText: {
      ...type.overline,
      color: colors.brand,
    },
    roleTextCurrent: {
      color: colors.brand,
    },
    lifecycle: {
      ...type.overline,
      textTransform: "capitalize",
    },
    notice: {
      ...type.caption,
      marginTop: 6,
      color: colors.danger,
    },
    check: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    signOut: {
      alignItems: "center",
      paddingVertical: space.xl,
    },
    signOutText: {
      ...type.cardTitle,
      color: colors.danger,
    },
  };
}
