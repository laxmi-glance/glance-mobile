import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme';

export default function UploadFab({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.9}>
        <Text style={styles.plus}>＋</Text>
        <Text style={styles.label}>Upload</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    wrap: {
    position: 'absolute',
    right: theme.spacing[5],
    bottom: theme.spacing[5],
  },
  fab: {
    backgroundColor: theme.colors.primaryAccent,
    borderRadius: theme.radius.pill,
    minHeight: 56,
    paddingHorizontal: theme.spacing[5],
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: theme.colors.primaryAccent,
    ...theme.elevation.floating,
  },
  plus: {
    color: theme.colors.onPrimary,
    fontSize: theme.typography.size.xl,
    marginRight: theme.spacing[2],
    fontWeight: theme.typography.weight.bold,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  label: {
    color: theme.colors.onPrimary,
    fontWeight: theme.button.fontWeight,
    fontSize: theme.button.fontSize,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  });
