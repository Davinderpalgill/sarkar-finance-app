import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });

const STORAGE_KEY = '@biometrics_enabled';

export const BiometricService = {
  /** Check if Face ID / Touch ID is available on this device */
  async isAvailable(): Promise<{ available: boolean; biometryType: string | null }> {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      return { available, biometryType: biometryType ?? null };
    } catch {
      return { available: false, biometryType: null };
    }
  },

  /** Whether the user has opted in to biometric lock */
  async isEnabled(): Promise<boolean> {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    return val === 'true';
  },

  /** Enable or disable biometric lock */
  async setEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  },

  /** Prompt Face ID / Touch ID. Returns true if authenticated. */
  async authenticate(reason = 'Authenticate to access Sarkar'): Promise<boolean> {
    try {
      const { success } = await rnBiometrics.simplePrompt({ promptMessage: reason });
      return success;
    } catch {
      return false;
    }
  },
};
