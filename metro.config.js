const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/**
 * pdf.js 4 ships only as ES modules. Hermes must not parse them: the WebView
 * is the only runtime. Metro will not package a file as an asset unless its
 * extension is in assetExts, and `.mjs` has to stay a JavaScript extension
 * for other dependencies. Copy the two legacy builds to a cache file Metro
 * can package, then resolve the virtual ids below to those copies.
 */
const cacheDir = path.join(__dirname, "node_modules", ".cache", "glance-pdfjs");
fs.mkdirSync(cacheDir, { recursive: true });

const PDFJS_ASSETS = {
  "pdfjs-main-raw": {
    source: require.resolve("pdfjs-dist/legacy/build/pdf.min.mjs"),
    packed: path.join(cacheDir, "pdf.min.pdfjs"),
  },
  "pdfjs-worker-raw": {
    source: require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs"),
    packed: path.join(cacheDir, "pdf.worker.pdfjs"),
  },
};

for (const asset of Object.values(PDFJS_ASSETS)) {
  const sourceStat = fs.statSync(asset.source);
  const stampPath = `${asset.packed}.stamp`;
  const stamp = `${sourceStat.size}:${sourceStat.mtimeMs}`;
  const packedStat = fs.existsSync(asset.packed) ? fs.statSync(asset.packed) : null;
  const previous = packedStat && fs.existsSync(stampPath) ? fs.readFileSync(stampPath, "utf8") : "";
  // The copy's own mtime is not the library's mtime, and a new build can keep
  // the same byte length. The stamp records the source identity instead.
  if (!packedStat || packedStat.size !== sourceStat.size || previous !== stamp) {
    fs.copyFileSync(asset.source, asset.packed);
    fs.writeFileSync(stampPath, stamp);
  }
}

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("pdfjs");

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const asset = PDFJS_ASSETS[moduleName];
  if (asset) {
    return {
      type: "assetFiles",
      filePaths: [asset.packed],
    };
  }
  if (typeof upstreamResolveRequest === "function") {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
