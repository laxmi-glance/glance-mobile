/**
 * Native cleartext HTTP is only enabled when talking to a local API.
 * Staging and production builds use HTTPS.
 *
 * Product version: env-versions.json for the active API environment.
 * package.json "version" is package identity and a fallback only.
 */
const { ENV_NAMES, resolveAppVersion } = require("./scripts/version-tools");

module.exports = ({ config }) => {
  const apiEnv = String(
    process.env.EXPO_PUBLIC_API_ENV || config.extra?.apiEnv || ""
  ).toLowerCase();
  const knownEnv = ENV_NAMES.includes(apiEnv) ? apiEnv : null;
  const allowLocalHttp = knownEnv === "local";
  const version = resolveAppVersion(knownEnv || "local");

  const plugins = (config.plugins || []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== "expo-build-properties";
  });

  plugins.push([
    "expo-build-properties",
    {
      android: {
        usesCleartextTraffic: allowLocalHttp,
      },
    },
  ]);

  return {
    ...config,
    version,
    plugins,
    extra: {
      ...config.extra,
      ...(knownEnv ? { apiEnv: knownEnv } : {}),
      appVersion: version,
    },
    android: {
      ...config.android,
      allowBackup: false,
    },
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        ...(allowLocalHttp
          ? {
              NSAppTransportSecurity: {
                NSAllowsArbitraryLoads: true,
                NSAllowsLocalNetworking: true,
              },
            }
          : {}),
      },
    },
  };
};
