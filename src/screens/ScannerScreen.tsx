import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScannerScreenProps } from "../types/navigation";
import { useDocumentUpload } from "../hooks/useDocumentUpload";
import { pickDocuments, pickFromLibrary } from "../utils/pickUpload";
import { colors, fonts, type } from "../theme";

const CORNER = {
  tl: "#EA4335",
  tr: "#FBBC04",
  bl: "#4285F4",
  br: "#34A853",
};
const MASK = "rgba(0,0,0,0.5)";
const HEADER_CONTENT = 56;
const DOCK_CONTENT = 142;

type PaperSizeId = "a4" | "letter" | "legal" | "a5" | "receipt" | "free";

const PAPER_SIZES: { id: PaperSizeId; label: string; mm?: { w: number; h: number } }[] = [
  { id: "a4", label: "A4", mm: { w: 210, h: 297 } },
  { id: "letter", label: "Letter", mm: { w: 215.9, h: 279.4 } },
  { id: "legal", label: "Legal", mm: { w: 215.9, h: 355.6 } },
  { id: "a5", label: "A5", mm: { w: 148, h: 210 } },
  { id: "receipt", label: "Receipt", mm: { w: 80, h: 200 } },
  { id: "free", label: "Free" },
];

function frameForPaper(
  paperId: PaperSizeId,
  maxW: number,
  maxH: number
): { frameW: number; frameH: number } {
  const width = Math.max(maxW, 120);
  const height = Math.max(maxH, 160);
  const paper = PAPER_SIZES.find((item) => item.id === paperId);
  if (!paper?.mm) {
    return { frameW: width, frameH: height };
  }

  const aspect = paper.mm.h / paper.mm.w;
  let frameW = width;
  let frameH = frameW * aspect;
  if (frameH > height) {
    frameH = height;
    frameW = frameH / aspect;
  }
  return { frameW, frameH };
}

export default function ScannerScreen({ navigation }: ScannerScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [paperSize, setPaperSize] = useState<PaperSizeId>("a4");

  const { uploading, uploadFiles, canUpload, rbacLoading } = useDocumentUpload(() => {
    navigation.replace("Queue");
  });

  useEffect(() => {
    if (!rbacLoading && canUpload) {
      void requestPermission();
    }
  }, [canUpload, rbacLoading, requestPermission]);

  const layout = useMemo(() => {
    const headerH = insets.top + HEADER_CONTENT;
    const dockH = DOCK_CONTENT + Math.max(insets.bottom, 12);
    const availableH = height - headerH - dockH;
    const { frameW, frameH } = frameForPaper(paperSize, width, availableH);
    return {
      frameW,
      frameH,
      frameLeft: (width - frameW) / 2,
      frameTop: headerH + (availableH - frameH) / 2,
    };
  }, [height, insets.bottom, insets.top, paperSize, width]);

  const busy = capturing || uploading || rbacLoading;
  const canCapture = Boolean(permission?.granted && canUpload && !busy);

  const handleFiles = async (
    picker: () => Promise<Awaited<ReturnType<typeof pickFromLibrary>>>
  ) => {
    if (busy) {
      return;
    }
    if (!canUpload) {
      Alert.alert("Upload not allowed", "Your role cannot upload documents in this workspace.");
      return;
    }
    const files = await picker();
    if (files?.length) {
      await uploadFiles(files);
    }
  };

  const takePhoto = async () => {
    if (!canCapture) {
      return;
    }
    setCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      if (!photo?.uri) {
        return;
      }
      await uploadFiles([
        {
          uri: photo.uri,
          name: `scan-${Date.now()}.jpg`,
          mimeType: "image/jpeg",
        },
      ]);
    } catch {
      Alert.alert("Could not capture", "Try again, or upload a photo from your gallery.");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {permission?.granted && (rbacLoading || canUpload) ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          mute
          onMountError={() => {
            Alert.alert("Camera unavailable", "Upload from gallery or a PDF instead.");
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noCamera]} />
      )}

      <View style={[styles.maskBand, { top: 0, left: 0, right: 0, height: layout.frameTop }]} />
      <View
        style={[
          styles.maskBand,
          {
            top: layout.frameTop,
            left: 0,
            width: layout.frameLeft,
            height: layout.frameH,
          },
        ]}
      />
      <View
        style={[
          styles.maskBand,
          {
            top: layout.frameTop,
            left: layout.frameLeft + layout.frameW,
            right: 0,
            height: layout.frameH,
          },
        ]}
      />
      <View
        style={[
          styles.maskBand,
          {
            top: layout.frameTop + layout.frameH,
            left: 0,
            right: 0,
            bottom: 0,
          },
        ]}
      />

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: layout.frameTop,
          left: layout.frameLeft,
          width: layout.frameW,
          height: layout.frameH,
        }}
      >
        <Corner color={CORNER.tl} style={styles.tl} />
        <Corner color={CORNER.tr} style={styles.tr} />
        <Corner color={CORNER.bl} style={styles.bl} />
        <Corner color={CORNER.br} style={styles.br} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerSide}>
          <IconButton name="close" onPress={() => navigation.goBack()} accessibilityLabel="Close" />
        </View>
        <Text style={styles.headerTitle}>Scan document</Text>
        <View style={styles.headerSide} />
      </View>

      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sizeRow}
        >
          {PAPER_SIZES.map((size) => {
            const selected = paperSize === size.id;
            return (
              <TouchableOpacity
                key={size.id}
                onPress={() => setPaperSize(size.id)}
                style={[styles.sizeChip, selected && styles.sizeChipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${size.label} frame`}
              >
                <Text style={[styles.sizeChipLabel, selected && styles.sizeChipLabelOn]}>
                  {size.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.shutterRow}>
          <View style={styles.shutterSlot}>
            <IconButton
              name={torch ? "flash" : "flash-outline"}
              onPress={() => setTorch((value) => !value)}
              active={torch}
              accessibilityLabel="Toggle flashlight"
            />
          </View>
          <TouchableOpacity
            style={[styles.shutterOuter, !canCapture && styles.shutterDisabled]}
            onPress={() => {
              void takePhoto();
            }}
            disabled={!canCapture}
            activeOpacity={0.85}
            accessibilityLabel="Capture document"
          >
            <View style={styles.shutterRing}>
              <View style={styles.shutterInner} />
            </View>
          </TouchableOpacity>
          <View style={[styles.shutterSlot, styles.shutterSlotEnd]}>
            <View style={styles.rightActions}>
              <SideAction
                icon="images-outline"
                label="Photos"
                onPress={() => {
                  void handleFiles(pickFromLibrary);
                }}
              />
              <SideAction
                icon="document-text-outline"
                label="Files"
                onPress={() => {
                  void handleFiles(pickDocuments);
                }}
              />
            </View>
          </View>
        </View>
      </View>

      {!rbacLoading && !canUpload ? (
        <View style={[styles.permission, { top: layout.frameTop, height: layout.frameH }]}>
          <Text style={styles.permissionTitle}>Upload not allowed</Text>
          <Text style={styles.permissionHint}>
            Your role cannot upload documents in this workspace.
          </Text>
        </View>
      ) : null}

      {!permission?.granted && (rbacLoading || canUpload) ? (
        <View style={[styles.permission, { top: layout.frameTop, height: layout.frameH }]}>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionHint}>
            Allow the camera to capture documents, or upload from gallery.
          </Text>
          <TouchableOpacity style={styles.allowBtn} onPress={() => void requestPermission()}>
            <Text style={styles.allowLabel}>Allow camera</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={colors.white} size="large" />
          <Text style={styles.busyLabel}>
            {uploading ? "Uploading…" : rbacLoading ? "Checking access…" : "Capturing…"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function IconButton({
  name,
  onPress,
  active,
  accessibilityLabel,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  active?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={8}
      style={[styles.iconBtn, active && styles.iconBtnActive]}
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={name} size={20} color={colors.white} />
    </TouchableOpacity>
  );
}

function SideAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.sideAction} onPress={onPress} accessibilityLabel={label}>
      <View style={styles.sideActionIcon}>
        <Ionicons name={icon} size={22} color={colors.white} />
      </View>
      <Text style={styles.sideActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Corner({ color, style }: { color: string; style: object }) {
  return <View style={[styles.corner, { borderColor: color }, style]} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  noCamera: {
    backgroundColor: "#111111",
  },
  maskBand: {
    position: "absolute",
    backgroundColor: MASK,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  headerSide: {
    flex: 1,
    alignItems: "flex-start",
  },
  headerTitle: {
    color: colors.white,
    fontFamily: fonts.semibold,
    fontSize: 17,
    letterSpacing: 0.2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  iconBtnActive: {
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderWidth: 3.5,
    borderRadius: 4,
  },
  tl: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tr: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  br: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    paddingTop: 12,
  },
  sizeRow: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: "center",
  },
  sizeChip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sizeChipOn: {
    backgroundColor: colors.white,
  },
  sizeChipLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 16,
    color: "rgba(255,255,255,0.92)",
  },
  sizeChipLabelOn: {
    color: "#111111",
    fontFamily: fonts.semibold,
  },
  shutterRow: {
    marginTop: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  shutterSlot: {
    flex: 1,
    alignItems: "center",
  },
  shutterSlotEnd: {
    alignItems: "flex-end",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sideAction: {
    width: 52,
    alignItems: "center",
    gap: 6,
  },
  sideActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  sideActionLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 13,
    color: "rgba(255,255,255,0.72)",
  },
  shutterOuter: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterDisabled: {
    opacity: 0.45,
  },
  shutterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.white,
  },
  permission: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    zIndex: 3,
  },
  permissionTitle: {
    ...type.subtitle,
    color: colors.white,
    textAlign: "center",
  },
  permissionHint: {
    ...type.meta,
    marginTop: 8,
    color: colors.textOnDarkMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  allowBtn: {
    marginTop: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  allowLabel: {
    ...type.button,
    color: colors.textHeading,
  },
  busy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  busyLabel: {
    ...type.subtitle,
    marginTop: 12,
    color: colors.white,
  },
});
