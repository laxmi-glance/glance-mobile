#!/usr/bin/env node
/**
 * Mobile app version tools.
 *
 * User-facing versions are tracked per environment in env-versions.json.
 * package.json "version" is the npm/package identity and a fallback only.
 * Android versionCode / iOS buildNumber stay on EAS remote autoIncrement.
 *
 * Commands:
 *   get [--env=<name>]                 Print all env versions, or one env
 *   set <x.y.z> --env=<name>           Set env-versions.json for one env
 *   bump <patch|minor|major> --env=    Bump env-versions.json for one env
 *   prepare [--env=<name>]             Write version metadata into build-env.json
 *
 * Packaged builds (`pnpm run build:*` → scripts/build.js) prompt to bump that
 * environment's patch version unless skipped/overridden:
 *   SKIP_VERSION_BUMP=1          Keep that env's version as-is (no prompt)
 *   MOBILE_VERSION=1.2.3         Force this env's version in env-versions.json (no prompt)
 *
 * Prompt: "Current staging version is x.y.z. Do you want to bump it? [y/N]" (stderr)
 * Answer y/yes → patch bump for that env only. Anything else, EOF, or CI → keep version.
 *
 * Examples:
 *   node scripts/version-tools.js get
 *   node scripts/version-tools.js bump patch --env=staging
 *   MOBILE_VERSION=1.2.0 pnpm run build:production
 *   SKIP_VERSION_BUMP=1 pnpm run build:staging
 */
"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const packagePath = path.join(root, "package.json");
const buildEnvPath = path.join(root, "build-env.json");
const envVersionsPath = path.join(root, "env-versions.json");
const BUILD_HISTORY_LIMIT = 200;
const ENV_NAMES = ["local", "staging", "production"];
const FORCED_VERSION_ENV = "MOBILE_VERSION";
const FORCED_BUILD_VERSION_ENV = "MOBILE_BUILD_VERSION";

const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([A-Za-z0-9._-]+))?$/;

function readPackageJson() {
  return JSON.parse(fs.readFileSync(packagePath, "utf8"));
}

function writePackageJson(pkg) {
  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

function normalizeEnvName(appEnv, { required = false } = {}) {
  const env = String(appEnv || "")
    .trim()
    .toLowerCase();
  if (!env) {
    if (required) {
      throw new Error(`Missing env. Use --env=${ENV_NAMES.join("|")}`);
    }
    return null;
  }
  if (!ENV_NAMES.includes(env)) {
    throw new Error(`Unknown env "${appEnv}". Use ${ENV_NAMES.join("|")}`);
  }
  return env;
}

function requireSemver(version) {
  const v = validateVersion(version);
  parseSemver(v);
  return v;
}

function defaultEnvVersions() {
  const fallback = requireSemver(readPackageJson().version);
  const out = {};
  for (const env of ENV_NAMES) {
    out[env] = fallback;
  }
  return out;
}

function readEnvVersions() {
  const defaults = defaultEnvVersions();
  if (!fs.existsSync(envVersionsPath)) {
    return defaults;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(envVersionsPath, "utf8"));
  } catch (err) {
    throw new Error(
      `Invalid env-versions.json (${err.message}). Fix or restore the file before building — refusing to fall back so versions are not overwritten.`
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      "Invalid env-versions.json: expected an object of { local, staging, production } versions."
    );
  }

  const out = { ...defaults };
  for (const env of ENV_NAMES) {
    if (parsed[env] == null || String(parsed[env]).trim() === "") {
      continue;
    }
    try {
      out[env] = requireSemver(parsed[env]);
    } catch (err) {
      throw new Error(`Invalid ${env} version in env-versions.json: ${err.message}`);
    }
  }
  return out;
}

function writeEnvVersions(versions) {
  const current = readEnvVersions();
  const next = {};
  for (const env of ENV_NAMES) {
    const raw = versions && versions[env] != null ? versions[env] : current[env];
    next[env] = requireSemver(raw);
  }
  fs.writeFileSync(envVersionsPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function getEnvVersion(appEnv) {
  const env = normalizeEnvName(appEnv);
  if (!env) {
    return requireSemver(readPackageJson().version);
  }
  return readEnvVersions()[env];
}

function setEnvVersion(appEnv, nextVersion) {
  const env = normalizeEnvName(appEnv, { required: true });
  const v = requireSemver(nextVersion);
  const versions = readEnvVersions();
  const prev = versions[env];
  versions[env] = v;
  writeEnvVersions(versions);
  console.log(`[version] ${env} ${prev} → ${v}`);
  return v;
}

function bumpEnvVersion(appEnv, part) {
  const current = getEnvVersion(appEnv);
  return setEnvVersion(appEnv, bumpSemver(current, part));
}

function validateVersion(version) {
  const v = String(version || "").trim();
  if (!VERSION_PATTERN.test(v)) {
    throw new Error(
      `Invalid version "${version}". Must be 1–64 chars: letters, digits, . _ -; start with letter/digit.`
    );
  }
  return v;
}

function parseSemver(version) {
  const m = String(version).trim().match(SEMVER_PATTERN);
  if (!m) {
    throw new Error(`Version "${version}" is not semver MAJOR.MINOR.PATCH[-prerelease]`);
  }
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] || null,
  };
}

function formatSemver({ major, minor, patch, prerelease }) {
  const base = `${major}.${minor}.${patch}`;
  return prerelease ? `${base}-${prerelease}` : base;
}

function bumpSemver(version, part) {
  const parsed = parseSemver(version);
  if (part === "major") {
    parsed.major += 1;
    parsed.minor = 0;
    parsed.patch = 0;
    parsed.prerelease = null;
  } else if (part === "minor") {
    parsed.minor += 1;
    parsed.patch = 0;
    parsed.prerelease = null;
  } else if (part === "patch") {
    parsed.patch += 1;
    parsed.prerelease = null;
  } else {
    throw new Error(`Unknown bump part "${part}" (use patch|minor|major)`);
  }
  return formatSemver(parsed);
}

function getGitSha() {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: root,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch (_e) {
    return null;
  }
}

function formatBuildTimestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`
  );
}

function readForcedVersion() {
  return String(process.env[FORCED_VERSION_ENV] || "").trim();
}

/**
 * Resolve the user-facing app version for Expo / EAS.
 * MOBILE_VERSION overrides env-versions.json when set (packaged builds also persist it).
 * @param {string} [appEnv]
 */
function resolveAppVersion(appEnv) {
  const fromEnv = readForcedVersion();
  if (fromEnv) {
    return requireSemver(fromEnv);
  }
  if (appEnv) {
    return getEnvVersion(appEnv);
  }
  return requireSemver(readPackageJson().version);
}

function resolveBuildVersion(appVersion) {
  const fromEnv = String(process.env[FORCED_BUILD_VERSION_ENV] || "").trim();
  if (fromEnv) {
    return validateVersion(fromEnv);
  }
  const ci =
    process.env.BUILD_BUILDNUMBER ||
    process.env.GITHUB_RUN_NUMBER ||
    process.env.CIRCLE_BUILD_NUM ||
    process.env.BUILD_NUMBER ||
    "";
  const stamp = String(ci).trim() || formatBuildTimestamp();
  const compact = String(appVersion).replace(/[^A-Za-z0-9._-]/g, ".");
  return validateVersion(`${compact}.${stamp}`);
}

function readBuildEnvJson() {
  if (!fs.existsSync(buildEnvPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(buildEnvPath, "utf8"));
  } catch (_e) {
    return {};
  }
}

function prepareBuildMetadata(appEnv) {
  const version = resolveAppVersion(appEnv);
  const buildVersion = resolveBuildVersion(version);
  const builtAt = new Date().toISOString();
  const gitSha = getGitSha();
  const existing = readBuildEnvJson();
  const resolvedEnv =
    (appEnv && String(appEnv).trim()) ||
    existing.APP_ENV ||
    process.env.APP_ENV ||
    process.env.EXPO_PUBLIC_API_ENV ||
    null;

  const next = {
    ...existing,
    APP_ENV: resolvedEnv,
    version,
    buildVersion,
    builtAt,
    gitSha,
  };
  fs.writeFileSync(buildEnvPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(
    `[version] prepared build-env.json version=${version} buildVersion=${buildVersion}` +
      (gitSha ? ` git=${gitSha}` : "") +
      (resolvedEnv ? ` env=${resolvedEnv}` : "")
  );
  return { version, buildVersion, builtAt, gitSha, appEnv: resolvedEnv };
}

function toSafeBuildNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function setPackageVersion(nextVersion) {
  const v = requireSemver(nextVersion);
  const pkg = readPackageJson();
  const prev = pkg.version;
  pkg.version = v;
  writePackageJson(pkg);
  console.log(`[version] package.json ${prev} → ${v}`);
  return v;
}

function bumpPackageVersion(part) {
  const pkg = readPackageJson();
  const next = bumpSemver(pkg.version, part);
  return setPackageVersion(next);
}

function isAffirmativeBumpAnswer(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  return s === "y" || s === "yes";
}

function formatVersionBumpPrompt(currentVersion, appEnv) {
  const env = String(appEnv || "").trim();
  if (env) {
    return `Current ${env} version is ${currentVersion}. Do you want to bump it? [y/N] `;
  }
  return `Current version is ${currentVersion}. Do you want to bump it? [y/N] `;
}

function isTruthyEnvFlag(value) {
  const s = String(value || "")
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function isCiEnvironment() {
  return (
    isTruthyEnvFlag(process.env.CI) ||
    isTruthyEnvFlag(process.env.TF_BUILD) ||
    isTruthyEnvFlag(process.env.GITHUB_ACTIONS) ||
    isTruthyEnvFlag(process.env.GITLAB_CI) ||
    isTruthyEnvFlag(process.env.CIRCLECI)
  );
}

function openPromptIo() {
  const output = process.stderr;
  if (process.stdin.isTTY) {
    return { input: process.stdin, output, ownedInput: false };
  }
  const device = process.platform === "win32" ? "CONIN$" : "/dev/tty";
  try {
    const fd = fs.openSync(device, "r");
    try {
      const input = fs.createReadStream(null, { fd, autoClose: true });
      return { input, output, ownedInput: true };
    } catch (_streamErr) {
      try {
        fs.closeSync(fd);
      } catch (_closeErr) {
        /* ignore */
      }
      return null;
    }
  } catch (_e) {
    return null;
  }
}

function askQuestion(question, io) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: io.input,
      output: io.output,
      terminal: Boolean(io.input.isTTY || io.output.isTTY || io.ownedInput),
    });
    let settled = false;
    const finish = (answer) => {
      if (settled) {
        return;
      }
      settled = true;
      rl.close();
      if (io.ownedInput) {
        io.input.destroy();
      }
      resolve(String(answer || ""));
    };
    rl.on("error", () => finish(""));
    rl.question(question, finish);
  });
}

async function promptForVersionBump(currentVersion, appEnv) {
  if (isCiEnvironment()) {
    console.log(`[version] bump skipped (CI); using ${currentVersion}`);
    return false;
  }
  const io = openPromptIo();
  if (!io) {
    console.log(`[version] bump skipped (non-interactive); using ${currentVersion}`);
    return false;
  }
  const answer = await askQuestion(formatVersionBumpPrompt(currentVersion, appEnv), io);
  const yes = isAffirmativeBumpAnswer(answer);
  if (!yes) {
    console.log(`[version] bump declined; using ${currentVersion}`);
  }
  return yes;
}

/**
 * Prompt to bump patch on packaged builds.
 * Bumps only the target environment in env-versions.json.
 * MOBILE_VERSION writes that env's version (no prompt) so EAS cloud sees it.
 * SKIP_VERSION_BUMP=1/true keeps the current env version (no prompt).
 * SKIP_VERSION_BUMP and MOBILE_VERSION together are rejected.
 *
 * @param {string} [appEnv]
 * @param {{ confirmBump?: (currentVersion: string, nextVersion: string) => boolean|Promise<boolean> }} [options]
 */
async function autoBumpForPackagedBuild(appEnv, options = {}) {
  const skipRaw = String(process.env.SKIP_VERSION_BUMP || "")
    .trim()
    .toLowerCase();
  const skip = skipRaw === "1" || skipRaw === "true" || skipRaw === "yes";
  const forcedVersion = readForcedVersion();
  if (skip && forcedVersion) {
    throw new Error(`Cannot set both SKIP_VERSION_BUMP and ${FORCED_VERSION_ENV}`);
  }
  const env = normalizeEnvName(appEnv);
  const versionLabel = env || "package.json";

  const previousVersion = env ? getEnvVersion(env) : requireSemver(readPackageJson().version);

  if (forcedVersion) {
    const newVersion = requireSemver(forcedVersion);
    // EAS evaluates app.config.js on the worker, which only sees uploaded files.
    // Persist the forced version so cloud builds match the local override.
    if (env && previousVersion !== newVersion) {
      setEnvVersion(env, newVersion);
      return { bumped: true, previousVersion, newVersion, buildNumber: null };
    }
    console.log(
      `[version] auto-bump skipped (${FORCED_VERSION_ENV}=${newVersion}); ${versionLabel} stays ${previousVersion}`
    );
    return { bumped: false, previousVersion, newVersion, buildNumber: null };
  }

  if (skip) {
    console.log(
      `[version] auto-bump skipped (SKIP_VERSION_BUMP); using ${versionLabel} ${previousVersion}`
    );
    return { bumped: false, previousVersion, newVersion: previousVersion, buildNumber: null };
  }

  const nextVersion = bumpSemver(previousVersion, "patch");
  const usingCustomConfirm = typeof options.confirmBump === "function";
  const confirmed = usingCustomConfirm
    ? (await options.confirmBump(previousVersion, nextVersion)) === true
    : (await promptForVersionBump(previousVersion, env)) === true;
  if (!confirmed) {
    if (usingCustomConfirm) {
      console.log(`[version] bump declined; using ${versionLabel} ${previousVersion}`);
    }
    return { bumped: false, previousVersion, newVersion: previousVersion, buildNumber: null };
  }

  const newVersion = env ? setEnvVersion(env, nextVersion) : setPackageVersion(nextVersion);

  const existing = readBuildEnvJson();
  const existingHistoryRaw = Array.isArray(existing.BUILD_HISTORY)
    ? existing.BUILD_HISTORY
    : Array.isArray(existing.build_history)
      ? existing.build_history
      : [];
  const existingHistory = existingHistoryRaw.filter((entry) => entry && typeof entry === "object");
  const lastKnownNumberFromHistory = existingHistory.length
    ? toSafeBuildNumber(existingHistory[existingHistory.length - 1].build_number)
    : 0;
  const lastKnownNumberFromField = toSafeBuildNumber(existing.BUILD_NUMBER);
  const buildNumber = Math.max(lastKnownNumberFromHistory, lastKnownNumberFromField) + 1;
  const builtAt = new Date().toISOString();
  const entry = {
    build_number: buildNumber,
    version: newVersion,
    previous_version: previousVersion,
    app_env: appEnv || existing.APP_ENV || null,
    built_at_utc: builtAt,
  };
  const nextHistory = [...existingHistory, entry].slice(-BUILD_HISTORY_LIMIT);
  const nextBuildEnv = {
    ...existing,
    APP_ENV: appEnv || existing.APP_ENV || null,
    APP_VERSION: newVersion,
    PREVIOUS_APP_VERSION: previousVersion,
    BUILD_NUMBER: buildNumber,
    LAST_BUILD_AT_UTC: builtAt,
    BUILD_HISTORY: nextHistory,
  };
  fs.writeFileSync(buildEnvPath, `${JSON.stringify(nextBuildEnv, null, 2)}\n`, "utf8");
  console.log(
    `[version] bumped ${versionLabel} ${previousVersion} → ${newVersion} (build #${buildNumber}, ${builtAt})`
  );
  return { bumped: true, previousVersion, newVersion, buildNumber };
}

function parseExplicitEnvArg(argv) {
  const raw = argv.find((a) => a.startsWith("--env="));
  if (!raw) {
    return null;
  }
  return normalizeEnvName(raw.split("=").slice(1).join("="));
}

function parseEnvArg(argv) {
  const fromFlag = parseExplicitEnvArg(argv);
  if (fromFlag) {
    return fromFlag;
  }
  const fromProcess = process.env.APP_ENV || process.env.EXPO_PUBLIC_API_ENV;
  return fromProcess ? normalizeEnvName(fromProcess) : null;
}

function parsePositionalArgs(argv) {
  return argv.filter((a) => !String(a).startsWith("--"));
}

function printAllEnvVersions() {
  const versions = readEnvVersions();
  const width = Math.max(...ENV_NAMES.map((name) => name.length));
  for (const env of ENV_NAMES) {
    console.log(`${env.padEnd(width)}  ${versions[env]}`);
  }
  return versions;
}

function usageEnvList() {
  return ENV_NAMES.join("|");
}

function main(argv = process.argv.slice(2)) {
  const cmd = argv[0];
  const env = parseExplicitEnvArg(argv);
  const positionals = parsePositionalArgs(argv);
  if (!cmd || cmd === "get") {
    if (env) {
      const version = getEnvVersion(env);
      console.log(version);
      return version;
    }
    return printAllEnvVersions();
  }
  if (cmd === "set") {
    const nextVersion = positionals[1];
    if (!nextVersion) {
      throw new Error(`Usage: node scripts/version-tools.js set <x.y.z> [--env=${usageEnvList()}]`);
    }
    if (!env) {
      throw new Error(
        `Missing --env=${usageEnvList()}. App versions live in env-versions.json (e.g. --env=staging).`
      );
    }
    return setEnvVersion(env, nextVersion);
  }
  if (cmd === "bump") {
    const part = positionals[1] || "patch";
    if (!env) {
      throw new Error(
        `Missing --env=${usageEnvList()}. App versions live in env-versions.json (e.g. --env=staging).`
      );
    }
    return bumpEnvVersion(env, part);
  }
  if (cmd === "prepare") {
    return prepareBuildMetadata(parseEnvArg(argv));
  }
  console.error(
    `Usage: node scripts/version-tools.js <get|set|bump|prepare> [--env=${usageEnvList()}] ...`
  );
  process.exit(2);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`[version] ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  VERSION_PATTERN,
  SEMVER_PATTERN,
  ENV_NAMES,
  FORCED_VERSION_ENV,
  envVersionsPath,
  validateVersion,
  parseSemver,
  formatSemver,
  bumpSemver,
  resolveAppVersion,
  resolveBuildVersion,
  prepareBuildMetadata,
  setPackageVersion,
  bumpPackageVersion,
  readEnvVersions,
  getEnvVersion,
  setEnvVersion,
  bumpEnvVersion,
  autoBumpForPackagedBuild,
  formatBuildTimestamp,
  isAffirmativeBumpAnswer,
  formatVersionBumpPrompt,
  isCiEnvironment,
  main,
};
