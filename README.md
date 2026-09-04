# Glancewise Mobile

React Native (Expo) companion app for Glancewise. It uses the same tenant APIs as the web app.

| Field | Value |
|-------|-------|
| **Document ID** | MO-DOC-010 |
| **Version** | 2.0 |
| **Owner** | Engineering |
| **Last updated** | 2026-09-02 |
| **Classification** | Internal |
| **Audience** | Mobile developers, QA |

## Purpose

Product overview, auth contract, and quick start. Run/build/EAS procedures: **[HELP.md](./HELP.md)**. Full index: **[docs/README.md](docs/README.md)**.

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

## Install and run

```bash
cd glance-mobile
pnpm install
pnpm start:staging      # device testing against staging API
pnpm start:local        # simulator/emulator + local Django
pnpm start:production   # production API
```

Do **not** use `npx expo start:staging` — Expo CLI has no such command; use pnpm scripts.

Then scan the QR code with Expo Go (physical device) or press `i` / `a` for simulators.

## API environments

Configured in `src/config/env.ts`. Override with `EXPO_PUBLIC_API_BASE_URL` when needed.

| Script | API base | Web app |
|--------|----------|---------|
| `start:local` | iOS `http://localhost:8000/api` · Android emulator `http://10.0.2.2:8000/api` | — |
| `start:staging` | `https://api.staging.glancewise.app/api` | `https://staging.glancewise.app` |
| `start:production` | `https://api.glancewise.app/api` | `https://app.glancewise.app` |

Physical devices cannot reach `localhost`. Use `start:staging` or:

```bash
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:8000/api pnpm start:local
```

Staging login may require `DISABLE_RECAPTCHA=true` on the backend until native reCAPTCHA is wired.

## Test flow (smoke)

1. Sign in with an existing Glancewise username (or email) and password
2. Select a workspace
3. Review the processing queue, pull to refresh, open a document
4. Upload from camera, photos, or PDF
5. Open Notifications and Account (switch workspace / sign out)

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
- `GET /api/users/notifications/` and mark-read endpoints

## Store builds (EAS)

See [HELP.md](./HELP.md) for EAS profiles, tunnel QA, and troubleshooting.

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

## Revision history

| Date | Version | Author | Summary |
|------|---------|--------|---------|
| 2026-09-02 | 2.0 | Engineering | Merged GETTING_STARTED; aligned API URLs with env.ts |
| 2026-06-01 | 1.0 | Engineering | Initial README |
