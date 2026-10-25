/**
 * Inline PDF page for the Android WebView.
 *
 * pdf.js 4+ is ESM and always starts a worker (the old disableWorker flag is
 * gone). Both bundles are inlined and started from blob: URLs so the page
 * never requests a script. The worker needs a non-null document origin, so
 * the WebView base URL is INLINE_PREVIEW_BASE_URL. That host is not contacted:
 * .invalid does not resolve, and the page CSP blocks network access.
 */

export const INLINE_PREVIEW_BASE_URL = "https://pdf-preview.invalid/";

const INLINE_PREVIEW_URLS = [INLINE_PREVIEW_BASE_URL, "https://pdf-preview.invalid", "about:blank"];

/**
 * react-native-webview sends any URL that fails this list to Linking
 * (the system browser or an Android intent) and never calls
 * onShouldStartLoadWithRequest. `*:*` matches every scheme so that handler
 * can refuse it. It is not permission to load the URL. about:blank is added
 * by the WebView itself. Do not replace this with "*": that token is a
 * different, wider match.
 */
export const PREVIEW_ORIGIN_WHITELIST = ["*:*"] as const;

export const PDF_PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' blob:",
  "worker-src blob:",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "object-src 'none'",
].join("; ");

function jsonForInlineScript(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function pdfHtml(
  base64: string,
  pdfJsMainSource: string,
  pdfJsWorkerSource: string
): string {
  const bootstrap = `
      const host = document.getElementById("pages");
      const showError = (err) => {
        if (host) {
          host.innerHTML = '<p style="padding:16px;font-family:sans-serif;color:#dc2626">Could not render this PDF.</p>';
        }
        console.error(err);
      };
      try {
        const workerUrl = URL.createObjectURL(
          new Blob([${jsonForInlineScript(pdfJsWorkerSource)}], { type: "text/javascript" })
        );
        const mainUrl = URL.createObjectURL(
          new Blob([${jsonForInlineScript(pdfJsMainSource)}], { type: "text/javascript" })
        );
        const pdfjsLib = await import(mainUrl);
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        const raw = atob(${jsonForInlineScript(base64)});
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        pdfjsLib.getDocument({
          data: bytes,
          isEvalSupported: false,
          useSystemFonts: true,
        }).promise.then(async (pdf) => {
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
        }).catch(showError);
      } catch (err) {
        showError(err);
      }
  `;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Security-Policy" content="${PDF_PREVIEW_CSP}" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4" />
    <style>
      html, body { margin: 0; padding: 0; background: #f4f5f9; }
      canvas { display: block; width: 100%; margin: 0 0 12px; background: #fff; }
    </style>
  </head>
  <body>
    <div id="pages"></div>
    <script type="module">${bootstrap}</script>
  </body>
</html>`;
}

/**
 * Allows one navigation, and only when it is an approved preview URL
 * (the inline page, or the exact signed document URL). Every later request
 * is refused, including http, https, javascript:, data:, and intent: URLs.
 * A request that is not approved does not consume the one allowed load.
 */
export function createPreviewNavigationGuard(allowedUrls: readonly string[]) {
  const allowed = new Set<string>(allowedUrls);
  let acceptedInitialLoad = false;

  return function allowPreviewNavigation(url: string): boolean {
    if (acceptedInitialLoad || !allowed.has(url)) {
      return false;
    }
    acceptedInitialLoad = true;
    return true;
  };
}

export function inlinePreviewNavigationGuard() {
  return createPreviewNavigationGuard(INLINE_PREVIEW_URLS);
}
