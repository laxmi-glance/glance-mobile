/**
 * Native Android cleartext is only enabled when talking to a local HTTP API.
 * Staging and production builds use HTTPS.
 */
module.exports = ({ config }) => {
  const apiEnv = String(
    process.env.EXPO_PUBLIC_API_ENV || config.extra?.apiEnv || ""
  ).toLowerCase();

  return {
    ...config,
    android: {
      ...config.android,
      usesCleartextTraffic: apiEnv === "local",
    },
  };
};
