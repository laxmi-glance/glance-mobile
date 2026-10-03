import React from "react";
import { ActivityIndicator, Linking, View } from "react-native";
import { ReportScreenProps } from "../types/navigation";
import { getReportById } from "../config/reports";
import { FRONTEND_URL } from "../config/env";
import { useRbac } from "../hooks/useRbac";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import FinancialReport from "../components/reports/FinancialReport";
import { SyncTrackerReport, UserActivityReport } from "../components/reports/LogReports";
import { useAppTheme } from "../theme";

export default function ReportScreen({ route, navigation }: ReportScreenProps) {
  const { colors } = useAppTheme();
  const report = getReportById(route.params.reportId);
  const { allows, loading } = useRbac();
  const canView = allows("reports", "view");

  if (!report) {
    return (
      <Screen edges={["bottom"]}>
        <PageHeader
          title="Report"
          icon="bar-chart-outline"
          showBack
          onBack={() => navigation.goBack()}
        />
        <EmptyState icon="alert-circle-outline" title="Report not found" />
      </Screen>
    );
  }

  const webUrl = `${FRONTEND_URL.replace(/\/+$/, "")}${report.path}`;
  const reportId = report.id;

  return (
    <Screen edges={["bottom"]}>
      <PageHeader
        title={report.title}
        subtitle={report.subtitle}
        icon={report.icon}
        showBack
        onBack={() => navigation.goBack()}
        menuActions={[
          { key: "web", label: "Open in web app", onPress: () => Linking.openURL(webUrl) },
        ]}
      />
      {loading ? (
        <View style={center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : !canView ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Reports are not available"
          hint="Your role cannot view reports in this workspace."
        />
      ) : reportId === "user-activity" ? (
        <UserActivityReport />
      ) : reportId === "sync-tracker" ? (
        <SyncTrackerReport />
      ) : (
        <FinancialReport reportId={reportId} />
      )}
    </Screen>
  );
}

const center = {
  flex: 1,
  justifyContent: "center" as const,
  alignItems: "center" as const,
};
