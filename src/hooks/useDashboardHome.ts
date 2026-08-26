import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import {
  DOC_PROCESSING_ROLES,
  DASHBOARD_PERIODS,
  getLayoutSections,
  getPeriodLabel,
  resolveLayoutKey,
} from "../config/dashboard";
import authService from "../services/auth.service";
import companyService from "../services/company.service";
import dashboardService from "../services/dashboard.service";
import financialDocumentService from "../services/financialDocument.service";
import preferencesService from "../services/preferences.service";
import tenantService from "../services/tenant.service";
import { useAppTheme } from "../theme";
import { useRbac } from "./useRbac";
import { useUnreadCount } from "./useUnreadCount";
import {
  getVisibleSections,
  isDefaultLayoutConfig,
  parseLayoutConfig,
} from "../utils/dashboardLayout";
import { getDisplayFirstName, getGreeting } from "../utils/greeting";
import { rbacAllows } from "../utils/rbac";
import notificationService from "../services/notification.service";
import type {
  CompleteDashboard,
  DashboardPeriod,
  DashboardPerms,
  DashboardSecondary,
  LayoutConfig,
  UserPreferences,
} from "../types/dashboard";
import type { UserProfile } from "../types/models";

const PERIOD_KEY = "glance.dashboard.period";
const idleList = { loading: false, data: [] };
const idleValue = { loading: false, data: null };

const emptySecondary = (): DashboardSecondary => ({
  actionItems: { ...idleList },
  myPendingApprovals: { ...idleValue },
  bankAccounts: { ...idleList },
  plData: { ...idleValue },
  balanceSheet: { ...idleValue },
  cashFlowTrend: { ...idleValue },
  workingCapital: { ...idleValue },
  complianceEvents: { ...idleList },
  tdsSummary: { ...idleValue },
  priorYearBenchmark: { ...idleValue },
  inventorySummary: { ...idleValue },
  processingStats: { ...idleValue },
  topVendors: { ...idleList },
  topCustomers: { ...idleList },
  recommendationStats: { ...idleValue },
  userActivity: { ...idleList },
  recentJE: { ...idleList },
  erpSync: { ...idleValue },
  notifications: { ...idleList },
});

function isPeriod(value: string | null): value is DashboardPeriod {
  return value === "fy" || value === "mtd" || value === "qtd" || value === "30d";
}

export function useDashboardHome() {
  const rbac = useRbac();
  const unread = useUnreadCount();
  const { applyFromPreferences, getThemeWriteEpoch } = useAppTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [companyName, setCompanyName] = useState("Workspace");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [period, setPeriodState] = useState<DashboardPeriod>("30d");
  const [sections, setSections] = useState<string[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({ order: [], hidden: [] });
  const [defaultSections, setDefaultSections] = useState<string[]>([]);
  const [layoutKey, setLayoutKey] = useState("executive");
  const [mobileSectionsMap, setMobileSectionsMap] = useState<
    Record<string, LayoutConfig | string[]>
  >({});
  const [isCustomized, setIsCustomized] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [complete, setComplete] = useState<CompleteDashboard | null>(null);
  const [secondary, setSecondary] = useState<DashboardSecondary>(emptySecondary);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const perms: DashboardPerms = useMemo(() => {
    const role = String(rbac.role || "").toLowerCase();
    return {
      role,
      isOwnerOrAdmin: role === "owner" || role === "admin",
      canApprove: rbac.canApprove,
      canUpload: rbac.canUpload,
      canViewStatutoryReports: rbacAllows(rbac.config, rbac.role, "reports", "view"),
      canViewBanking: rbacAllows(rbac.config, rbac.role, "bank", "view"),
      canViewGlList: rbacAllows(rbac.config, rbac.role, "ledger", "view"),
      canViewApInsights: rbac.canViewAp,
      canViewArInsights:
        rbacAllows(rbac.config, rbac.role, "financial_document", "view_team") ||
        rbacAllows(rbac.config, rbac.role, "financial_document", "view_all"),
      canAccessDocProcessing: DOC_PROCESSING_ROLES.includes(role),
      canViewTds: rbacAllows(rbac.config, rbac.role, "tds", "view"),
    };
  }, [rbac.role, rbac.canApprove, rbac.canUpload, rbac.canViewAp, rbac.config]);

  const setPeriod = useCallback((next: DashboardPeriod) => {
    setPeriodState(next);
    void AsyncStorage.setItem(PERIOD_KEY, next);
  }, []);

  const cyclePeriod = useCallback(() => {
    const index = DASHBOARD_PERIODS.findIndex((item) => item.value === period);
    const next = DASHBOARD_PERIODS[(index + 1) % DASHBOARD_PERIODS.length];
    setPeriod(next.value);
  }, [period, setPeriod]);

  const load = useCallback(async () => {
    if (rbac.loading) {
      return;
    }
    setError(null);
    try {
      const fetchEpoch = getThemeWriteEpoch();
      const storedPeriod = await AsyncStorage.getItem(PERIOD_KEY);
      const activePeriod: DashboardPeriod = isPeriod(storedPeriod) ? storedPeriod : period;
      if (activePeriod !== period) {
        setPeriodState(activePeriod);
      }

      const [me, selected, company, prefs, stats, snapshot] = await Promise.all([
        authService.getProfile().catch(() => null),
        tenantService.getSelectedTenant(),
        companyService.getCurrent(),
        preferencesService.get().catch(() => ({}) as UserPreferences),
        financialDocumentService.getApStats().catch(() => null),
        dashboardService.getComplete().catch(() => null),
      ]);

      setProfile(me);
      setCompanyName(company?.name || selected?.company_name || "Workspace");
      setLogoUri(
        company?.logo || company?.logo_url || selected?.logo || selected?.logo_url || null
      );
      setPendingCount(stats?.pending || 0);
      setComplete(snapshot);
      void applyFromPreferences(prefs, fetchEpoch);

      const defaultLayout = getLayoutSections(me?.role || rbac.role);
      const persona = resolveLayoutKey(me?.role || rbac.role);
      const savedMap = prefs?.mobile_dashboard_sections || {};
      const saved = savedMap[persona];
      const config = parseLayoutConfig(saved, defaultLayout);
      setDefaultSections(defaultLayout);
      setLayoutKey(persona);
      setMobileSectionsMap(savedMap);
      setLayoutConfig(config);
      setSections(getVisibleSections(config));
      setIsCustomized(!isDefaultLayoutConfig(config, defaultLayout));

      const visible = new Set(getVisibleSections(config));
      const next = emptySecondary();
      const tasks: Promise<void>[] = [];

      const assign = <K extends keyof DashboardSecondary>(key: K, value: DashboardSecondary[K]) => {
        next[key] = value;
      };

      if (visible.has("actionInbox") || visible.has("myWork")) {
        tasks.push(
          dashboardService
            .getActionItems()
            .then((data) => assign("actionItems", { loading: false, data }))
            .catch(() => assign("actionItems", { loading: false, data: [] }))
        );
      }
      if (visible.has("myWork") && (perms.canApprove || perms.canAccessDocProcessing)) {
        tasks.push(
          dashboardService
            .getMyPendingApprovals()
            .then((data) => assign("myPendingApprovals", { loading: false, data }))
            .catch(() => assign("myPendingApprovals", { loading: false, data: null }))
        );
      }
      if ((visible.has("cashPosition") || visible.has("bankBalances")) && perms.canViewBanking) {
        tasks.push(
          dashboardService
            .getBankAccounts()
            .then((data) => assign("bankAccounts", { loading: false, data }))
            .catch(() => assign("bankAccounts", { loading: false, data: [] }))
        );
      }
      if (visible.has("plSnapshot") && perms.canViewStatutoryReports) {
        tasks.push(
          dashboardService
            .getPlSnapshot(activePeriod)
            .then((data) => assign("plData", { loading: false, data }))
            .catch(() => assign("plData", { loading: false, data: null }))
        );
      }
      if (visible.has("balanceSheet") && perms.canViewStatutoryReports) {
        tasks.push(
          dashboardService
            .getBalanceSheet()
            .then((data) => assign("balanceSheet", { loading: false, data }))
            .catch(() => assign("balanceSheet", { loading: false, data: null }))
        );
      }
      if (visible.has("cashFlowTrend") && perms.canViewBanking) {
        tasks.push(
          dashboardService
            .getCashFlowTrend()
            .then((data) => assign("cashFlowTrend", { loading: false, data }))
            .catch(() => assign("cashFlowTrend", { loading: false, data: null }))
        );
      }
      if (
        visible.has("workingCapital") &&
        (perms.canViewApInsights || perms.canViewArInsights || perms.canViewStatutoryReports)
      ) {
        tasks.push(
          dashboardService
            .getWorkingCapital()
            .then((data) => assign("workingCapital", { loading: false, data }))
            .catch(() => assign("workingCapital", { loading: false, data: null }))
        );
      }
      if (visible.has("compliance") && ["owner", "admin", "accountant"].includes(perms.role)) {
        tasks.push(
          dashboardService
            .getComplianceEvents()
            .then((data) => assign("complianceEvents", { loading: false, data }))
            .catch(() => assign("complianceEvents", { loading: false, data: [] }))
        );
      }
      if (visible.has("tdsSummary") && perms.canViewTds) {
        tasks.push(
          dashboardService
            .getTdsSummary(activePeriod)
            .then((data) => assign("tdsSummary", { loading: false, data }))
            .catch(() => assign("tdsSummary", { loading: false, data: null }))
        );
      }
      if (visible.has("priorYearBenchmark") && perms.canViewStatutoryReports) {
        tasks.push(
          dashboardService
            .getPriorYearBenchmark()
            .then((data) => assign("priorYearBenchmark", { loading: false, data }))
            .catch(() => assign("priorYearBenchmark", { loading: false, data: null }))
        );
      }
      if (visible.has("inventorySummary")) {
        tasks.push(
          dashboardService
            .getInventorySummary()
            .then((data) => assign("inventorySummary", { loading: false, data }))
            .catch(() => assign("inventorySummary", { loading: false, data: null }))
        );
      }
      if (visible.has("operations") && perms.canAccessDocProcessing) {
        tasks.push(
          dashboardService
            .getProcessingStats()
            .then((data) => assign("processingStats", { loading: false, data }))
            .catch(() => assign("processingStats", { loading: false, data: null }))
        );
      }
      if (visible.has("topVendors") && perms.canViewApInsights) {
        tasks.push(
          dashboardService
            .getTopParties("AP", activePeriod)
            .then((data) => assign("topVendors", { loading: false, data }))
            .catch(() => assign("topVendors", { loading: false, data: [] }))
        );
      }
      if (visible.has("topCustomers") && perms.canViewArInsights) {
        tasks.push(
          dashboardService
            .getTopParties("AR", activePeriod)
            .then((data) => assign("topCustomers", { loading: false, data }))
            .catch(() => assign("topCustomers", { loading: false, data: [] }))
        );
      }
      if (visible.has("aiAccuracy") && perms.canAccessDocProcessing) {
        tasks.push(
          dashboardService
            .getRecommendationStats()
            .then((data) => assign("recommendationStats", { loading: false, data }))
            .catch(() => assign("recommendationStats", { loading: false, data: null }))
        );
      }
      if (visible.has("activityFeed") && (perms.isOwnerOrAdmin || perms.role === "accountant")) {
        tasks.push(
          dashboardService
            .getUserActivity()
            .then((data) => assign("userActivity", { loading: false, data }))
            .catch(() => assign("userActivity", { loading: false, data: [] }))
        );
      }
      if (visible.has("ledger") && perms.canViewGlList) {
        tasks.push(
          dashboardService
            .getRecentJournalEntries()
            .then((data) => assign("recentJE", { loading: false, data }))
            .catch(() => assign("recentJE", { loading: false, data: [] }))
        );
      }
      if (visible.has("sync") && (perms.isOwnerOrAdmin || perms.role === "accountant")) {
        tasks.push(
          dashboardService
            .getErpSyncStatus()
            .then((data) => assign("erpSync", { loading: false, data }))
            .catch(() => assign("erpSync", { loading: false, data: null }))
        );
      }
      if (visible.has("notifications")) {
        tasks.push(
          notificationService
            .list(1)
            .then((data) =>
              assign("notifications", { loading: false, data: (data.results || []).slice(0, 5) })
            )
            .catch(() => assign("notifications", { loading: false, data: [] }))
        );
      }

      await Promise.all(tasks);
      setSecondary({ ...next });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, perms, rbac.loading, rbac.role, applyFromPreferences, getThemeWriteEpoch]);

  useEffect(() => {
    void load();
  }, [load]);

  const skipNextFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (skipNextFocus.current) {
        skipNextFocus.current = false;
        return;
      }
      void load();
    }, [load])
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const applyLayout = useCallback(
    (config: LayoutConfig, map: Record<string, LayoutConfig | string[]>) => {
      setLayoutConfig(config);
      setMobileSectionsMap(map);
      setSections(getVisibleSections(config));
      setIsCustomized(!isDefaultLayoutConfig(config, defaultSections));
    },
    [defaultSections]
  );

  const saveLayoutConfig = useCallback(
    async (payload: LayoutConfig) => {
      setSavingLayout(true);
      try {
        const nextMap = {
          ...mobileSectionsMap,
          [layoutKey]: payload,
        };
        const updated = await preferencesService.patch({ mobile_dashboard_sections: nextMap });
        const savedMap = updated.mobile_dashboard_sections || nextMap;
        applyLayout(parseLayoutConfig(savedMap[layoutKey], defaultSections), savedMap);
        setRefreshing(true);
        await load();
      } finally {
        setSavingLayout(false);
      }
    },
    [applyLayout, defaultSections, layoutKey, load, mobileSectionsMap]
  );

  const resetLayout = useCallback(async () => {
    setSavingLayout(true);
    try {
      const nextMap = { ...mobileSectionsMap };
      delete nextMap[layoutKey];
      const updated = await preferencesService.patch({ mobile_dashboard_sections: nextMap });
      const savedMap = updated.mobile_dashboard_sections || nextMap;
      applyLayout(parseLayoutConfig(undefined, defaultSections), savedMap);
      setRefreshing(true);
      await load();
    } finally {
      setSavingLayout(false);
    }
  }, [applyLayout, defaultSections, layoutKey, load, mobileSectionsMap]);

  const displayName = getDisplayFirstName(profile);
  const greeting = `${getGreeting()}, ${displayName}`;

  return {
    profile,
    companyName,
    logoUri,
    greeting,
    unread,
    pendingCount,
    period,
    periodLabel: getPeriodLabel(period),
    cyclePeriod,
    isCustomized,
    sections,
    layoutConfig,
    defaultSections,
    complete,
    secondary,
    perms,
    loading,
    refreshing,
    savingLayout,
    error,
    refresh,
    saveLayoutConfig,
    resetLayout,
  };
}
