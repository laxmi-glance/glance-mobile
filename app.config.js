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

  return {
    ...config,
    version: pkg.version,
    android: {
      ...config.android,
      allowBackup: false,
      usesCleartextTraffic: allowLocalHttp,
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
