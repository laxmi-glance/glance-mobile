import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';

type StatusTone = 'approved' | 'pending' | 'rejected' | 'processing' | 'neutral';

function normalizeStatus(status: string): StatusTone {
  const value = status.toLowerCase();
  if (value === 'approved') return 'approved';
  if (value === 'pending') return 'pending';
  if (value === 'rejected') return 'rejected';
  if (value === 'processing') return 'processing';
  return 'neutral';
}

export default function StatusBadge({ status }: { status: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const tone = normalizeStatus(status);
  const badgeToneStyle =
    tone === 'approved'
      ? styles.badgeApproved
      : tone === 'pending'
        ? styles.badgePending
        : tone === 'rejected'
          ? styles.badgeRejected
          : tone === 'processing'
            ? styles.badgeProcessing
            : styles.badgeNeutral;
  const labelToneStyle =
    tone === 'approved'
      ? styles.labelApproved
      : tone === 'pending'
        ? styles.labelPending
        : tone === 'rejected'
          ? styles.labelRejected
          : tone === 'processing'
            ? styles.labelProcessing
            : styles.labelNeutral;
  const badgeStyle = [styles.badge, badgeToneStyle];
  const labelStyle = [styles.label, labelToneStyle];

  return (
    <View style={badgeStyle}>
      <Text style={labelStyle}>{status.toUpperCase()}</Text>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    badge: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[1],
    },
    badgeApproved: {
      backgroundColor: theme.colors.statusApprovedBg,
    },
    badgePending: {
      backgroundColor: theme.colors.statusPendingBg,
    },
    badgeRejected: {
      backgroundColor: theme.colors.statusRejectedBg,
    },
    badgeProcessing: {
      backgroundColor: theme.colors.statusProcessingBg,
    },
    badgeNeutral: {
      backgroundColor: theme.colors.statusNeutralBg,
    },
    label: {
      fontSize: theme.typography.size.xs,
      fontWeight: theme.typography.weight.bold,
      letterSpacing: 0.3,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    labelApproved: {
      color: theme.colors.statusApprovedText,
    },
    labelPending: {
      color: theme.colors.statusPendingText,
    },
    labelRejected: {
      color: theme.colors.statusRejectedText,
    },
    labelProcessing: {
      color: theme.colors.statusProcessingText,
    },
    labelNeutral: {
      color: theme.colors.statusNeutralText,
    },
  });
