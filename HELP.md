# Glancewise Mobile — run and build

| Field | Value |
|-------|-------|
| **Document ID** | MO-DOC-011 |
| **Version** | 2.1 |
| **Owner** | Engineering |
| **Last updated** | 2026-09-10 |
| **Classification** | Internal |
| **Audience** | Mobile developers, QA, release engineering |

All commands run from `glance-mobile`. Use pnpm scripts. Expo CLI has no `start:staging` command.

## Prerequisites

- Node.js >= 20.19.4 (22.13+ recommended)
- pnpm
- Expo Go on the test device, or iOS Simulator / Android Emulator
- EAS login for cloud builds: `npx eas-cli login`

```bash
cd glance-mobile
pnpm install
```

## Environments

| Script / profile | API | Web login |
|---|---|---|
| `start:local` | `http://localhost:8000/api` (Android emulator: `http://10.0.2.2:8000/api`) | `http://localhost:3000` |
| `start:staging` and EAS `preview` | `https://api.staging.glancewise.app/api` | `https://staging.glancewise.app` |
| `start:production` | `https://api.glancewise.app/api` | `https://glancewise.app` |

In local mode, `localhost` is rewritten to Expo’s LAN IP so a physical phone can reach Django and the web login page.

Optional overrides if the wrong network interface is picked:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000/api \
EXPO_PUBLIC_FRONTEND_URL=http://192.168.1.10:3000 \
pnpm start:local
```

Staging/production login needs `DISABLE_RECAPTCHA=true` on the backend until native reCAPTCHA is added.

---

## Run (development)

Same Wi‑Fi as your machine:

```bash
pnpm start:local        # local Django + web
pnpm start:staging      # staging API (use this on a physical phone)
pnpm start:production   # production API
pnpm start              # LAN, no cache clear; Expo Go defaults to local
```

Then scan the QR code with Expo Go (Camera app on iOS).

Open a simulator/emulator from the same Metro session:

```bash
pnpm ios
pnpm android
```

### Remote testers (no IPA / no Apple Developer account)

iPhone cannot install a custom `.ipa` without an Apple Developer Program membership. Testers use **Expo Go**:

1. Install [Expo Go](https://apps.apple.com/app/expo-go/id982107779).
2. Create a free Expo account and sign in inside Expo Go.
3. Add them to the **glancewise-01** org: https://expo.dev/accounts/glancewise-01/settings/members
4. Start Metro with a tunnel (not LAN):

```bash
pnpm start:staging -- --tunnel
```

Send the QR code or `exp://` link. Keep Metro running while they test.

---

## Versioning

User-facing versions are per environment in `env-versions.json`. `package.json` `version` is package identity only. Android `versionCode` / iOS `buildNumber` still auto-increment on EAS (remote).

```bash
pnpm version:get              # all environments
pnpm version:get:staging
pnpm version:set 1.2.0 -- --env=staging
pnpm version:bump:staging     # or: pnpm version:bump -- --env=staging
```

`pnpm build:staging`, `pnpm build:production`, and the platform-specific `build:*` scripts (except `*:no-bump`) prompt before packaging:

```
Current staging version is 1.0.0. Do you want to bump it? [y/N]
```

Answer `y` / `yes` to patch-bump **that environment only**. Anything else keeps the current env version. Commit `env-versions.json` when a bump is accepted. `version:set` and `version:bump` require `--env`.

| Override | Effect |
|---|---|
| `SKIP_VERSION_BUMP=1 pnpm build:staging` | No prompt; keep current env version |
| `pnpm build:staging:no-bump` | Same as skip |
| `MOBILE_VERSION=1.2.0 pnpm build:staging` | Skip bump prompt; writes `1.2.0` into that env in `env-versions.json` so the EAS worker matches |
| CI (`CI` / `GITHUB_ACTIONS` / …) | No prompt; keep current env version |

Do not call `npx eas-cli build` directly if you want the bump prompt — use the `pnpm build:*` scripts.

---

## Build (installable binaries)

Log in once:

```bash
npx eas-cli login
npx eas-cli whoami
```

Project: `@glancewise-01/glancewise-mobile`  
Builds: https://expo.dev/accounts/glancewise-01/projects/glancewise-mobile/builds

### Android staging APK (remote QA)

Uses EAS profile `preview` (`EXPO_PUBLIC_API_ENV=staging`). Produces an internal APK.

```bash
pnpm build:staging
# or
pnpm build:android:preview
```

Share the install link from the Expo build page when it finishes (~15–30 min).

### iOS staging (requires Apple Developer)

Needs a paid Apple Developer account, signing certificates, and registered device UDIDs for internal/ad hoc installs.

```bash
npx eas-cli device:create
pnpm build:ios:preview
```

`device:create` prints a URL each tester must open **on their iPhone** so the UDID is registered. Then rebuild so the provisioning profile includes those devices.

Without an Apple Developer ID, use Expo Go + `--tunnel` (see above). TestFlight also requires Apple Developer + `eas submit`.

### Android production APK (sideload, production API)

Same install flow as staging, but talks to `https://api.glancewise.app`.

```bash
pnpm build:android:production-apk
```

### Production store binaries

```bash
pnpm build:android:production   # Play Store AAB
pnpm build:ios:production       # App Store / TestFlight (Apple Developer required)
```

### Useful EAS commands

```bash
npx eas-cli build:list
npx eas-cli build:view
pnpm build:staging -- --no-wait
```

---

## Quality checks

```bash
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm test:version-tools
```

---

## Troubleshooting

| Symptom | What to do |
|---|---|
| Testers cannot open `exp://192.168.x.x` | That is LAN-only. Use `--tunnel` or an EAS APK. |
| `Network request failed` on a phone | Do not use `localhost`. Use `start:staging` or a LAN IP override. |
| Invalid credentials / captcha | Set `DISABLE_RECAPTCHA=true` on the API, or add native reCAPTCHA. |
| iOS `device:create` asks for Apple ID | Internal IPA needs Apple Developer. Use Expo Go until that exists. |
| EAS iOS: no credentials for internal distribution | Run `pnpm build:ios:preview` in your own terminal (interactive Apple login + 2FA). |
