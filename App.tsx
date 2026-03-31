import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BackgroundFetch from 'react-native-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';

import AppNavigator from './src/navigation/AppNavigator';
import { TourProvider } from './src/tour/TourContext';
import TourOverlay from './src/tour/TourOverlay';
import { useEmiStore } from './src/store/emiStore';
import { useUiStore } from './src/store/uiStore';
import { scheduleEmiReminder } from './src/services/ReminderService';
import { createNotificationChannels } from './src/services/NotificationService';
import { configureGmail, runGmailSync, STORAGE_GMAIL_LAST_SYNC } from './src/services/GmailService';
import { importHistoricalSms } from './src/services/SmsService';
import { CONSTANTS } from './src/config/constants';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

// Initialise Google Sign-In scopes for Gmail import
configureGmail();

export default function App() {
  const userId = useUiStore(s => s.userId);
  const { getUpcomingDue } = useEmiStore();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Set up notifications once on mount
  useEffect(() => {
    createNotificationChannels();
    if (Platform.OS === 'ios') {
      notifee.requestPermission();
    }
  }, []);

  // On every app launch: run Gmail import (iOS) or SMS import (Android)
  useEffect(() => {
    if (!userId) return;
    if (Platform.OS === 'ios') {
      runGmailSync(userId);
    } else {
      importHistoricalSms(userId);
    }
  }, [userId]);

  useEffect(() => {
    configureBackgroundFetch();

    // Trigger Gmail sync when app comes to foreground after 30 minutes
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (userId) {
          const stored = await AsyncStorage.getItem(STORAGE_GMAIL_LAST_SYNC);
          const lastSync = stored ? parseInt(stored, 10) : 0;
          if (Date.now() - lastSync >= THIRTY_MINUTES_MS) {
            runGmailSync(userId);
          }
        }
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [userId]);

  const configureBackgroundFetch = () => {
    BackgroundFetch.configure(
      {
        minimumFetchInterval: CONSTANTS.BACKGROUND_FETCH_INTERVAL_MINUTES,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
      },
      async (taskId) => {
        if (userId) {
          // Check upcoming EMIs and schedule reminders
          const upcoming = await getUpcomingDue(userId, CONSTANTS.DEFAULT_EMI_REMINDER_DAYS + 1);
          for (const emi of upcoming) {
            await scheduleEmiReminder(emi);
          }
          // Gmail sync on background fetch
          await runGmailSync(userId);
        }
        BackgroundFetch.finish(taskId);
      },
      (taskId) => {
        BackgroundFetch.finish(taskId);
      }
    );
  };

  return (
    <SafeAreaProvider>
      <TourProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
          <AppNavigator />
          <TourOverlay />
        </GestureHandlerRootView>
      </TourProvider>
    </SafeAreaProvider>
  );
}
