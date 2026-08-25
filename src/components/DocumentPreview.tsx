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
import { colors, radius } from "../theme";

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

function pdfHtml(base64: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4" />
    <style>
      html, body { margin: 0; padding: 0; background: #f4f5f9; }
      canvas { display: block; width: 100%; margin: 0 0 12px; background: #fff; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  </head>
  <body>
    <div id="pages"></div>
    <script>
      pdfjsLib.disableWorker = true;
      const raw = atob("${base64}");
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const host = document.getElementById("pages");
      pdfjsLib.getDocument({ data: bytes }).promise.then(async (pdf) => {
        const scale = (window.innerWidth / 612) * 1.15;
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          const viewport = page.getViewport({ scale: Math.max(scale, 1.1) });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          host.appendChild(canvas);
          await page.render({ canvasContext: context, viewport }).promise;
        }
      }).catch((err) => {
        host.innerHTML = '<p style="padding:16px;font-family:sans-serif;color:#dc2626">Could not render this PDF.</p>';
        console.error(err);
      });
    </script>
  </body>
</html>`;
}

export default function DocumentPreview({ url, fileName }: Props) {
  const pdf = useMemo(() => isPdfSource(url, fileName), [url, fileName]);
  const image = useMemo(() => isImageSource(url, fileName), [url, fileName]);
  const [pdfHtmlSource, setPdfHtmlSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(pdf);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pdf) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadPdf = async () => {
      if (Platform.OS === "ios") {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const dest = `${FileSystem.cacheDirectory}payable-preview.pdf`;
        const download = await FileSystem.downloadAsync(url, dest);
        const base64 = await FileSystem.readAsStringAsync(download.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (!cancelled) {
          setPdfHtmlSource(pdfHtml(base64));
        }
      } catch {
        if (!cancelled) {
          setError("Could not load the original document.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : null}
        <WebView
          source={{ uri: url }}
          originWhitelist={["*"]}
          startInLoadingState
          scalesPageToFit
          nestedScrollEnabled
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError("Could not load the original document.");
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
        {loading || !pdfHtmlSource ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.loadingText}>Loading original document…</Text>
          </View>
        ) : (
          <WebView
            originWhitelist={["*"]}
            source={{ html: pdfHtmlSource, baseUrl: "https://cdnjs.cloudflare.com" }}
            nestedScrollEnabled
            javaScriptEnabled
            scalesPageToFit
            setSupportMultipleWindows={false}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <WebView
        source={{ uri: url }}
        originWhitelist={["*"]}
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

const styles = StyleSheet.create({
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
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  fallback: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  fallbackText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: "center",
  },
});
