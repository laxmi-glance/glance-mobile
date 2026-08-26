import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { ReportsScreenProps } from "../types/navigation";
import { REPORT_GROUPS } from "../config/reports";
import { useRbac } from "../hooks/useRbac";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";
import ListRow from "../components/ListRow";
import EmptyState from "../components/EmptyState";
import { colors, space } from "../theme";

export default function ReportsListScreen({ navigation }: ReportsScreenProps) {
  const { allows, loading, reload } = useRbac();
  const canView = allows("reports", "view");

  return (
    <Screen edges={[]}>
      <PageHeader
        title="Reports"
        subtitle="Financial statements and workspace activity"
        icon="bar-chart-outline"
        menuActions={[{ key: "refresh", label: "Refresh", onPress: () => void reload() }]}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : !canView ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Reports are not available"
          hint="Your role cannot view reports in this workspace."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {REPORT_GROUPS.map((group) => (
            <View key={group.id} style={styles.group}>
              <Text style={styles.section}>{group.title}</Text>
              {group.reports.map((report) => (
                <ListRow
                  key={report.id}
                  icon={report.icon}
                  label={report.title}
                  subtitle={report.subtitle}
                  onPress={() => navigation.navigate("Report", { reportId: report.id })}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: 40,
  },
  group: {
    marginBottom: space.lg,
  },
  section: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: space.sm,
    marginTop: space.sm,
  },
});
