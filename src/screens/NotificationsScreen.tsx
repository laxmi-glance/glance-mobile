import React, { useCallback, useEffect, useState } from "react";
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
import { mergeUniqueById } from "../utils/lists";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";

export default function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async (pageNum = 1, replace = false) => {
    try {
      const data = await notificationService.list(pageNum);
      setItems((prev) => mergeUniqueById(prev, data.results, replace || pageNum === 1));
      setHasMore(Boolean(data.next));
      setPage(pageNum);
    } catch (error: unknown) {
      Alert.alert("Could not load notifications", apiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    load(1, true);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(1, true);
  }, []);

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllRead();
      load(1, true);
    } catch (error: unknown) {
      Alert.alert("Could not update", apiErrorMessage(error));
    }
  };

  const handlePress = async (item: AppNotification) => {
    if (!item.read) {
      try {
        await notificationService.markRead(item.id);
        setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
      } catch {
        // Non-fatal: still show the message.
      }
    }
    Alert.alert(item.title || "Notification", item.message);
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.unread]}
      onPress={() => handlePress(item)}
      activeOpacity={0.8}
    >
      {!item.read ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
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
        title="Notifications"
        subtitle="Approvals, failures, and mentions"
        icon="notifications-outline"
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
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
          if (!loading && !loadingMore && hasMore) {
            setLoadingMore(true);
            load(page + 1);
          }
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} /> : null}
        ListEmptyComponent={
          !loading ? (
            <EmptyState icon="notifications-outline" title="You are all caught up." />
          ) : null
        }
      />

      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.brand} />
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
      flexDirection: "row",
      gap: space.md,
    },
    unread: {
      borderColor: colors.brandSoft,
      backgroundColor: colors.surfaceMuted,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.brand,
      marginTop: 6,
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
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    footer: {
      marginVertical: space.lg,
    },
  };
}
