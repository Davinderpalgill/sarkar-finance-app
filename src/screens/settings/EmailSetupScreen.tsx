import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DashboardStackParamList } from '../../navigation/types/navigation';
import { useUiStore } from '../../store/uiStore';
import {
  getConnectedGmailAccounts,
  signInWithGmail,
  signOutFromGmailAccount,
  importGmailTransactions,
  getLastSyncForAccount,
} from '../../services/GmailService';
import { EmailImportResult } from '../../ml/EmailParser';
import { formatDate } from '../../utils/dateUtils';

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, 'EmailSetup'>;
};

type AccountStatus = 'idle' | 'importing' | 'done' | 'error';

interface AccountState {
  email: string;
  status: AccountStatus;
  lastSync: number | null;
  result: EmailImportResult | null;
  error: string;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function EmailSetupScreen({ navigation }: Props) {
  const { userId } = useUiStore();
  const [accounts, setAccounts] = useState<AccountState[]>([]);
  const [addingAccount, setAddingAccount] = useState(false);

  const now = new Date();
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const isCurrentMonth =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedYear(y => y - 1); setSelectedMonth(11); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    const next = new Date(selectedYear, selectedMonth + 1, 1);
    if (next > now) return;
    if (selectedMonth === 11) { setSelectedYear(y => y + 1); setSelectedMonth(0); }
    else setSelectedMonth(m => m + 1);
  };

  const monthLabel = `${MONTHS[selectedMonth]} ${selectedYear}`;

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const emails = await getConnectedGmailAccounts();
    const states: AccountState[] = await Promise.all(
      emails.map(async email => ({
        email,
        status: 'idle' as AccountStatus,
        lastSync: await getLastSyncForAccount(email),
        result: null,
        error: '',
      }))
    );
    setAccounts(states);
  };

  const updateAccount = (email: string, patch: Partial<AccountState>) => {
    setAccounts(prev => prev.map(a => a.email === email ? { ...a, ...patch } : a));
  };

  const handleAddAccount = async () => {
    setAddingAccount(true);
    try {
      const email = await signInWithGmail();
      setAccounts(prev => {
        if (prev.find(a => a.email === email)) return prev;
        return [...prev, { email, status: 'idle', lastSync: null, result: null, error: '' }];
      });
    } catch (err: any) {
      Alert.alert('Sign-in failed', err?.message ?? 'Please try again.');
    } finally {
      setAddingAccount(false);
    }
  };

  const handleImport = async (email: string) => {
    if (!userId) {
      Alert.alert('Error', 'User session not found. Please restart the app.');
      return;
    }
    const fromMs = new Date(selectedYear, selectedMonth, 1).getTime();
    const toMs   = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();
    updateAccount(email, { status: 'importing', result: null, error: '' });
    try {
      const result = await importGmailTransactions(userId, email, fromMs, toMs);
      updateAccount(email, { status: 'done', result, lastSync: Date.now() });
    } catch (err: any) {
      updateAccount(email, { status: 'error', error: err?.message ?? 'Import failed.' });
    }
  };

  const handleDisconnect = (email: string) => {
    Alert.alert(
      'Disconnect Account',
      `Remove ${email}? No transaction data will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await signOutFromGmailAccount(email);
            setAccounts(prev => prev.filter(a => a.email !== email));
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Gmail Import</Text>
        <Text style={styles.subheading}>
          Connect one or more Gmail accounts. Each account is synced and kept separate.
        </Text>

        {/* Month picker */}
        <View style={styles.monthCard}>
          <Text style={styles.monthCardLabel}>Select month to import</Text>
          <View style={styles.monthRow}>
            <TouchableOpacity style={styles.monthArrow} onPress={prevMonth}>
              <Text style={styles.monthArrowText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity
              style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
              onPress={nextMonth}
              disabled={isCurrentMonth}
            >
              <Text style={[styles.monthArrowText, isCurrentMonth && styles.monthArrowTextDisabled]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Connected accounts */}
        {accounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connected Accounts</Text>
            {accounts.map(acct => (
              <AccountCard
                key={acct.email}
                acct={acct}
                monthLabel={monthLabel}
                onImport={() => handleImport(acct.email)}
                onDisconnect={() => handleDisconnect(acct.email)}
                onRetry={() => updateAccount(acct.email, { status: 'idle', error: '' })}
              />
            ))}
          </View>
        )}

        {/* Add / Sign-in button */}
        <TouchableOpacity
          style={[styles.addBtn, addingAccount && styles.addBtnDisabled]}
          onPress={handleAddAccount}
          disabled={addingAccount}
        >
          {addingAccount ? (
            <ActivityIndicator color="#1F2937" />
          ) : (
            <Text style={styles.addBtnText}>
              {accounts.length === 0 ? 'Sign in with Google' : '+ Add Another Account'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <InfoRow icon="📧" label="Scope"   value="Gmail readonly" />
          <InfoRow icon="🏦" label="Sources" value="HDFC, SBI, ICICI, Axis, Kotak + more" />
          <InfoRow icon="🔒" label="Privacy" value="Emails processed on-device" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccountCard({
  acct, monthLabel, onImport, onDisconnect, onRetry,
}: {
  acct: AccountState;
  monthLabel: string;
  onImport: () => void;
  onDisconnect: () => void;
  onRetry: () => void;
}) {
  return (
    <View style={styles.accountCard}>
      <View style={styles.accountHeader}>
        <View style={styles.accountHeaderLeft}>
          <View style={styles.dot} />
          <Text style={styles.accountEmail} numberOfLines={1}>{acct.email}</Text>
        </View>
        <TouchableOpacity onPress={onDisconnect}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {acct.lastSync && (
        <Text style={styles.lastSyncText}>
          Last synced: {formatDate(acct.lastSync, 'dd MMM yyyy, hh:mm a')}
        </Text>
      )}

      {acct.status === 'idle' && (
        <TouchableOpacity style={styles.importBtn} onPress={onImport}>
          <Text style={styles.importBtnText}>Import {monthLabel}</Text>
        </TouchableOpacity>
      )}

      {acct.status === 'importing' && (
        <View style={styles.statusRow}>
          <ActivityIndicator color="#8257E6" size="small" />
          <Text style={styles.statusText}>Scanning {monthLabel}...</Text>
        </View>
      )}

      {acct.status === 'done' && acct.result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Import complete</Text>
          <View style={styles.resultGrid}>
            <ResultPill label="Imported"   value={acct.result.imported}   color="#00C896" />
            <ResultPill label="Duplicates" value={acct.result.duplicates} color="#6B6B6B" />
            <ResultPill label="Skipped"    value={acct.result.skipped}    color="#6B6B6B" />
            {acct.result.failed > 0 && (
              <ResultPill label="Failed" value={acct.result.failed} color="#FF4757" />
            )}
          </View>
          {acct.result.pendingCategoryConfirm.length > 0 && (
            <Text style={styles.categoryNote}>
              {acct.result.pendingCategoryConfirm.length} transaction(s) need a category.
            </Text>
          )}
          <TouchableOpacity style={styles.importBtn} onPress={onImport}>
            <Text style={styles.importBtnText}>Import Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {acct.status === 'error' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{acct.error}</Text>
          <TouchableOpacity style={styles.importBtn} onPress={onRetry}>
            <Text style={styles.importBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ResultPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.resultPill}>
      <Text style={[styles.resultPillValue, { color }]}>{value}</Text>
      <Text style={styles.resultPillLabel}>{label}</Text>
    </View>
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

const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: '#0D0D0D' },
  content:                { padding: 20, gap: 20, paddingBottom: 40 },
  heading:                { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  subheading:             { fontSize: 14, color: '#ABABAB', lineHeight: 20 },
  monthCard:              { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, gap: 10, alignItems: 'center' },
  monthCardLabel:         { fontSize: 13, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 },
  monthRow:               { flexDirection: 'row', alignItems: 'center', gap: 20 },
  monthArrow:             { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#2C2C2C' },
  monthArrowDisabled:     { backgroundColor: '#1A1A1A' },
  monthArrowText:         { color: '#FFFFFF', fontSize: 24, fontWeight: '700', lineHeight: 28 },
  monthArrowTextDisabled: { color: '#2C2C2C' },
  monthLabel:             { fontSize: 18, fontWeight: '700', color: '#FFFFFF', minWidth: 110, textAlign: 'center' },
  section:                { gap: 12 },
  sectionTitle:           { fontSize: 13, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 },
  accountCard:            { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, gap: 12 },
  accountHeader:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountHeaderLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 12 },
  dot:                    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80', flexShrink: 0 },
  accountEmail:           { fontSize: 14, color: '#FFFFFF', fontWeight: '600', flex: 1 },
  disconnectText:         { fontSize: 13, color: '#FF4757' },
  lastSyncText:           { fontSize: 12, color: '#4B4B4B' },
  importBtn:              { backgroundColor: '#8257E6', padding: 13, borderRadius: 10, alignItems: 'center' },
  importBtnText:          { color: '#FFF', fontSize: 14, fontWeight: '700' },
  statusRow:              { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText:             { fontSize: 13, color: '#ABABAB' },
  resultBox:              { gap: 10 },
  resultTitle:            { fontSize: 14, fontWeight: '700', color: '#4ADE80' },
  resultGrid:             { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  resultPill:             { backgroundColor: '#2C2C2C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  resultPillValue:        { fontSize: 16, fontWeight: '700' },
  resultPillLabel:        { fontSize: 10, color: '#6B6B6B', marginTop: 2 },
  categoryNote:           { fontSize: 12, color: '#FBBF24' },
  errorBox:               { gap: 8 },
  errorText:              { fontSize: 13, color: '#FCA5A5', lineHeight: 18 },
  addBtn:                 { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  addBtnDisabled:         { backgroundColor: '#2C2C2C' },
  addBtnText:             { color: '#1F2937', fontSize: 15, fontWeight: '700' },
  infoCard:               { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 4 },
  infoRow:                { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#2C2C2C' },
  infoIcon:               { fontSize: 18, width: 28 },
  infoLabel:              { fontSize: 13, color: '#6B6B6B', flex: 1 },
  infoValue:              { fontSize: 13, color: '#ABABAB', textAlign: 'right', flex: 2 },
});
