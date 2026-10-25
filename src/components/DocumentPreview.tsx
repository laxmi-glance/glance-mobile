import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import { PAYABLE_PREVIEW_CACHE_NAME } from "../core/storage";
import { radius, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";
import {
  INLINE_PREVIEW_BASE_URL,
  PREVIEW_ORIGIN_WHITELIST,
  createPreviewNavigationGuard,
  inlinePreviewNavigationGuard,
  pdfHtml,
} from "./documentPreviewHtml";
import { loadPdfJsSources } from "./pdfJsBundle";

type Props = {
  url: string;
  fileName?: string | null;
};

function isPdfSource(url: string, fileName?: string | null): boolean {
  if (fileName && /\.pdf$/i.test(fileName)) {
    return true;
  }
  return /\.pdf(?:$|\?|#)/i.test(url);
}

function isImageSource(url: string, fileName?: string | null): boolean {
  const target = `${fileName || ""} ${url}`;
  return /\.(png|jpe?g|gif|webp|heic|heif|bmp)(?:$|\?|#)/i.test(target);
}

const previewOriginWhitelist = [...PREVIEW_ORIGIN_WHITELIST];

export default function DocumentPreview({ url, fileName }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const pdf = useMemo(() => isPdfSource(url, fileName), [url, fileName]);
  const image = useMemo(() => isImageSource(url, fileName), [url, fileName]);
  const [loadedPdf, setLoadedPdf] = useState<{ url: string; html: string } | null>(null);
  const [loadError, setLoadError] = useState<{ url: string; message: string } | null>(null);
  const [iosLoading, setIosLoading] = useState(true);
  const [trackedUrl, setTrackedUrl] = useState(url);
  const [allowInlineNavigation, setAllowInlineNavigation] = useState(() =>
    inlinePreviewNavigationGuard()
  );
  if (trackedUrl !== url) {
    // A refreshed file URL stays on this screen. Reset the one allowed inline
    // load, and show the iOS spinner before the new WebView starts.
    setTrackedUrl(url);
    setIosLoading(true);
    setAllowInlineNavigation(() => inlinePreviewNavigationGuard());
  }
  const pdfHtmlSource = loadedPdf?.url === url ? loadedPdf.html : null;
  const error = loadError?.url === url ? loadError.message : "";
  const allowRemoteNavigation = useMemo(() => createPreviewNavigationGuard([url]), [url]);

  useEffect(() => {
    if (!pdf || Platform.OS === "ios") {
      return;
    }

    let cancelled = false;
    const loadPdf = async () => {
      if (!FileSystem.cacheDirectory) {
        if (!cancelled) {
          setLoadError({ url, message: "Could not load the original document." });
        }
        return;
      }
      // A refresh can start a second download before the first one finishes.
      // Each download uses its own file, and that file is removed after the read.
      const dest =
        `${FileSystem.cacheDirectory}${PAYABLE_PREVIEW_CACHE_NAME}.` +
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      try {
        setLoadError((current) => (current?.url === url ? null : current));
        const [sources, download] = await Promise.all([
          loadPdfJsSources(),
          FileSystem.downloadAsync(url, dest),
        ]);
        const base64 = await FileSystem.readAsStringAsync(download.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (!cancelled) {
          setLoadedPdf({ url, html: pdfHtml(base64, sources.main, sources.worker) });
        }
      } catch {
        if (!cancelled) {
          setLoadError({ url, message: "Could not load the original document." });
        }
      } finally {
        await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => undefined);
      }
    };

    void loadPdf();
    return () => {
      cancelled = true;
    };
  }, [pdf, url]);

  if (error) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>{error}</Text>
      </View>
    );
  }

  if (image) {
    return (
      <ScrollView
        style={styles.frame}
        contentContainerStyle={styles.imageScroll}
        maximumZoomScale={4}
        minimumZoomScale={1}
        bouncesZoom
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={{ uri: url }}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={fileName || "Original document"}
        />
      </ScrollView>
    );
  }

  if (pdf && Platform.OS === "ios") {
    return (
      <View style={styles.frame}>
        {iosLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : null}
        {/* WKWebView draws a PDF without JavaScript. */}
        <WebView
          key={url}
          source={{ uri: url }}
          originWhitelist={previewOriginWhitelist}
          onShouldStartLoadWithRequest={(request) => allowRemoteNavigation(request.url)}
          setSupportMultipleWindows={false}
          javaScriptEnabled={false}
          startInLoadingState
          scalesPageToFit
          nestedScrollEnabled
          onLoadStart={() => setIosLoading(true)}
          onLoadEnd={() => setIosLoading(false)}
          onError={() => {
            setIosLoading(false);
            setLoadError({ url, message: "Could not load the original document." });
          }}
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.brand} />
            </View>
          )}
        />
      </View>
    );
  }

  if (pdf) {
    return (
      <View style={styles.frame}>
        {pdfHtmlSource ? (
          <WebView
            key={url}
            originWhitelist={previewOriginWhitelist}
            onShouldStartLoadWithRequest={(request) => allowInlineNavigation(request.url)}
            source={{ html: pdfHtmlSource, baseUrl: INLINE_PREVIEW_BASE_URL }}
            nestedScrollEnabled
            javaScriptEnabled
            scalesPageToFit
            setSupportMultipleWindows={false}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.loadingText}>Loading original document…</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      {/* The file is shown without running scripts. */}
      <WebView
        key={url}
        source={{ uri: url }}
        originWhitelist={previewOriginWhitelist}
        onShouldStartLoadWithRequest={(request) => allowRemoteNavigation(request.url)}
        setSupportMultipleWindows={false}
        javaScriptEnabled={false}
        startInLoadingState
        nestedScrollEnabled
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
          </View>
        )}
      />
    </View>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    frame: {
      height: 460,
      backgroundColor: colors.surfaceMuted,
      overflow: "hidden",
      borderRadius: radius.md,
    },
    imageScroll: {
      minHeight: 460,
      justifyContent: "center",
    },
    image: {
      width: "100%",
      height: 460,
    },
    loading: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted,
      gap: 8,
    },
    loadingText: {
      ...type.meta,
    },
    fallback: {
      height: 120,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    fallbackText: {
      ...type.callout,
      color: colors.danger,
      textAlign: "center",
    },
  };
}
