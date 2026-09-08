/**
 * Native cleartext HTTP is only enabled when talking to a local API.
 * Staging and production builds use HTTPS.
 *
 * Product version: package.json "version" is the single source of truth.
 */
const pkg = require("./package.json");

module.exports = ({ config }) => {
  const apiEnv = String(
    process.env.EXPO_PUBLIC_API_ENV || config.extra?.apiEnv || ""
  ).toLowerCase();
  const allowLocalHttp = apiEnv === "local";

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
    version: pkg.version,
    plugins,
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
