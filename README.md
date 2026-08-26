# Glancewise Mobile

React Native (Expo) companion app for Glancewise. It uses the same tenant APIs as the web app.

## What this app does

- Two-step login (`/users/login/` then `/users/select-tenant/`)
- Workspace switcher with `X-Tenant-ID`
- Document processing queue (list, stats, search, status filters)
- Document detail and retry
- Camera / photo library / PDF upload
- Notifications
- Session refresh with rotating refresh tokens

It is **not** a full replacement for the web product (no GL, reports, banking, billing, or connectors).

## Tech stack

- Expo SDK 54 / React Native 0.81
- TypeScript
- React Navigation
- Axios + AsyncStorage

## Prerequisites

- Node.js >= 20.19.4
- pnpm
- Expo Go (device testing) or iOS Simulator / Android Emulator
- A Glancewise backend (`dev` / staging) with `DISABLE_RECAPTCHA=true` until native reCAPTCHA is added

## Install

```bash
cd glance-mobile
pnpm install
```

## API URL

Use an environment-specific start script. Do not use `npx expo start:staging` — Expo CLI has no such command.

```bash
pnpm start:staging      # staging.glancewise.app
pnpm start:local        # local Django
pnpm start:production   # app.glancewise.app
```

| Script | API |
|---|---|
| `start:local` | iOS `http://localhost:8000/api` · Android emulator `http://10.0.2.2:8000/api` |
| `start:staging` | `https://staging.glancewise.app/api` |
| `start:production` | `https://app.glancewise.app/api` |

Override with `EXPO_PUBLIC_API_BASE_URL` if needed (e.g. phone + local backend):

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.68.60:8000/api pnpm start:local
```

## Run & build

Command reference (local, staging, tunnel, EAS APK/IPA): **[HELP.md](./HELP.md)**

```bash
pnpm start:staging
pnpm ios
pnpm android
```

## Auth contract (matches glance-backend)

1. `POST /api/users/login/` `{ username, password }` → `{ access, refresh, tenants[], pending_invitations[] }`
2. `POST /api/users/select-tenant/` `{ tenant_id }` → tenant-scoped `{ access, refresh }`
3. Every tenant API call sends `Authorization: Bearer <access>` and `X-Tenant-ID: <uuid>`
4. `POST /api/users/token/refresh/` rotates both access and refresh tokens
5. `POST /api/users/logout/` blacklists the refresh token

### Other endpoints used

- `GET /api/users/my-tenants/`
- `GET /api/users/me/`
- `GET /api/document-processing/preprocessing/` (`page`, `per_page`, `search`, `summary_status`)
- `GET /api/document-processing/preprocessing/stats/`
- `GET /api/document-processing/preprocessing/{uuid}/`
- `POST /api/document-processing/preprocessing/{uuid}/retry/`
- `POST /api/financial-document/upload-financial-documents/` (multipart field `documents`)
- `GET /api/users/notifications/`
- `GET /api/users/notifications/unread-count/`
- `POST /api/users/notifications/{id}/mark-read/`
- `POST /api/users/notifications/mark-all-read/`

## Store builds (EAS)

```bash
pnpm add -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview   # internal APK
eas build --platform ios --profile preview       # TestFlight / ad hoc
```

Production store binaries use `--profile production`.

## Project structure

```
src/
  config/          API client, env
  core/            storage + session events
  services/        auth, tenant, documents, notifications
  screens/
  navigation/
  types/
  utils/
```

## License

Proprietary — Glancewise
