import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import { colors } from "../theme";

const CORNER = {
  tl: "#EA4335",
  tr: "#FBBC04",
  bl: "#4285F4",
  br: "#34A853",
};
const MASK = "rgba(0,0,0,0.58)";
const SCAN_LINE = "#D4AF37";

export default function ScannerScreen({ navigation }: ScannerScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const { uploading, uploadFiles, canUpload, rbacLoading } = useDocumentUpload(() => {
    navigation.replace("Queue");
  });

  useEffect(() => {
    if (!rbacLoading && canUpload) {
      void requestPermission();
    }
  }, [canUpload, rbacLoading, requestPermission]);

  const layout = useMemo(() => {
    const headerH = insets.top + 52;
    const sheetH = 100 + Math.max(insets.bottom, 12);
    const shutterH = 72;
    const gapAfterFrame = 18;
    const controlsH = gapAfterFrame + shutterH + 16;
    const availableH = height - headerH - sheetH - controlsH;
    const a4 = 297 / 210;
    let frameW = Math.min(width * 0.78, 340);
    let frameH = frameW * a4;
    if (frameH > availableH) {
      frameH = Math.max(availableH, 260);
      frameW = frameH / a4;
    }
    const frameLeft = (width - frameW) / 2;
    const frameTop = headerH + Math.max(8, (availableH - frameH) / 2);
    const shutterTop = frameTop + frameH + gapAfterFrame;
    return {
      frameW,
      frameH,
      frameLeft,
      frameTop,
      shutterTop,
    };
  }, [height, insets.bottom, insets.top, width]);

  const busy = capturing || uploading || rbacLoading;

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
    if (busy || !permission?.granted || !canUpload) {
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
        <ScanLine height={layout.frameH} />
        <Corner color={CORNER.tl} style={styles.tl} />
        <Corner color={CORNER.tr} style={styles.tr} />
        <Corner color={CORNER.bl} style={styles.bl} />
        <Corner color={CORNER.br} style={styles.br} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="close" onPress={() => navigation.goBack()} />
        <View style={styles.headerRight}>
          <IconButton
            name={torch ? "flashlight" : "flashlight-outline"}
            onPress={() => setTorch((value) => !value)}
            active={torch}
            accessibilityLabel="Toggle flashlight"
          />
          <IconButton
            name="image-outline"
            onPress={() => {
              void handleFiles(pickFromLibrary);
            }}
            accessibilityLabel="Upload from gallery"
          />
          <IconButton
            name="document-outline"
            onPress={() => {
              void handleFiles(pickDocuments);
            }}
            accessibilityLabel="Upload from files"
          />
        </View>
      </View>

      <View style={[styles.shutterWrap, { top: layout.shutterTop }]}>
        <TouchableOpacity
          style={styles.shutterOuter}
          onPress={() => {
            void takePhoto();
          }}
          disabled={busy || !permission?.granted || !canUpload}
          activeOpacity={0.85}
          accessibilityLabel="Capture document"
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>
      </View>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.grabber} />
        <Text style={styles.sheetTitle}>Scan an invoice or receipt</Text>
        <Text style={styles.sheetMeta}>Camera • Photos • PDF</Text>
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
      hitSlop={10}
      style={[styles.iconBtn, active && styles.iconBtnActive]}
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={name} size={22} color={colors.white} />
    </TouchableOpacity>
  );
}

function Corner({ color, style }: { color: string; style: object }) {
  return <View style={[styles.corner, { borderColor: color }, style]} />;
}

function ScanLine({ height }: { height: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const travel = Math.max(height - 24, 80);
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [12, travel],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.scanLine, { transform: [{ translateY }] }]}
    />
  );
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
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderWidth: 5,
    borderRadius: 14,
  },
  tl: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tr: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bl: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  br: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: SCAN_LINE,
    shadowColor: SCAN_LINE,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  shutterWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#1C1C1E",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 24,
    alignItems: "center",
    zIndex: 2,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginBottom: 14,
  },
  sheetTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  sheetMeta: {
    marginTop: 6,
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
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
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  permissionHint: {
    marginTop: 8,
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
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
    fontWeight: "700",
    color: colors.textHeading,
  },
  busy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  busyLabel: {
    marginTop: 12,
    color: colors.white,
    fontWeight: "600",
  },
});
