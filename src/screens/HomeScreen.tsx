import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeScreenProps } from "../types/navigation";
import Screen from "../components/Screen";
import BrandLockup from "../components/BrandLockup";
import HomeWelcomeCard from "../components/home/HomeWelcomeCard";
import DashboardFeed from "../components/home/DashboardFeed";
import CustomizeDashboardModal from "../components/home/CustomizeDashboardModal";
import { useDashboardHome } from "../hooks/useDashboardHome";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const home = useDashboardHome();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  return (
    <Screen edges={[]}>
      <View style={[styles.brandBar, { paddingTop: insets.top + 6 }]}>
        <BrandLockup size={30} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={home.refreshing}
            onRefresh={home.refresh}
            tintColor={colors.brand}
          />
        }
      >
        <HomeWelcomeCard
          greeting={home.greeting}
          companyName={home.companyName}
          logoUri={home.logoUri}
        />

        <View style={styles.sectionHead}>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>Dashboard</Text>
            <Text style={styles.sectionHint}>Widgets for this phone layout</Text>
          </View>
          <TouchableOpacity
            style={styles.customizeBtn}
            onPress={() => setCustomizeOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Customize dashboard"
          >
            <Ionicons name="options-outline" size={20} color={colors.brand} />
          </TouchableOpacity>
        </View>

        {home.error && !home.complete ? (
          <Text style={styles.error}>{home.error}</Text>
        ) : (
          <DashboardFeed
            sections={home.sections}
            complete={home.complete}
            secondary={home.secondary}
            perms={home.perms}
            periodLabel={home.periodLabel}
            loading={home.loading}
            unread={home.unread}
            pendingCount={home.pendingCount}
            navigation={{
              openNotifications: () => navigation.navigate("Notifications"),
              openDocuments: () => navigation.navigate("AP"),
              openReports: (reportId) => {
                if (reportId) {
                  navigation.navigate("Report", { reportId });
                  return;
                }
                navigation.navigate("Reports");
              },
              openQueue: () => navigation.navigate("Queue"),
              openScanner: () => navigation.navigate("Scanner"),
              openApDocument: (documentId) => navigation.navigate("ApDocument", { documentId }),
            }}
          />
        )}
      </ScrollView>
      <CustomizeDashboardModal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        layoutConfig={home.layoutConfig}
        defaultSections={home.defaultSections}
        saving={home.savingLayout}
        onSave={home.saveLayoutConfig}
        onReset={async () => {
          await home.resetLayout();
        }}
      />
    </Screen>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    brandBar: {
      paddingHorizontal: space.lg,
      paddingBottom: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      paddingHorizontal: space.lg,
      paddingBottom: 48,
      gap: space.md,
    },
    sectionHead: {
      marginTop: 4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionCopy: {
      flex: 1,
      minWidth: 0,
    },
    sectionTitle: {
      ...type.heading,
      fontSize: 17,
      lineHeight: 22,
    },
    sectionHint: {
      ...type.caption,
      marginTop: 2,
    },
    customizeBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brandSoft,
      borderRadius: radius.full,
    },
    error: {
      ...type.callout,
      color: colors.danger,
    },
  };
}
