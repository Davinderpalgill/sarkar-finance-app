import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types/navigation';
import { useUiStore } from '../store/uiStore';
import { onAuthStateChanged } from '../api/firebase/auth';
import { getDatabase } from '../storage/database';
import { TransactionRepository } from '../storage/repositories/TransactionRepository';
import { BiometricService } from '../services/BiometricService';

import OnboardingStackNavigator from './stacks/OnboardingStack';
import BottomTabNavigator       from './BottomTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isOnboarded, setUserId, setOnboarded } = useUiStore();
  const [authChecked, setAuthChecked] = useState(false);
  const [locked,      setLocked]      = useState(false);
  const [bioError,    setBioError]    = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (user) => {
      if (user) {
        setUserId(user.uid);
        await getDatabase();
        await TransactionRepository.migrateUserId(user.uid);
        if (!isOnboarded) setOnboarded(true);

        // If biometrics is enabled, lock the app until authenticated
        const enabled = await BiometricService.isEnabled();
        if (enabled) {
          setLocked(true);
          const ok = await BiometricService.authenticate();
          if (ok) {
            setLocked(false);
          } else {
            setBioError(true);
          }
        }
      }
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  const retryBiometrics = async () => {
    setBioError(false);
    const ok = await BiometricService.authenticate();
    if (ok) setLocked(false);
    else setBioError(true);
  };

  // Splash / auth check loading
  if (!authChecked) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8257E6" />
      </View>
    );
  }

  // Biometric lock screen
  if (isOnboarded && locked) {
    return (
      <View style={styles.lockScreen}>
        <View style={styles.lockLogoWrap}>
          <Text style={styles.lockLogoText}>₹</Text>
        </View>
        <Text style={styles.lockAppName}>Sarkar</Text>
        <Text style={styles.lockSubtitle}>Your account is locked</Text>

        <TouchableOpacity style={styles.lockBtn} onPress={retryBiometrics} activeOpacity={0.85}>
          <Text style={styles.lockBtnIcon}>🔒</Text>
          <Text style={styles.lockBtnText}>
            {bioError ? 'Try Face ID Again' : 'Unlock with Face ID'}
          </Text>
        </TouchableOpacity>

        {bioError && (
          <Text style={styles.lockError}>
            Face ID failed. Tap the button to try again.
          </Text>
        )}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isOnboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingStackNavigator} />
        ) : (
          <Stack.Screen name="Main" component={BottomTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, backgroundColor: '#0D0D0D',
    justifyContent: 'center', alignItems: 'center',
  },
  lockScreen: {
    flex: 1, backgroundColor: '#0D0D0D',
    justifyContent: 'center', alignItems: 'center', padding: 40,
  },
  lockLogoWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#8257E6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  lockLogoText:  { fontSize: 38, color: '#FFFFFF', fontWeight: '700' },
  lockAppName:   { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  lockSubtitle:  { fontSize: 15, color: '#6B6B6B', marginBottom: 48 },
  lockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C',
    paddingVertical: 18, paddingHorizontal: 32, borderRadius: 16,
  },
  lockBtnIcon:  { fontSize: 22 },
  lockBtnText:  { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  lockError:    { marginTop: 20, fontSize: 13, color: '#FF4757', textAlign: 'center' },
});
