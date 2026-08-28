# Glancewise Mobile — Run & Build

All commands run from `glance-mobile`. Use pnpm scripts. Expo CLI has no `start:staging` command.

## Prerequisites

- Node.js >= 20.19.4
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
pnpm build:android:preview
```

Equivalent:

```bash
npx eas-cli build --platform android --profile preview
```

Share the install link from the Expo build page when it finishes (~15–30 min).

### iOS staging (requires Apple Developer)

Needs a paid Apple Developer account, signing certificates, and registered device UDIDs for internal/ad hoc installs.

```bash
npx eas-cli device:create
pnpm build:ios:preview
```

Equivalent:

```bash
npx eas-cli build --platform ios --profile preview
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

Equivalent:

```bash
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

### Useful EAS commands

```bash
npx eas-cli build:list
npx eas-cli build:view
npx eas-cli build --platform android --profile preview --non-interactive --no-wait
```

---

## Quality checks

```bash
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
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
