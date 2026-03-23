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

function toneColors(tone: StatusTone, theme: ReturnType<typeof useTheme>['theme']): { bg: string; fg: string } {
  if (tone === 'approved') return { bg: theme.colors.statusApprovedBg, fg: theme.colors.statusApprovedText };
  if (tone === 'pending') return { bg: theme.colors.statusPendingBg, fg: theme.colors.statusPendingText };
  if (tone === 'rejected') return { bg: theme.colors.statusRejectedBg, fg: theme.colors.statusRejectedText };
  if (tone === 'processing') return { bg: theme.colors.statusProcessingBg, fg: theme.colors.statusProcessingText };
  return { bg: theme.colors.statusNeutralBg, fg: theme.colors.statusNeutralText };
}

export default function StatusBadge({ status }: { status: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const tone = normalizeStatus(status);
  const colors = toneColors(tone, theme);

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.fg }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    badge: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing[2] + 2,
      paddingVertical: theme.spacing[1] + 1,
    },
    label: {
      fontSize: theme.typography.size.xs,
      fontWeight: theme.typography.weight.bold,
      letterSpacing: 0.3,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
  });
