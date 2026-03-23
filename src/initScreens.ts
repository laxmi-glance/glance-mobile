import { enableScreens } from 'react-native-screens';

// Run before App / navigators load. Avoids iOS Fabric crash (boolean vs string on RNSScreen)
// when using New Architecture until react-native-screens + RN versions align.
enableScreens(false);
