/**
 * Native cleartext HTTP is only enabled when talking to a local API.
 * Staging and production builds use HTTPS.
 */
module.exports = ({ config }) => {
  const apiEnv = String(
    process.env.EXPO_PUBLIC_API_ENV || config.extra?.apiEnv || ""
  ).toLowerCase();
  const allowLocalHttp = apiEnv === "local";

  return {
    ...config,
    android: {
      ...config.android,
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
