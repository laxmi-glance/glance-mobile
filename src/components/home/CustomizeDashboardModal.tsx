import React, { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SECTION_ICONS, getSectionLabel } from "../../config/dashboard";
import {
  buildLayoutPayload,
  countVisibleSections,
  getDefaultHiddenSections,
} from "../../utils/dashboardLayout";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../../theme";
import Button from "../Button";
import type { LayoutConfig } from "../../types/dashboard";

type Props = {
  open: boolean;
  onClose: () => void;
  layoutConfig: LayoutConfig;
  defaultSections: string[];
  saving?: boolean;
  onSave: (payload: LayoutConfig) => Promise<void>;
  onReset: () => Promise<void>;
};

export default function CustomizeDashboardModal({
  open,
  onClose,
  layoutConfig,
  defaultSections,
  saving = false,
  onSave,
  onReset,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [draftOrder, setDraftOrder] = useState(layoutConfig.order);
  const [draftHidden, setDraftHidden] = useState(() => new Set(layoutConfig.hidden));

  useEffect(() => {
    if (open) {
      setDraftOrder(layoutConfig.order);
      setDraftHidden(new Set(layoutConfig.hidden));
    }
  }, [open, layoutConfig]);

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draftOrder.length) {
      return;
    }
    setDraftOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const toggleVisibility = (sectionId: string, visible: boolean) => {
    setDraftHidden((prev) => {
      const next = new Set(prev);
      if (visible) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    const payload = buildLayoutPayload(draftOrder, [...draftHidden]);
    if (countVisibleSections(payload) === 0) {
      Alert.alert("Keep at least one widget", "Show at least one widget on your home dashboard.");
      return;
    }
    try {
      await onSave(payload);
      onClose();
    } catch (error) {
      Alert.alert("Could not save layout", error instanceof Error ? error.message : "Try again.");
    }
  };

  const handleReset = async () => {
    try {
      await onReset();
      setDraftOrder(defaultSections);
      setDraftHidden(new Set(getDefaultHiddenSections(defaultSections)));
    } catch (error) {
      Alert.alert("Could not reset layout", error instanceof Error ? error.message : "Try again.");
    }
  };

  const visibleCount = draftOrder.filter((id) => !draftHidden.has(id)).length;

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View
        style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Customize dashboard</Text>
            <Text style={styles.hint}>
              Toggle widgets and reorder them. This layout is only for the mobile app.
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={colors.textHeading} />
          </TouchableOpacity>
        </View>

        <Text style={styles.meta}>
          {visibleCount} of {draftOrder.length} widgets visible
        </Text>

        <ScrollView contentContainerStyle={styles.list}>
          {draftOrder.map((sectionId, index) => {
            const visible = !draftHidden.has(sectionId);
            return (
              <View key={sectionId} style={[styles.row, !visible && styles.rowHidden]}>
                <View style={styles.reorder}>
                  <TouchableOpacity
                    onPress={() => moveItem(index, -1)}
                    disabled={index === 0 || saving}
                    hitSlop={6}
                    accessibilityLabel="Move up"
                  >
                    <Ionicons
                      name="chevron-up"
                      size={18}
                      color={index === 0 ? colors.borderStrong : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveItem(index, 1)}
                    disabled={index === draftOrder.length - 1 || saving}
                    hitSlop={6}
                    accessibilityLabel="Move down"
                  >
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={
                        index === draftOrder.length - 1 ? colors.borderStrong : colors.textSecondary
                      }
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={SECTION_ICONS[sectionId] || "grid-outline"}
                    size={16}
                    color={visible ? colors.brand : colors.textMuted}
                  />
                </View>
                <Text style={[styles.label, !visible && styles.labelHidden]} numberOfLines={1}>
                  {getSectionLabel(sectionId)}
                </Text>
                <Switch
                  value={visible}
                  onValueChange={(checked) => toggleVisibility(sectionId, checked)}
                  disabled={saving}
                  trackColor={{ false: colors.borderStrong, true: colors.accent }}
                  thumbColor={colors.white}
                />
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Reset"
            variant="ghost"
            icon="refresh-outline"
            onPress={() => void handleReset()}
            disabled={saving}
            style={styles.footerBtn}
          />
          <Button
            label="Save"
            onPress={() => void handleSave()}
            loading={saving}
            style={styles.footerBtn}
          />
        </View>
      </View>
    </Modal>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    root: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: space.lg,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: space.md,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      ...type.title,
    },
    hint: {
      ...type.meta,
      marginTop: 6,
    },
    meta: {
      ...type.caption,
      marginBottom: space.md,
    },
    list: {
      paddingBottom: space.lg,
      gap: space.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    rowHidden: {
      opacity: 0.62,
    },
    reorder: {
      alignItems: "center",
      justifyContent: "center",
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.brandSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      ...type.cardTitle,
      flex: 1,
    },
    labelHidden: {
      color: colors.textMuted,
    },
    footer: {
      flexDirection: "row",
      gap: space.md,
      paddingTop: space.md,
    },
    footerBtn: {
      flex: 1,
    },
  };
}
