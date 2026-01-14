# Glancewise Mobile - Getting Started Guide

## Quick Start

### 1. Install Dependencies

```bash
cd glance-mobile
npm install
```

### 2. Configure API Connection

**Option A: Using Local Backend**

Update `src/config/api.ts`:

For physical device testing, find your computer's IP address:

```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

Then use your IP address (e.g., `192.168.1.100`):

```typescript
export const API_BASE_URL = 'http://192.168.1.100:8000/api';
```

**Option B: Using Staging Backend**

```typescript
export const API_BASE_URL = 'https://staging.glancewise.app/api';
```

### 3. Start Development Server

```bash
npm start
```

This will open Expo DevTools in your browser.

### 4. Run on Device or Simulator

**Physical Device (Recommended for Testing):**
1. Install "Expo Go" app from App Store (iOS) or Play Store (Android)
2. Scan QR code from terminal or Expo DevTools
3. App will load on your device

**iOS Simulator (Mac only):**
```bash
npm run ios
```

**Android Emulator:**
```bash
npm run android
```

**Web Browser:**
```bash
npm run web
```

## Testing the App

### Default Test Flow

1. **Login Screen**
   - Enter your Glancewise credentials
   - Email: your.email@example.com
   - Password: your_password

2. **Company Selection**
   - Select a company from the list
   - This will be remembered for future sessions

3. **Processing Queue**
   - View all documents in the processing queue
   - Pull down to refresh
   - Scroll to load more documents
   - Tap any document to view details

4. **Document Details**
   - View complete document information
   - Retry failed documents

### Backend Requirements

Your Django backend must have these endpoints:

```
POST /api/auth/login/
POST /api/auth/token/refresh/
GET  /api/companies/
GET  /api/documents/processing-queue/
GET  /api/documents/{id}/
POST /api/documents/{id}/retry/
```

## Common Issues & Solutions

### Issue: "Network request failed" or "Connection refused"

**Solution:**
1. Check that your backend is running:
   ```bash
   # In glance-backend directory
   docker-compose up
   # Or for staging
   docker-compose -f docker-compose.staging.yml up
   ```

2. If testing on physical device, make sure:
   - Device and computer are on the same WiFi network
   - You're using your computer's IP address (not localhost)
   - Backend is accessible from network (not just localhost)

3. Update Django settings to allow your IP:
   ```python
   # glance/settings/local.py
   ALLOWED_HOSTS = ['*']  # For development only
   
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:19006",  # Expo web
       "http://192.168.1.100:19000",  # Your IP
   ]
   ```

### Issue: "Cannot connect to Metro bundler"

**Solution:**
```bash
# Clear cache and restart
npm start -- --clear
```

### Issue: Module resolution errors

**Solution:**
```bash
# Remove node_modules and reinstall
rm -rf node_modules
npm install
```

### Issue: iOS build fails

**Solution:**
```bash
# Clear iOS cache
cd ios
pod deintegrate
pod install
cd ..
```

## Project Structure Explained

```
glance-mobile/
├── App.tsx                          # Main app with navigation
├── src/
│   ├── config/
│   │   └── api.ts                  # Axios configuration, interceptors
│   ├── services/                    # Business logic layer
│   │   ├── auth.service.ts         # Login, logout, token management
│   │   ├── company.service.ts      # Company selection & storage
│   │   └── document.service.ts     # Document operations
│   ├── screens/                     # UI screens
│   │   ├── LoginScreen.tsx
│   │   ├── CompanySelectionScreen.tsx
│   │   ├── ProcessingQueueScreen.tsx
│   │   └── DocumentDetailScreen.tsx
│   └── types/
│       └── navigation.ts           # TypeScript navigation types
```

## Development Workflow

### Making Changes

1. Edit files in `src/` directory
2. Expo will automatically reload the app (Fast Refresh)
3. Check terminal for errors

### Debugging

1. **Console logs:** Use `console.log()` - output appears in terminal
2. **React DevTools:** Press `Shift + M` in terminal
3. **Network requests:** Check terminal output or use Reactotron
4. **Errors:** Shake device (physical) or press `Cmd+D` (iOS) / `Cmd+M` (Android) for debug menu

### Testing Different Scenarios

**Test successful login:**
- Use valid credentials from your backend

**Test failed login:**
- Use invalid credentials
- Check error message display

**Test company selection:**
- Select different companies
- Verify data loads correctly

**Test processing queue:**
- Verify documents load
- Test pull-to-refresh
- Test infinite scroll
- Test different document statuses

**Test offline behavior:**
- Turn off WiFi
- Check error handling

## Customization

### Update App Name
Edit `app.json`:
```json
{
  "expo": {
    "name": "Your App Name"
  }
}
```

### Change Theme Colors
Edit individual screen files and update StyleSheet colors.

### Add App Icon
Replace `assets/icon.png` with your icon (1024x1024 px)

### Add Splash Screen
Replace `assets/splash.png` with your splash screen

## Building for Production

### Setup EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Build APK (Android)

```bash
eas build --platform android --profile preview
```

### Build for iOS

```bash
eas build --platform ios --profile preview
```

## Backend Integration Checklist

- [ ] Backend is running and accessible
- [ ] CORS is configured correctly
- [ ] Auth endpoints return correct format
- [ ] Company endpoint returns list of companies
- [ ] Processing queue endpoint supports pagination
- [ ] Document detail endpoint works
- [ ] Retry endpoint works for failed documents

## Next Steps After Setup

1. Test all screens and flows
2. Customize UI/UX to match brand
3. Add more features (document upload, filters, etc.)
4. Implement push notifications
5. Add analytics
6. Set up error tracking (Sentry)
7. Write tests
8. Optimize performance
9. Prepare for production deployment

## Getting Help

If you encounter issues:

1. Check the terminal for error messages
2. Review the README.md for troubleshooting
3. Check Expo documentation: https://docs.expo.dev/
4. Review React Navigation docs: https://reactnavigation.org/

## Useful Commands

```bash
# Start development server
npm start

# Start with cache cleared
npm start -- --clear

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run in web browser
npm run web

# Check for updates
npm outdated

# Update dependencies
npm update
```
