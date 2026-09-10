#!/usr/bin/env node
/**
 * EAS mobile build: prompt to bump that env's patch → prepare version metadata → eas-cli.
 *
 * Usage: node scripts/build.js <local|staging|production> [android|ios|all] [--apk] [...eas args]
 *
 * Env mapping:
 *   local       → EAS profile development
 *   staging     → EAS profile preview
 *   production  → EAS profile production (or production-apk with --apk)
 *
 * Env overrides:
 *   MOBILE_VERSION=1.2.3    Force this env's version in env-versions.json (skips bump prompt)
 *   SKIP_VERSION_BUMP=1     Keep current env-versions.json version (no prompt, no patch bump)
 *
 * Interactive builds ask on stderr: "Current staging version is x.y.z. Do you want to bump it? [y/N]"
 * Answer y/yes to patch-bump that environment only; anything else keeps the current env version.
 * CI (CI/TF_BUILD/GITHUB_ACTIONS/…) skips the prompt and keeps the current env version.
 */
"use strict";

const path = require("path");
const { spawnSync } = require("child_process");
const {
  ENV_NAMES,
  autoBumpForPackagedBuild,
  isCiEnvironment,
  prepareBuildMetadata,
  resolveAppVersion,
} = require("./version-tools");

const root = path.resolve(__dirname, "..");
const PLATFORMS = ["android", "ios", "all"];

function usage(message) {
  if (message) {
    console.error(`[build] ${message}`);
  }
  console.error(
    "Usage: node scripts/build.js <local|staging|production> [android|ios|all] [--apk] [...eas args]"
  );
  process.exit(2);
}

function parseArgs(argv) {
  const envName = argv[0];
  if (!envName || envName.startsWith("-")) {
    throw new Error("Missing env.");
  }
  if (!ENV_NAMES.includes(envName)) {
    throw new Error(`Unknown env: ${envName}`);
  }

  let platform = "android";
  let apk = false;
  const passthrough = [];

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apk") {
      apk = true;
      continue;
    }
    if (arg === "--platform" || arg.startsWith("--platform=")) {
      const value = arg === "--platform" ? argv[i + 1] : arg.slice("--platform=".length);
      if (arg === "--platform") {
        i += 1;
      }
      if (!value || value.startsWith("-") || !PLATFORMS.includes(value)) {
        throw new Error(`Unknown platform: ${value || "(missing)"}`);
      }
      platform = value;
      continue;
    }
    if (PLATFORMS.includes(arg)) {
      platform = arg;
      continue;
    }
    if (arg === "--") {
      continue;
    }
    passthrough.push(arg);
  }

  return { envName, platform, apk, passthrough };
}

function resolveEasProfile(envName, apk) {
  if (envName === "local") {
    return "development";
  }
  if (envName === "staging") {
    return "preview";
  }
  return apk ? "production-apk" : "production";
}

function resolveNpxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: opts.env || process.env,
    windowsHide: true,
  });
  if (result.error) {
    console.error(`[build] failed to start ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status == null ? 1 : result.status);
  }
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    usage(err.message);
    return;
  }
  const { envName, platform, apk, passthrough } = parsed;
  if (apk && envName !== "production") {
    console.warn("[build] --apk is only used for production (profile production-apk); ignoring.");
  }

  const bumpResult = await autoBumpForPackagedBuild(envName);
  const meta = prepareBuildMetadata(envName);
  const version = meta.version || resolveAppVersion(envName);
  const profile = resolveEasProfile(envName, apk && envName === "production");

  const easArgs = [
    "eas-cli",
    "build",
    "--platform",
    platform,
    "--profile",
    profile,
    ...passthrough,
  ];
  if (isCiEnvironment() && !easArgs.includes("--non-interactive")) {
    easArgs.push("--non-interactive");
  }

  console.log(`[build] env=${envName} version=${version} platform=${platform} profile=${profile}`);
  if (bumpResult.bumped) {
    console.log("[build] Commit env-versions.json with this release.");
  }

  run(resolveNpxCommand(), easArgs, {
    env: {
      ...process.env,
      EXPO_PUBLIC_API_ENV: envName,
    },
  });

  console.log(`[build] done — env=${envName} version=${version} profile=${profile}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[build] ${err && err.message ? err.message : err}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  resolveEasProfile,
};
