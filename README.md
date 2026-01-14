# Glancewise Mobile App

React Native mobile application for Glancewise built with Expo.

## Features

- ✅ User Authentication (Login/Logout)
- ✅ Company Selection
- ✅ Document Processing Queue View
- ✅ Document Details
- ✅ Pull to Refresh
- ✅ Infinite Scroll
- ✅ Status Badges

## Tech Stack

- React Native
- Expo
- TypeScript
- React Navigation
- Axios
- AsyncStorage

## Prerequisites

- Node.js >= 20.16.0 (or use your current version)
- npm or pnpm
- Expo Go app (for testing on physical devices)
- iOS Simulator (Mac only) or Android Emulator

## Installation

```bash
cd glance-mobile
npm install
```

## Configuration

Update the API base URL in `src/config/api.ts`:

```typescript
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000/api'  // Local development
  : 'https://staging.glancewise.app/api';  // Staging/Production
```

### Important API Endpoints

Make sure your backend has these endpoints:

- `POST /api/auth/login/` - User login
- `POST /api/auth/token/refresh/` - Refresh token
- `GET /api/companies/` - Get list of companies
- `GET /api/documents/processing-queue/` - Get processing queue
- `GET /api/documents/{id}/` - Get document details
- `POST /api/documents/{id}/retry/` - Retry failed document

## Running the App

### Development Mode

```bash
# Start the Expo development server
npm start

# Or run on specific platforms
npm run android   # Android
npm run ios       # iOS (Mac only)
npm run web       # Web browser
```

### Using Expo Go

1. Install Expo Go on your mobile device
2. Run `npm start`
3. Scan the QR code with your device camera (iOS) or Expo Go app (Android)

## Project Structure

```
glance-mobile/
├── App.tsx                 # Main app entry point with navigation
├── src/
│   ├── config/
│   │   └── api.ts         # API configuration and interceptors
│   ├── services/
│   │   ├── auth.service.ts       # Authentication service
│   │   ├── company.service.ts    # Company management
│   │   └── document.service.ts   # Document operations
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── CompanySelectionScreen.tsx
│   │   ├── ProcessingQueueScreen.tsx
│   │   └── DocumentDetailScreen.tsx
│   └── types/
│       └── navigation.ts  # TypeScript types for navigation
└── package.json
```

## Key Features Implementation

### Authentication Flow

1. User enters credentials on Login screen
2. App calls `/api/auth/login/` endpoint
3. Stores access token, refresh token, and user data in AsyncStorage
4. Navigates to Company Selection screen

### Company Selection

1. Fetches list of companies from backend
2. User selects a company
3. Stores selected company in AsyncStorage
4. Navigates to Processing Queue

### Processing Queue

- Displays paginated list of documents
- Pull to refresh functionality
- Infinite scroll for loading more documents
- Status badges (Processing, Completed, Failed, Pending)
- Tap to view document details

### Document Details

- Shows detailed information about a document
- Retry functionality for failed documents
- Status tracking

## Testing on Different Environments

### Local Backend (Development)

```typescript
// In src/config/api.ts
export const API_BASE_URL = 'http://localhost:8000/api';
```

**Note for iOS Simulator:** Use your computer's local IP address instead of `localhost`:
```typescript
export const API_BASE_URL = 'http://192.168.x.x:8000/api';
```

**Note for Android Emulator:** Use `10.0.2.2` instead of `localhost`:
```typescript
export const API_BASE_URL = 'http://10.0.2.2:8000/api';
```

### Staging Environment

```typescript
export const API_BASE_URL = 'https://staging.glancewise.app/api';
```

## Building for Production

### Android

```bash
# Build APK
eas build --platform android --profile preview

# Build for Google Play Store
eas build --platform android --profile production
```

### iOS

```bash
# Build for TestFlight
eas build --platform ios --profile preview

# Build for App Store
eas build --platform ios --profile production
```

## Troubleshooting

### Node Version Warnings

The project requires Node >= 20.19.4, but it should work with Node 20.15.1. If you encounter issues, consider upgrading Node:

```bash
# Using nvm
nvm install 20.19.4
nvm use 20.19.4
```

### Connection Refused Errors

1. Make sure your backend is running
2. Check the API_BASE_URL configuration
3. For physical devices, use your computer's IP address instead of localhost
4. Ensure your device is on the same network as your development machine

### Authentication Errors

1. Verify the login endpoint returns the expected format:
   ```json
   {
     "access": "token",
     "refresh": "refresh_token",
     "user": {...}
   }
   ```
2. Check that the backend accepts the credentials

### CORS Issues (if using web)

Make sure your Django backend has CORS properly configured:

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:19006",  # Expo web default port
]
```

## API Response Examples

### Login Response
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Companies Response
```json
[
  {
    "id": 1,
    "name": "Acme Corporation",
    "logo": "https://example.com/logo.png"
  }
]
```

### Processing Queue Response
```json
{
  "count": 50,
  "next": "https://api.example.com/documents/processing-queue/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "file_name": "invoice_2024.pdf",
      "status": "processing",
      "uploaded_at": "2024-01-14T10:30:00Z",
      "processed_at": null,
      "file_type": "application/pdf",
      "file_size": 1024000
    }
  ]
}
```

## Next Steps

1. **Add More Features:**
   - Document upload functionality
   - Advanced filtering and search
   - Push notifications for processing completion
   - Offline mode with data sync

2. **Improve UI/UX:**
   - Add custom fonts
   - Implement dark mode
   - Add animations
   - Improve error handling with better UI feedback

3. **Testing:**
   - Add unit tests with Jest
   - Add E2E tests with Detox
   - Implement error tracking (Sentry)

4. **Performance:**
   - Implement image caching
   - Add Redux or Context API for state management
   - Optimize list rendering with React.memo

## License

Proprietary - Glancewise
# glance-mobile
