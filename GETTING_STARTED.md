# Glancewise Mobile — Getting Started

## 1. Install

```bash
cd glance-mobile
pnpm install
```

Pick an API environment (Expo CLI has no `start:staging` command — use pnpm scripts):

```bash
pnpm start:staging      # https://staging.glancewise.app/api  (use this on a phone)
pnpm start:local        # local Django (simulator/emulator)
pnpm start:production   # https://app.glancewise.app/api
pnpm start              # same as local, no cache clear
```

Then scan the QR code with Expo Go.

## 2. API environments

| Script | API |
|---|---|
| `start:local` | iOS `http://localhost:8000/api`, Android emulator `http://10.0.2.2:8000/api` |
| `start:staging` | `https://staging.glancewise.app/api` |
| `start:production` | `https://app.glancewise.app/api` |

A physical iPhone cannot reach `localhost`. Use `start:staging` for device testing, or set `EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:8000/api` for a local backend.

Staging login currently requires `DISABLE_RECAPTCHA=true` on the backend, or a native reCAPTCHA token.

## 3. Test flow

1. Sign in with an existing Glancewise username (or email) and password
2. Select a workspace
3. Review the processing queue, pull to refresh, open a document
4. Upload from camera, photos, or PDF
5. Open Notifications and Account (switch workspace / sign out)

## Troubleshooting

**Network request failed** — the device cannot reach the API URL. Confirm the backend is up and you are not using `localhost` on a phone.

**Invalid credentials / captcha** — production and some staging envs require `recaptcha_token`. Disable recaptcha for mobile QA or add reCAPTCHA Enterprise.

**403 after login** — tenant was not selected, or `X-Tenant-ID` is missing. Sign out and pick a workspace again.

**Cannot retry** — duplicates and successfully completed documents cannot be retried (same rule as web).
