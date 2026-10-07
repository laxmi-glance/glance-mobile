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
 * Interactive Android production builds (no --apk) also ask whether to build a
 * Play Store AAB or a directly installable APK (same install flow as staging).
 * Enter / store keeps the Play Store profile. CI skips the prompt and builds the AAB.
 *
 * Env overrides:
 *   MOBILE_VERSION=1.2.3    Force this env's version in env-versions.json (skips bump prompt)
 *   SKIP_VERSION_BUMP=1     Keep current env-versions.json version (no prompt, no patch bump)
 *
 * Interactive builds ask on stderr: "Current staging version is x.y.z. Do you want to bump it? [y/N]"
 * Answer y/yes to patch-bump that environment only; anything else keeps the current env version.
 * CI (CI/TF_BUILD/GITHUB_ACTIONS/…) skips both prompts and keeps the current env version.
 */
"use strict";

const path = require("path");
const { spawnSync } = require("child_process");
const {
  ENV_NAMES,
  askQuestion,
  autoBumpForPackagedBuild,
  isCiEnvironment,
  openPromptIo,
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

function formatProductionTargetPrompt() {
  return "Build for the Android Play Store (AAB) or direct installation like staging (APK)? [Store/install] ";
}

function parseProductionTargetAnswer(raw) {
  const answer = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (
    answer === "" ||
    answer === "store" ||
    answer === "s" ||
    answer === "aab" ||
    answer === "play" ||
    answer === "play store" ||
    answer === "1"
  ) {
    return "store";
  }
  if (
    answer === "install" ||
    answer === "i" ||
    answer === "apk" ||
    answer === "direct" ||
    answer === "direct install" ||
    answer === "2"
  ) {
    return "install";
  }
  return null;
}

function shouldPromptForProductionTarget(envName, platform, apk) {
  return envName === "production" && platform === "android" && !apk;
}

async function promptForProductionTarget() {
  if (isCiEnvironment()) {
    console.log("[build] production target skipped (CI); using Play Store AAB");
    return false;
  }

  const question = formatProductionTargetPrompt();
  for (;;) {
    const io = openPromptIo();
    if (!io) {
      console.log("[build] production target skipped (non-interactive); using Play Store AAB");
      return false;
    }
    const target = parseProductionTargetAnswer(await askQuestion(question, io));
    if (target === "store") {
      console.log("[build] Play Store build (AAB)");
      return false;
    }
    if (target === "install") {
      console.log("[build] direct install build (APK)");
      return true;
    }
    console.error("[build] Enter store or install.");
  }
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
  const { envName, platform, passthrough } = parsed;
  let { apk } = parsed;
  if (apk && envName !== "production") {
    console.warn("[build] --apk is only used for production (profile production-apk); ignoring.");
    apk = false;
  }
  if (shouldPromptForProductionTarget(envName, platform, apk)) {
    apk = await promptForProductionTarget();
  }

  const bumpResult = await autoBumpForPackagedBuild(envName);
  const meta = prepareBuildMetadata(envName);
  const version = meta.version || resolveAppVersion(envName);
  const profile = resolveEasProfile(envName, apk);

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
  parseProductionTargetAnswer,
  resolveEasProfile,
  shouldPromptForProductionTarget,
};
