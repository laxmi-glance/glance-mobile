import React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";
import ListRow from "../components/ListRow";
import EmptyState from "../components/EmptyState";
import { useRbac } from "../hooks/useRbac";
import { space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";
import type { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Accounting">;

export default function AccountingScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { allows, loading } = useRbac();
  const canViewChart = allows("ledger", "view");
  const canViewGl = allows("gl", "view");

  return (
    <Screen edges={[]}>
      <PageHeader
        title="Accounting"
        subtitle="Chart of accounts and general ledger"
        icon="book-outline"
        showBack
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : !canViewChart && !canViewGl ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Accounting is not available"
          hint="Your role cannot view the chart of accounts or general ledger in this workspace."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {canViewChart ? (
            <ListRow
              icon="list-outline"
              label="Chart of accounts"
              subtitle="Ledger groups and ledger accounts"
              onPress={() => navigation.navigate("ChartOfAccounts")}
            />
          ) : null}
          {canViewGl ? (
            <ListRow
              icon="book-outline"
              label="General ledger"
              subtitle="Journal entries and voucher lines"
              onPress={() => navigation.navigate("GeneralLedger")}
            />
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

function createStyles(_tokens: ThemeTokens) {
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
  };
}
