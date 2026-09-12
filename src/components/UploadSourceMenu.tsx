import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  UploadSourceContext,
  useUploadSourceMenu,
} from "../hooks/useUploadSourceMenu";
import { makeShadow, radius, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";
import type { IconName } from "../config/features";

const OPTIONS: { key: "camera" | "photos" | "files"; label: string; icon: IconName }[] = [
  { key: "camera", label: "Camera", icon: "camera-outline" },
  { key: "photos", label: "Photos", icon: "images-outline" },
  { key: "files", label: "Files", icon: "attach-outline" },
];

type MenuProps = {
  visible: boolean;
  uploading?: boolean;
  bottomOffset: number;
  onClose: () => void;
  onCamera: () => void;
  onPhotos: () => void;
  onFiles: () => void;
};

export function UploadSourceProvider({
  children,
  bottomOffset,
}: {
  children: ReactNode;
  bottomOffset: number;
}) {
  const menu = useUploadSourceMenu();

  return (
    <UploadSourceContext.Provider value={menu}>
      <View style={styles.shell}>
        {children}
        <UploadSourceMenu
          visible={menu.visible}
          uploading={menu.uploading}
          bottomOffset={bottomOffset}
          onClose={menu.hide}
          onCamera={menu.pickCamera}
          onPhotos={menu.pickPhotos}
          onFiles={menu.pickFiles}
        />
      </View>
    </UploadSourceContext.Provider>
  );
}

function UploadSourceMenu({
  visible,
  uploading,
  bottomOffset,
  onClose,
  onCamera,
  onPhotos,
  onFiles,
}: MenuProps) {
  const { colors } = useAppTheme();
  const themed = useThemedStyles(createMenuStyles);
  const handlers = {
    camera: onCamera,
    photos: onPhotos,
    files: onFiles,
  } as const;

  if (!visible && !uploading) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none" accessibilityViewIsModal>
      <Pressable
        style={[themed.backdrop, { bottom: Math.max(bottomOffset - 8, 0) }]}
        onPress={uploading ? undefined : onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss upload options"
      />
      <View style={[themed.card, { bottom: bottomOffset }]}>
        {uploading ? (
          <View style={themed.uploadingRow}>
            <ActivityIndicator color={colors.brand} />
            <Text style={themed.label}>Uploading…</Text>
          </View>
        ) : (
          OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={themed.row}
              onPress={handlers[option.key]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={option.label}
            >
              <View style={themed.iconWell}>
                <Ionicons name={option.icon} size={22} color={colors.textHeading} />
              </View>
              <Text style={themed.label}>{option.label}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
}

function createMenuStyles({ colors, type, isDark }: ThemeTokens) {
  return {
    backdrop: {
      position: "absolute" as const,
      top: 0,
      right: 0,
      left: 0,
      backgroundColor: isDark ? "rgba(0,0,0,0.45)" : "rgba(15, 0, 51, 0.28)",
    },
    card: {
      position: "absolute" as const,
      alignSelf: "center" as const,
      width: 252,
      backgroundColor: colors.surface,
      borderRadius: 28,
      paddingVertical: 8,
      paddingHorizontal: 6,
      zIndex: 2,
      ...makeShadow(isDark),
    },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 14,
    },
    iconWell: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    label: {
      ...type.subtitle,
      fontSize: 17,
      color: colors.textHeading,
    },
    uploadingRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingVertical: 20,
      paddingHorizontal: 20,
      gap: 12,
    },
  };
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 30,
  },
});
