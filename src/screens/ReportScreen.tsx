import React from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ReportScreenProps } from "../types/navigation";
import { getReportById } from "../config/reports";
import { FRONTEND_URL } from "../config/env";
import { useRbac } from "../hooks/useRbac";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import { colors, radius, space } from "../theme";

export default function ReportScreen({ route, navigation }: ReportScreenProps) {
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

  if (loading) {
    return (
      <Screen edges={["bottom"]}>
        <PageHeader
          title={report.title}
          subtitle={report.subtitle}
          icon={report.icon}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </Screen>
    );
  }

  if (!canView) {
    return (
      <Screen edges={["bottom"]}>
        <PageHeader
          title={report.title}
          icon={report.icon}
          showBack
          onBack={() => navigation.goBack()}
        />
        <EmptyState
          icon="lock-closed-outline"
          title="Reports are not available"
          hint="Your role cannot view reports in this workspace."
        />
      </Screen>
    );
  }

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
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name={report.icon} size={28} color={colors.brand} />
        </View>
        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.subtitle}>{report.subtitle}</Text>
        <Text style={styles.hint}>
          Full report layout, filters, and export are available in the Glancewise web workspace.
        </Text>
        <Button
          label="Open in web app"
          icon="open-outline"
          onPress={() => Linking.openURL(webUrl)}
          style={styles.button}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.xxxl,
    alignItems: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textHeading,
    textAlign: "center",
  },
  subtitle: {
    marginTop: space.sm,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  hint: {
    marginTop: space.xl,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: space.xxl,
    alignSelf: "stretch",
  },
});
