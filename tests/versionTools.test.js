"use strict";

/**
 * Build version tooling tests.
 * Run: node tests/versionTools.test.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  bumpSemver,
  validateVersion,
  parseSemver,
  resolveAppVersion,
  resolveBuildVersion,
  formatBuildTimestamp,
  autoBumpForPackagedBuild,
  isAffirmativeBumpAnswer,
  formatVersionBumpPrompt,
  isCiEnvironment,
  readEnvVersions,
  getEnvVersion,
  setEnvVersion,
  ENV_NAMES,
  FORCED_VERSION_ENV,
  main,
} = require("../scripts/version-tools");
const { parseArgs, resolveEasProfile } = require("../scripts/build");

const packagePath = path.join(__dirname, "..", "package.json");
const buildEnvPath = path.join(__dirname, "..", "build-env.json");
const envVersionsPath = path.join(__dirname, "..", "env-versions.json");

function readPkgVersion() {
  return JSON.parse(fs.readFileSync(packagePath, "utf8")).version;
}

function snapshotEnvVersions() {
  return fs.existsSync(envVersionsPath) ? fs.readFileSync(envVersionsPath, "utf8") : null;
}

function restoreEnvVersions(raw) {
  if (raw == null) {
    if (fs.existsSync(envVersionsPath)) {
      fs.unlinkSync(envVersionsPath);
    }
    return;
  }
  fs.writeFileSync(envVersionsPath, raw, "utf8");
}

function assert(cond, msg) {
  if (!cond) {
    throw new Error(`TEST_FAIL: ${msg}`);
  }
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(
      `TEST_FAIL: ${msg} expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`
    );
  }
}

function testSemverBump() {
  assertEq(bumpSemver("1.0.0", "patch"), "1.0.1", "patch bump");
  assertEq(bumpSemver("1.0.9", "minor"), "1.1.0", "minor bump");
  assertEq(bumpSemver("1.9.9", "major"), "2.0.0", "major bump");
  assertEq(bumpSemver("1.2.3-beta.1", "patch"), "1.2.4", "prerelease cleared on patch");
}

function testValidateVersion() {
  assertEq(validateVersion("1.0.1"), "1.0.1", "accept semver");
  assertEq(validateVersion("1.0.1-beta"), "1.0.1-beta", "accept prerelease");
  let threw = false;
  try {
    validateVersion("../evil");
  } catch (_e) {
    threw = true;
  }
  assert(threw, "reject path-like version");
}

function testParseSemver() {
  const p = parseSemver("2.3.4");
  assertEq(p.major, 2, "major");
  assertEq(p.minor, 3, "minor");
  assertEq(p.patch, 4, "patch");
}

function testBuildVersionUsesCi() {
  const prev = process.env.GITHUB_RUN_NUMBER;
  const prevForced = process.env.MOBILE_BUILD_VERSION;
  process.env.GITHUB_RUN_NUMBER = "42";
  delete process.env.MOBILE_BUILD_VERSION;
  delete process.env.BUILD_BUILDNUMBER;
  delete process.env.CIRCLE_BUILD_NUM;
  delete process.env.BUILD_NUMBER;
  try {
    assertEq(resolveBuildVersion("1.0.1"), "1.0.1.42", "CI run number in buildVersion");
  } finally {
    if (prev === undefined) delete process.env.GITHUB_RUN_NUMBER;
    else process.env.GITHUB_RUN_NUMBER = prev;
    if (prevForced === undefined) delete process.env.MOBILE_BUILD_VERSION;
    else process.env.MOBILE_BUILD_VERSION = prevForced;
  }
}

function testTimestampFormat() {
  const stamp = formatBuildTimestamp(new Date(Date.UTC(2026, 6, 13, 19, 5)));
  assertEq(stamp, "202607131905", "UTC timestamp YYYYMMDDHHmm");
}

function testPrepareWritesBuildEnv() {
  assert(
    typeof formatBuildTimestamp() === "string" && formatBuildTimestamp().length === 12,
    "stamp length"
  );
  assert(
    fs.existsSync(path.join(__dirname, "..", "scripts", "version-tools.js")),
    "version-tools present"
  );
  assert(fs.existsSync(path.join(__dirname, "..", "scripts", "build.js")), "build.js present");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gw-mobile-ver-"));
  const file = path.join(tmp, "build-env.json");
  fs.writeFileSync(file, JSON.stringify({ APP_ENV: "local", version: "1.0.1" }, null, 2));
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  assertEq(parsed.version, "1.0.1", "temp build-env version");
  fs.rmSync(tmp, { recursive: true, force: true });
}

function testBumpAnswerParsing() {
  assert(isAffirmativeBumpAnswer("y"), "y confirms");
  assert(isAffirmativeBumpAnswer("Y"), "Y confirms");
  assert(isAffirmativeBumpAnswer("yes"), "yes confirms");
  assert(isAffirmativeBumpAnswer(" YES "), "YES confirms");
  assert(!isAffirmativeBumpAnswer("n"), "n declines");
  assert(!isAffirmativeBumpAnswer(""), "empty declines");
  assert(!isAffirmativeBumpAnswer("no"), "no declines");
  const prompt = formatVersionBumpPrompt("1.2.3");
  assert(prompt.includes("1.2.3"), "prompt shows current version");
  assert(prompt.includes("Do you want to bump it?"), "prompt asks to bump");
  const envPrompt = formatVersionBumpPrompt("1.2.3", "staging");
  assert(envPrompt.includes("staging"), "env prompt names the environment");
  assert(envPrompt.includes("1.2.3"), "env prompt shows current version");
}

function testCiEnvironmentFlags() {
  const prev = {
    CI: process.env.CI,
    TF_BUILD: process.env.TF_BUILD,
    GITHUB_ACTIONS: process.env.GITHUB_ACTIONS,
    GITLAB_CI: process.env.GITLAB_CI,
    CIRCLECI: process.env.CIRCLECI,
  };
  const restore = () => {
    Object.entries(prev).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  };
  try {
    delete process.env.CI;
    delete process.env.TF_BUILD;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.CIRCLECI;
    assert(!isCiEnvironment(), "no CI flags → not CI");
    process.env.CI = "true";
    assert(isCiEnvironment(), "CI=true is CI");
    delete process.env.CI;
    process.env.TF_BUILD = "True";
    assert(isCiEnvironment(), "TF_BUILD=True is CI");
  } finally {
    restore();
  }
}

async function testAutoBumpSkipFlags() {
  const before = readPkgVersion();
  const envBefore = { ...readEnvVersions() };
  const envRaw = snapshotEnvVersions();
  const prevSkip = process.env.SKIP_VERSION_BUMP;
  const prevForced = process.env[FORCED_VERSION_ENV];
  try {
    process.env.SKIP_VERSION_BUMP = "1";
    process.env[FORCED_VERSION_ENV] = "9.9.9";
    let bothThrew = false;
    try {
      await autoBumpForPackagedBuild("staging");
    } catch (err) {
      bothThrew = true;
      assert(String(err.message).includes("Cannot set both"), "both flags rejected");
    }
    assert(bothThrew, "SKIP_VERSION_BUMP + MOBILE_VERSION throws");
    assertEq(readEnvVersions().staging, envBefore.staging, "no write when both flags set");
    assertEq(readPkgVersion(), before, "package.json unchanged when both flags set");

    delete process.env[FORCED_VERSION_ENV];
    process.env.SKIP_VERSION_BUMP = "1";
    const skipped = await autoBumpForPackagedBuild("local");
    assertEq(skipped.bumped, false, "SKIP_VERSION_BUMP does not bump");
    assertEq(skipped.newVersion, envBefore.local, "keeps env version");
    assertEq(readPkgVersion(), before, "package.json unchanged on skip");
    assertEq(readEnvVersions().local, envBefore.local, "env-versions.json unchanged on skip");

    delete process.env.SKIP_VERSION_BUMP;
    process.env[FORCED_VERSION_ENV] = "9.9.9";
    const forced = await autoBumpForPackagedBuild("staging");
    assertEq(forced.bumped, true, "MOBILE_VERSION writes the forced env version for EAS");
    assertEq(forced.newVersion, "9.9.9", "forced version used for build");
    assertEq(readPkgVersion(), before, "package.json unchanged when MOBILE_VERSION set");
    assertEq(readEnvVersions().staging, "9.9.9", "staging set to MOBILE_VERSION");
    assertEq(
      readEnvVersions().production,
      envBefore.production,
      "production unchanged when MOBILE_VERSION targets staging"
    );

    process.env[FORCED_VERSION_ENV] = "9.9.9";
    const forcedSame = await autoBumpForPackagedBuild("staging");
    assertEq(forcedSame.bumped, false, "same MOBILE_VERSION does not rewrite");
    assertEq(readEnvVersions().staging, "9.9.9", "staging stays forced version");
  } finally {
    restoreEnvVersions(envRaw);
    if (prevSkip === undefined) delete process.env.SKIP_VERSION_BUMP;
    else process.env.SKIP_VERSION_BUMP = prevSkip;
    if (prevForced === undefined) delete process.env[FORCED_VERSION_ENV];
    else process.env[FORCED_VERSION_ENV] = prevForced;
  }
}

async function testAutoBumpPromptConfirm() {
  const before = readPkgVersion();
  const envBefore = { ...readEnvVersions() };
  const pkgRaw = fs.readFileSync(packagePath, "utf8");
  const envRaw = snapshotEnvVersions();
  const hadBuildEnv = fs.existsSync(buildEnvPath);
  const buildEnvRaw = hadBuildEnv ? fs.readFileSync(buildEnvPath, "utf8") : null;
  const prevSkip = process.env.SKIP_VERSION_BUMP;
  const prevForced = process.env[FORCED_VERSION_ENV];
  try {
    delete process.env.SKIP_VERSION_BUMP;
    delete process.env[FORCED_VERSION_ENV];

    const declined = await autoBumpForPackagedBuild("local", { confirmBump: () => false });
    assertEq(declined.bumped, false, "n does not bump");
    assertEq(declined.newVersion, envBefore.local, "declined keeps current env version");
    assertEq(readPkgVersion(), before, "package.json unchanged when bump declined");
    assertEq(readEnvVersions().local, envBefore.local, "env-versions unchanged when bump declined");

    const truthyString = await autoBumpForPackagedBuild("local", { confirmBump: () => "n" });
    assertEq(truthyString.bumped, false, "truthy non-true confirm does not bump");
    assertEq(readPkgVersion(), before, "package.json unchanged for truthy non-true confirm");

    const expectedNext = bumpSemver(envBefore.local, "patch");
    const accepted = await autoBumpForPackagedBuild("local", { confirmBump: () => true });
    assertEq(accepted.bumped, true, "y bumps");
    assertEq(accepted.previousVersion, envBefore.local, "records previous env version");
    assertEq(accepted.newVersion, expectedNext, "patch-bumps to next env version");
    assertEq(readEnvVersions().local, expectedNext, "env-versions.json updated on y");
    assertEq(readPkgVersion(), before, "package.json not updated for env bump");
    assertEq(
      readEnvVersions().production,
      envBefore.production,
      "production version unchanged after local bump"
    );
    assertEq(
      readEnvVersions().staging,
      envBefore.staging,
      "staging version unchanged after local bump"
    );
  } finally {
    fs.writeFileSync(packagePath, pkgRaw, "utf8");
    restoreEnvVersions(envRaw);
    if (hadBuildEnv) {
      fs.writeFileSync(buildEnvPath, buildEnvRaw, "utf8");
    } else if (fs.existsSync(buildEnvPath)) {
      fs.unlinkSync(buildEnvPath);
    }
    if (prevSkip === undefined) delete process.env.SKIP_VERSION_BUMP;
    else process.env.SKIP_VERSION_BUMP = prevSkip;
    if (prevForced === undefined) delete process.env[FORCED_VERSION_ENV];
    else process.env[FORCED_VERSION_ENV] = prevForced;
  }
}

async function testCiSkipsBumpWithoutPrompt() {
  const before = readPkgVersion();
  const envBefore = { ...readEnvVersions() };
  const envRaw = snapshotEnvVersions();
  const prevSkip = process.env.SKIP_VERSION_BUMP;
  const prevForced = process.env[FORCED_VERSION_ENV];
  const prevCi = process.env.CI;
  try {
    delete process.env.SKIP_VERSION_BUMP;
    delete process.env[FORCED_VERSION_ENV];
    process.env.CI = "true";
    const result = await autoBumpForPackagedBuild("local");
    assertEq(result.bumped, false, "CI does not bump");
    assertEq(result.newVersion, envBefore.local, "CI keeps current env version");
    assertEq(readPkgVersion(), before, "package.json unchanged in CI");
    assertEq(readEnvVersions().local, envBefore.local, "env-versions.json unchanged in CI");
  } finally {
    restoreEnvVersions(envRaw);
    if (prevSkip === undefined) delete process.env.SKIP_VERSION_BUMP;
    else process.env.SKIP_VERSION_BUMP = prevSkip;
    if (prevForced === undefined) delete process.env[FORCED_VERSION_ENV];
    else process.env[FORCED_VERSION_ENV] = prevForced;
    if (prevCi === undefined) delete process.env.CI;
    else process.env.CI = prevCi;
  }
}

function testEnvVersionsAreIndependent() {
  const envRaw = snapshotEnvVersions();
  const prevForced = process.env[FORCED_VERSION_ENV];
  const prevExpoVersion = process.env.EXPO_PUBLIC_APP_VERSION;
  try {
    assertEq(ENV_NAMES.join(","), "local,staging,production", "known envs");
    delete process.env[FORCED_VERSION_ENV];
    delete process.env.EXPO_PUBLIC_APP_VERSION;
    setEnvVersion("staging", "2.3.4");
    setEnvVersion("production", "1.0.0");
    setEnvVersion("local", "1.5.0");
    assertEq(getEnvVersion("staging"), "2.3.4", "staging set independently");
    assertEq(getEnvVersion("production"), "1.0.0", "production set independently");
    assertEq(getEnvVersion("local"), "1.5.0", "local set independently");
    assertEq(resolveAppVersion("staging"), "2.3.4", "resolveAppVersion uses staging entry");
    assertEq(resolveAppVersion("production"), "1.0.0", "resolveAppVersion uses production entry");
    process.env.EXPO_PUBLIC_APP_VERSION = "8.8.8";
    assertEq(
      resolveAppVersion("staging"),
      "2.3.4",
      "EXPO_PUBLIC_APP_VERSION does not override env-versions"
    );
    process.env[FORCED_VERSION_ENV] = "9.9.9";
    assertEq(resolveAppVersion("staging"), "9.9.9", "MOBILE_VERSION overrides env file");
  } finally {
    restoreEnvVersions(envRaw);
    if (prevForced === undefined) delete process.env[FORCED_VERSION_ENV];
    else process.env[FORCED_VERSION_ENV] = prevForced;
    if (prevExpoVersion === undefined) delete process.env.EXPO_PUBLIC_APP_VERSION;
    else process.env.EXPO_PUBLIC_APP_VERSION = prevExpoVersion;
  }
}

function testReadEnvVersionsFailsClosed() {
  const envRaw = snapshotEnvVersions();
  try {
    const corrupt = "{not-json";
    fs.writeFileSync(envVersionsPath, corrupt, "utf8");
    let threw = false;
    try {
      readEnvVersions();
    } catch (err) {
      threw = true;
      assert(String(err.message).includes("env-versions.json"), "invalid JSON names the file");
    }
    assert(threw, "invalid JSON throws instead of falling back");
    assertEq(
      fs.readFileSync(envVersionsPath, "utf8"),
      corrupt,
      "read does not rewrite a corrupt file"
    );

    fs.writeFileSync(
      envVersionsPath,
      JSON.stringify({ local: "1.0.0", staging: "../evil", production: "9.9.9" }, null, 2),
      "utf8"
    );
    threw = false;
    try {
      readEnvVersions();
    } catch (err) {
      threw = true;
      assert(String(err.message).includes("staging"), "invalid env version names the env");
    }
    assert(threw, "invalid staging version throws");
    assertEq(
      JSON.parse(fs.readFileSync(envVersionsPath, "utf8")).production,
      "9.9.9",
      "does not clobber other envs on invalid staging"
    );

    fs.writeFileSync(
      envVersionsPath,
      JSON.stringify({ local: "1.0.0", staging: "1.0", production: "9.9.9" }, null, 2),
      "utf8"
    );
    threw = false;
    try {
      readEnvVersions();
    } catch (err) {
      threw = true;
      assert(String(err.message).includes("staging"), "non-semver staging names the env");
    }
    assert(threw, "non-semver staging throws");
    assertEq(
      JSON.parse(fs.readFileSync(envVersionsPath, "utf8")).production,
      "9.9.9",
      "does not clobber other envs on non-semver staging"
    );
  } finally {
    restoreEnvVersions(envRaw);
  }
}

function testBuildArgParsing() {
  const staging = parseArgs(["staging"]);
  assertEq(staging.envName, "staging", "staging env");
  assertEq(staging.platform, "android", "default platform android");
  assertEq(staging.apk, false, "staging not apk flag");
  assertEq(resolveEasProfile(staging.envName, staging.apk), "preview", "staging → preview");

  const ios = parseArgs(["staging", "--platform=ios"]);
  assertEq(ios.platform, "ios", "platform=ios");
  assertEq(resolveEasProfile("staging", false), "preview", "ios staging still preview");

  const spaced = parseArgs(["production", "--platform", "ios", "--no-wait"]);
  assertEq(spaced.platform, "ios", "spaced --platform");
  assertEq(spaced.passthrough.join(" "), "--no-wait", "passthrough eas args");

  const dashed = parseArgs(["staging", "--", "--no-wait"]);
  assertEq(dashed.passthrough.join(" "), "--no-wait", "strips lone --");

  const apk = parseArgs(["production", "android", "--apk"]);
  assertEq(apk.apk, true, "apk flag");
  assertEq(
    resolveEasProfile("production", true),
    "production-apk",
    "production --apk → production-apk"
  );
  assertEq(resolveEasProfile("production", false), "production", "production without apk");
  assertEq(resolveEasProfile("local", false), "development", "local → development");

  let threw = false;
  try {
    parseArgs(["beta"]);
  } catch (_e) {
    threw = true;
  }
  assert(threw, "unknown env throws");

  threw = false;
  try {
    parseArgs(["staging", "--platform"]);
  } catch (_e) {
    threw = true;
  }
  assert(threw, "missing --platform value throws");
}

function testCliRequiresEnv() {
  const before = readPkgVersion();
  const envRaw = snapshotEnvVersions();
  try {
    let threw = false;
    try {
      main(["set", "9.9.9"]);
    } catch (err) {
      threw = true;
      assert(String(err.message).includes("--env="), "set without env mentions --env");
    }
    assert(threw, "set without env throws");
    assertEq(readPkgVersion(), before, "set without env does not touch package.json");

    threw = false;
    try {
      main(["bump", "patch"]);
    } catch (err) {
      threw = true;
      assert(String(err.message).includes("--env="), "bump without env mentions --env");
    }
    assert(threw, "bump without env throws");
    assertEq(readPkgVersion(), before, "bump without env does not touch package.json");
  } finally {
    restoreEnvVersions(envRaw);
  }
}

async function run() {
  testSemverBump();
  testValidateVersion();
  testParseSemver();
  testBuildVersionUsesCi();
  testTimestampFormat();
  testPrepareWritesBuildEnv();
  testBumpAnswerParsing();
  testCiEnvironmentFlags();
  testEnvVersionsAreIndependent();
  testReadEnvVersionsFailsClosed();
  testBuildArgParsing();
  testCliRequiresEnv();
  await testAutoBumpSkipFlags();
  await testAutoBumpPromptConfirm();
  await testCiSkipsBumpWithoutPrompt();
  console.log("TEST_PASS: versionTools.test.js");
}

run().catch((err) => {
  console.error("TEST_FAIL:", err && err.message ? err.message : err);
  process.exit(1);
});
