import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Alert, ScrollView, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DashboardStackParamList } from '../../navigation/types/navigation';
import {
  initiateAAConsent,
  fetchAAData,
  getStoredConsentId,
  clearStoredConsentId,
  isAAConfigured,
} from '../../services/AAService';
import { useUiStore } from '../../store/uiStore';
import { AAImportResult } from '../../ml/AADataParser';

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, 'AASetup'>;
};

type Step = 'idle' | 'requesting_consent' | 'waiting_approval' | 'fetching_data' | 'done' | 'error';

export default function AASetupScreen({ navigation }: Props) {
  const { userId } = useUiStore();
  const [step, setStep]       = useState<Step>('idle');
  const [result, setResult]   = useState<AAImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle deep-link callback from AA portal
  useEffect(() => {
    const sub = Linking.addEventListener('url', handleDeepLink);
    // Check if app was opened via deep link while not running
    Linking.getInitialURL().then(url => { if (url) handleDeepLink({ url }); });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeepLink = useCallback(async ({ url }: { url: string }) => {
    if (!url.startsWith('financeapp://aa-callback')) return;

    const params = new URL(url.replace('financeapp://', 'https://dummy/')).searchParams;
    const status = params.get('status');

    if (status === 'REJECTED') {
      setStep('error');
      setErrorMsg('Consent was rejected. You can try again.');
      return;
    }

    // Consent approved — fetch FI data
    setStep('fetching_data');
    try {
      const consentId = await getStoredConsentId();
      if (!consentId || !userId) throw new Error('Missing consent ID or user ID.');
      const importResult = await fetchAAData(consentId, userId);
      await clearStoredConsentId();
      setResult(importResult);
      setStep('done');
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err?.message ?? 'Failed to fetch bank data.');
    }
  }, [userId]);

  const handleConnect = async () => {
    if (!userId) {
      Alert.alert('Error', 'User session not found. Please restart the app.');
      return;
    }
    setStep('requesting_consent');
    try {
      await initiateAAConsent(userId);
      setStep('waiting_approval');
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err?.message ?? 'Failed to create consent request.');
    }
  };

  const handleRetry = () => {
    setStep('idle');
    setErrorMsg('');
    setResult(null);
  };

  if (!isAAConfigured()) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
          <Text style={styles.heading}>Coming Soon</Text>
          <Text style={styles.subheading}>
            Bank account linking via Account Aggregator will be available in a future update.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Account Aggregator</Text>
        <Text style={styles.subheading}>
          Link your bank accounts securely via RBI-mandated Account Aggregator framework.
          Your credentials are never shared with this app.
        </Text>

        <View style={styles.card}>
          <InfoRow icon="🏦" label="Supported" value="All AA-enabled Indian banks" />
          <InfoRow icon="🔒" label="Standard"  value="RBI-regulated, end-to-end encrypted" />
          <InfoRow icon="📊" label="Data"       value="Last 90 days of transactions" />
          <InfoRow icon="⏱"  label="Refresh"   value="On-demand (manual import)" />
        </View>

        {step === 'idle' && (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleConnect}>
            <Text style={styles.primaryBtnText}>Link Bank Account</Text>
          </TouchableOpacity>
        )}

        {(step === 'requesting_consent' || step === 'fetching_data') && (
          <View style={styles.statusRow}>
            <ActivityIndicator color="#8257E6" />
            <Text style={styles.statusText}>
              {step === 'requesting_consent' ? 'Creating consent request...' : 'Fetching transactions...'}
            </Text>
          </View>
        )}

        {step === 'waiting_approval' && (
          <View style={styles.waitCard}>
            <Text style={styles.waitTitle}>Action required in browser</Text>
            <Text style={styles.waitBody}>
              Approve the data sharing consent in the browser window that just opened.
              Return here automatically once approved.
            </Text>
          </View>
        )}

        {step === 'done' && result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Import Complete</Text>
            <ResultRow label="Imported"   value={result.imported} />
            <ResultRow label="Duplicates" value={result.duplicates} />
            <ResultRow label="Failed"     value={result.failed} />
            {result.pendingCategoryConfirm.length > 0 && (
              <Text style={styles.categoryNote}>
                {result.pendingCategoryConfirm.length} transaction(s) need a category — check Transactions tab.
              </Text>
            )}
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'error' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorBody}>{errorMsg}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry}>
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ResultRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0D0D0D' },
  content:         { padding: 20, gap: 20 },
  heading:         { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  subheading:      { fontSize: 14, color: '#ABABAB', lineHeight: 20 },
  card:            { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 4 },
  infoRow:         { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#2C2C2C' },
  infoIcon:        { fontSize: 18, width: 28 },
  infoLabel:       { fontSize: 13, color: '#6B6B6B', flex: 1 },
  infoValue:       { fontSize: 13, color: '#ABABAB', textAlign: 'right', flex: 2 },
  primaryBtn:      { backgroundColor: '#8257E6', padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn:    { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#8257E6', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  secondaryBtnText:{ color: '#8257E6', fontSize: 15, fontWeight: '600' },
  statusRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#1A1A1A', borderRadius: 12 },
  statusText:      { fontSize: 14, color: '#ABABAB' },
  waitCard:        { backgroundColor: '#1E3A5F', borderRadius: 14, padding: 20, gap: 8 },
  waitTitle:       { fontSize: 16, fontWeight: '700', color: '#93C5FD' },
  waitBody:        { fontSize: 13, color: '#BFDBFE', lineHeight: 20 },
  resultCard:      { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 20, gap: 12 },
  resultTitle:     { fontSize: 18, fontWeight: '700', color: '#4ADE80' },
  resultRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  resultLabel:     { fontSize: 14, color: '#ABABAB' },
  resultValue:     { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  categoryNote:    { fontSize: 12, color: '#FBBF24', marginTop: 4 },
  errorCard:       { backgroundColor: '#3D0A0A', borderRadius: 14, padding: 20, gap: 12 },
  errorTitle:      { fontSize: 16, fontWeight: '700', color: '#FF4757' },
  errorBody:       { fontSize: 13, color: '#FCA5A5', lineHeight: 18 },
});
