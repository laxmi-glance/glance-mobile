import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NotificationsScreenProps } from '../types/navigation';
import { useTheme } from '../theme';
import notificationService, { UserNotificationItem } from '../services/notification.service';

export default function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatTimestamp = useCallback((isoDate?: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '';
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }, []);

  const loadNotifications = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const items = await notificationService.getNotifications();
      setNotifications(items);
    } catch {
      setError('Failed to load notifications. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const renderNotification = ({ item }: { item: UserNotificationItem }) => {
    const timestampLabel = formatTimestamp(item.timestamp);
    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title || 'Notification'}
          </Text>
          {!item.read ? <View style={styles.unreadDot} /> : null}
        </View>
        {item.message ? (
          <Text style={styles.cardMessage} numberOfLines={3}>
            {item.message}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          {item.category ? (
            <Text style={styles.categoryText} numberOfLines={1}>
              {item.category}
            </Text>
          ) : (
            <View />
          )}
          {timestampLabel ? <Text style={styles.timeText}>{timestampLabel}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.9}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.colors.primaryAccent} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              tintColor={theme.colors.primaryAccent}
              colors={[theme.colors.primaryAccent]}
              progressBackgroundColor={theme.colors.surface}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={40} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>{error ? 'Could not load notifications' : 'No notifications yet'}</Text>
              <Text style={styles.emptySubtitle}>
                {error || 'You will see updates and alerts here.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surfaceMuted,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: theme.typography.size.lg,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    backIconButton: {
      width: theme.button.height,
      height: theme.button.height,
      borderRadius: theme.button.radius,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    headerSpacer: {
      width: theme.button.height,
      height: theme.button.height,
    },
    listContent: {
      padding: theme.spacing[4],
      paddingBottom: theme.spacing[6],
      flexGrow: 1,
    },
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      marginBottom: theme.spacing[3],
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    cardTitle: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.size.md,
      fontWeight: theme.typography.weight.semibold,
      fontFamily: theme.typography.fontFamilyPrimary,
      marginRight: theme.spacing[2],
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
      backgroundColor: theme.colors.primaryAccent,
    },
    cardMessage: {
      marginTop: theme.spacing[2],
      color: theme.colors.textSecondary,
      fontSize: theme.typography.size.body,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    cardFooter: {
      marginTop: theme.spacing[3],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.size.xs,
      textTransform: 'capitalize',
      fontFamily: theme.typography.fontFamilyPrimary,
      maxWidth: '45%',
    },
    timeText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.size.xs,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[6],
    },
    emptyTitle: {
      marginTop: theme.spacing[3],
      fontSize: theme.typography.size.md,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    emptySubtitle: {
      marginTop: theme.spacing[2],
      fontSize: theme.typography.size.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
      fontFamily: theme.typography.fontFamilyPrimary,
    },
  });
