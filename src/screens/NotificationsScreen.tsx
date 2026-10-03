import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { NotificationsScreenProps } from "../types/navigation";
import notificationService from "../services/notification.service";
import type { AppNotification } from "../types/models";
import { formatDateTime } from "../utils/dates";
import { apiErrorMessage } from "../utils/errors";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { notificationHeaderShortcuts } from "../components/notificationHeaderShortcuts";
import { refreshUnreadCounts, useUnreadCounts } from "../hooks/useUnreadCount";
import { mergeUniqueById } from "../utils/lists";
import { isNotificationPanel, type NotificationPanel } from "../utils/notificationKind";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";

const PANEL_COPY: Record<
  NotificationPanel,
  {
    title: string;
    subtitle: string;
    icon: "notifications-outline" | "alert-circle-outline";
    empty: string;
    hint: string;
  }
> = {
  notifications: {
    title: "Notifications",
    subtitle: "Approvals, updates, and mentions",
    icon: "notifications-outline",
    empty: "You are all caught up.",
    hint: "Approvals and other updates will show here.",
  },
  errors: {
    title: "Errors",
    subtitle: "Failures and data integrity",
    icon: "alert-circle-outline",
    empty: "No errors",
    hint: "Data integrity and failure alerts will show here.",
  },
};

export default function NotificationsScreen({ navigation, route }: NotificationsScreenProps) {
  const panel: NotificationPanel = isNotificationPanel(route.params?.panel)
    ? route.params.panel
    : "notifications";
  return <NotificationPanelView key={panel} panel={panel} navigation={navigation} />;
}

function NotificationPanelView({
  panel,
  navigation,
}: {
  panel: NotificationPanel;
  navigation: NotificationsScreenProps["navigation"];
}) {
  const copy = PANEL_COPY[panel];
  const unread = useUnreadCounts();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchGen = useRef(0);
  const loadingMoreRef = useRef(false);

  const load = useCallback(
    async (pageNum = 1, replace = false) => {
      const isReplace = replace || pageNum === 1;
      if (isReplace) {
        fetchGen.current += 1;
      }
      const gen = fetchGen.current;
      try {
        const data = await notificationService.list(pageNum, panel);
        if (gen !== fetchGen.current) {
          return;
        }
        setItems((prev) => mergeUniqueById(prev, data.results, replace || pageNum === 1));
        setHasMore(Boolean(data.next));
        setPage(pageNum);
      } catch (error: unknown) {
        if (gen !== fetchGen.current) {
          return;
        }
        Alert.alert(
          panel === "errors" ? "Could not load errors" : "Could not load notifications",
          apiErrorMessage(error)
        );
      } finally {
        if (gen !== fetchGen.current) {
          return;
        }
        loadingMoreRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [panel]
  );

  useEffect(() => {
    void load(1, true); // eslint-disable-line react-hooks/set-state-in-effect -- load this panel after the async API call
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(1, true);
  }, [load]);

  const handleMarkAll = async () => {
    try {
      await notificationService.markPanelRead(panel);
      await refreshUnreadCounts();
      void load(1, true);
    } catch (error: unknown) {
      Alert.alert("Could not update", apiErrorMessage(error));
    }
  };

  const handlePress = async (item: AppNotification) => {
    if (!item.read) {
      try {
        await notificationService.markRead(item.id);
        setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
        void refreshUnreadCounts();
      } catch {
        // Non-fatal: still show the message.
      }
    }
    Alert.alert(item.title || copy.title, item.message);
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.card, !item.read && (panel === "errors" ? styles.unreadError : styles.unread)]}
      onPress={() => handlePress(item)}
      activeOpacity={0.8}
    >
      {!item.read ? (
        <View style={[styles.dot, panel === "errors" && styles.dotError]} />
      ) : (
        <View style={styles.dotSpacer} />
      )}
      <View style={styles.body}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message} numberOfLines={3}>
          {item.message}
        </Text>
        <Text style={styles.meta}>{formatDateTime(item.timestamp)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Screen edges={["bottom"]}>
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={copy.icon}
        iconColor={panel === "errors" ? colors.danger : colors.brand}
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
        shortcuts={notificationHeaderShortcuts(
          unread,
          (next) => navigation.setParams({ panel: next }),
          panel
        )}
        menuActions={[
          { key: "refresh", label: "Refresh", onPress: onRefresh },
          { key: "mark-all", label: "Mark all read", onPress: () => void handleMarkAll() },
        ]}
      />

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (loading || loadingMoreRef.current || refreshing || !hasMore) {
            return;
          }
          loadingMoreRef.current = true;
          setLoadingMore(true);
          void load(page + 1);
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} /> : null}
        ListEmptyComponent={
          !loading ? <EmptyState icon={copy.icon} title={copy.empty} hint={copy.hint} /> : null
        }
      />

      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator
            size="large"
            color={panel === "errors" ? colors.danger : colors.brand}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    list: {
      paddingHorizontal: space.lg,
      paddingBottom: space.xxxl,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space.lg,
      marginBottom: space.md,
      flexDirection: "row" as const,
      gap: space.md,
    },
    unread: {
      borderColor: colors.brandSoft,
      backgroundColor: colors.surfaceMuted,
    },
    unreadError: {
      borderColor: colors.dangerSoft,
      backgroundColor: colors.dangerSoft,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.brand,
      marginTop: 6,
    },
    dotError: {
      backgroundColor: colors.danger,
    },
    dotSpacer: {
      width: 8,
    },
    body: {
      flex: 1,
    },
    title: {
      ...type.subtitle,
    },
    message: {
      ...type.callout,
      marginTop: 6,
      color: colors.textSecondary,
    },
    meta: {
      ...type.caption,
      marginTop: 8,
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.overlay,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    footer: {
      marginVertical: space.lg,
    },
  };
}
