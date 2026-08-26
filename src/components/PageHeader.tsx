import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandMark from "./BrandMark";
import type { IconName } from "../config/features";
import { useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";

export type PageHeaderMenuAction = {
  key: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconUri?: string | null;
  showBack?: boolean;
  onBack?: () => void;
  supportingIcon?: IconName;
  supportingAccessibilityLabel?: string;
  supportingBadge?: number;
  onSupportingPress?: () => void;
  menuActions?: PageHeaderMenuAction[];
};

const ICON_BG = "#FFFFFF";
const ICON_SIZE = 40;

export default function PageHeader({
  title,
  subtitle,
  icon,
  iconUri,
  showBack = false,
  onBack,
  supportingIcon,
  supportingAccessibilityLabel,
  supportingBadge,
  onSupportingPress,
  menuActions = [],
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const menuBtnRef = useRef<View>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(0);

  useEffect(() => {
    setLogoFailed(false);
  }, [iconUri]);

  const showLogo = Boolean(iconUri) && !logoFailed;
  const badgeLabel =
    supportingBadge && supportingBadge > 0
      ? supportingBadge > 99
        ? "99+"
        : String(supportingBadge)
      : null;

  const openMenu = () => {
    if (!menuActions.length) {
      return;
    }
    setMenuTop(insets.top + 56);
    setMenuOpen(true);
    menuBtnRef.current?.measureInWindow((_x, y, _w, h) => {
      setMenuTop(y + h + 6);
    });
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="light" />
      {showBack ? (
        <TouchableOpacity
          onPress={onBack}
          hitSlop={10}
          style={styles.sideBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.pageIcon}>
        {showLogo ? (
          <Image
            source={{ uri: iconUri as string }}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Page icon"
            onError={() => setLogoFailed(true)}
          />
        ) : icon ? (
          <Ionicons name={icon} size={22} color={colors.brand} />
        ) : (
          <BrandMark size={22} />
        )}
      </View>

      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {supportingIcon && onSupportingPress ? (
        <TouchableOpacity
          onPress={onSupportingPress}
          hitSlop={8}
          style={styles.sideBtn}
          accessibilityRole="button"
          accessibilityLabel={supportingAccessibilityLabel || "Shortcut"}
        >
          <Ionicons name={supportingIcon} size={22} color={colors.white} />
          {badgeLabel ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}

      {menuActions.length > 0 ? (
        <View ref={menuBtnRef} collapsable={false}>
          <TouchableOpacity
            onPress={openMenu}
            hitSlop={8}
            style={styles.sideBtn}
            accessibilityRole="button"
            accessibilityLabel="More actions"
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeMenu}>
        <View style={styles.menuRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
          <View style={[styles.menu, { top: menuTop }]}>
            {menuActions.map((action) => (
              <Pressable
                key={action.key}
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                onPress={() => {
                  closeMenu();
                  action.onPress();
                }}
              >
                <Text style={[styles.menuLabel, action.destructive && styles.menuLabelDanger]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    bar: {
      backgroundColor: "#1C1C1E",
      paddingBottom: 12,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      zIndex: 20,
    },
    sideBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    pageIcon: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      borderRadius: ICON_SIZE / 2,
      backgroundColor: ICON_BG,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    logo: {
      width: ICON_SIZE - 8,
      height: ICON_SIZE - 8,
    },
    titles: {
      flex: 1,
      minWidth: 0,
      marginLeft: 2,
    },
    title: {
      ...type.subtitle,
      color: colors.white,
    },
    subtitle: {
      ...type.caption,
      marginTop: 1,
      color: colors.textOnDarkMuted,
    },
    badge: {
      position: "absolute",
      top: 2,
      right: 2,
      minWidth: 15,
      height: 15,
      paddingHorizontal: 3,
      borderRadius: 8,
      backgroundColor: colors.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      ...type.overline,
      color: colors.white,
      fontSize: 9,
      lineHeight: 11,
      letterSpacing: 0,
    },
    menuRoot: {
      flex: 1,
    },
    menu: {
      position: "absolute",
      right: 10,
      minWidth: 196,
      backgroundColor: "#2C2C2E",
      borderRadius: 8,
      paddingVertical: 8,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        },
        android: { elevation: 8 },
        default: {},
      }),
    },
    menuItem: {
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    menuItemPressed: {
      backgroundColor: "rgba(255,255,255,0.08)",
    },
    menuLabel: {
      ...type.subtitle,
      color: colors.white,
    },
    menuLabelDanger: {
      color: colors.danger,
    },
  };
}
