import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import StatusBadge from './StatusBadge';
import { useTheme } from '../../theme';

interface DocumentCardProps {
  title: string;
  createdAtLabel: string;
  status: string;
  icon?: string;
  onPress: () => void;
  showApprovalActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  actionLoading?: boolean;
}

export default function DocumentCard({
  title,
  createdAtLabel,
  status,
  icon = '📄',
  onPress,
  showApprovalActions = false,
  onApprove,
  onReject,
  actionLoading = false,
}: DocumentCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <StatusBadge status={status} />
      </View>

      <Text style={styles.meta}>Created: {createdAtLabel}</Text>

      {showApprovalActions ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn, actionLoading && styles.actionBtnDisabled]}
            onPress={onApprove}
            disabled={actionLoading}
          >
            <Text style={styles.approveLabel}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn, actionLoading && styles.actionBtnDisabled]}
            onPress={onReject}
            disabled={actionLoading}
          >
            <Text style={styles.rejectLabel}>Reject</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing[3] + 2,
    marginBottom: theme.spacing[3],
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[2] + 2,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing[3],
  },
  icon: {
    fontSize: theme.typography.size.body,
    marginRight: theme.spacing[2],
  },
  title: {
    fontSize: theme.typography.size.lg,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weight.bold,
    fontFamily: theme.typography.fontFamilyPrimary,
    flex: 1,
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  actionRow: {
    marginTop: theme.spacing[3],
    flexDirection: 'row',
  },
  actionBtn: {
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2] + 1,
    marginRight: theme.spacing[2] + 2,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  approveBtn: {
    backgroundColor: theme.colors.statusApprovedBg,
  },
  approveLabel: {
    color: theme.colors.statusApprovedText,
    fontWeight: theme.typography.weight.bold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  rejectBtn: {
    backgroundColor: theme.colors.statusRejectedBg,
  },
  rejectLabel: {
    color: theme.colors.statusRejectedText,
    fontWeight: theme.typography.weight.bold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  });
