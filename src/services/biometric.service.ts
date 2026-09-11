import { Alert, Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const LOCK_KEY = "biometricLock";
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export type BiometricCapability = {
  available: boolean;
  enrolled: boolean;
  label: string;
};

function labelForTypes(types: LocalAuthentication.AuthenticationType[]): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === "ios" ? "Face ID" : "Face unlock";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return "Iris";
  }
  return "Biometrics";
}

export async function getCapability(): Promise<BiometricCapability> {
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    return {
      available: hardware && enrolled,
      enrolled,
      label: labelForTypes(types),
    };
  } catch {
    return { available: false, enrolled: false, label: "Biometrics" };
  }
}

export async function isEnabled(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(LOCK_KEY, SECURE_OPTIONS);
    return value === "1";
  } catch {
    return false;
  }
}

export async function setEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(LOCK_KEY, "1", SECURE_OPTIONS);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(LOCK_KEY, SECURE_OPTIONS);
  } catch {
    // Preference may already be off.
  }
}

export async function authenticate(promptMessage?: string): Promise<boolean> {
  const capability = await getCapability();
  if (!capability.available) {
    return false;
  }
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || `Unlock with ${capability.label}`,
      cancelLabel: "Cancel",
      fallbackLabel: "Use device passcode",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function enableWithPrompt(): Promise<boolean> {
  const capability = await getCapability();
  if (!capability.available) {
    return false;
  }
  const ok = await authenticate(`Enable ${capability.label}`);
  if (!ok) {
    return false;
  }
  await setEnabled(true);
  return true;
}

export function offerEnableAfterLogin(): void {
  void (async () => {
    if (await isEnabled()) {
      return;
    }
    const capability = await getCapability();
    if (!capability.available) {
      return;
    }
    Alert.alert(
      `Unlock with ${capability.label}?`,
      `Next time you open Glancewise, confirm with ${capability.label} instead of signing in again.`,
      [
        { text: "Not now", style: "cancel" },
        {
          text: `Enable ${capability.label}`,
          onPress: () => {
            void enableWithPrompt().then((ok) => {
              if (!ok) {
                Alert.alert(
                  `${capability.label} not enabled`,
                  "You can turn this on later from Account."
                );
              }
            });
          },
        },
      ]
    );
  })();
}
