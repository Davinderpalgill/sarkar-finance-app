import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTransactionStore } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { useLedgerStore } from '../../store/ledgerStore';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDate } from '../../utils/dateUtils';
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'NetWorth'>;
};

export default function NetWorthScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getLatestBalancePerAccount } = useTransactionStore();
  const { lentEntries, borrowedEntries, loadLedger } = useLedgerStore();
  const [refreshing, setRefreshing] = useState(false);
  const [balances, setBalances] = useState<Array<{ bankName: string; accountLast4: string | null; availableBalance: number; lastDate: number }>>([]);

  const load = useCallback(async () => {
    const [bals] = await Promise.all([
      getLatestBalancePerAccount(userId),
      loadLedger(userId),
    ]);
    setBalances(bals);
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const totalBankBalance = balances.reduce((s, b) => s + b.availableBalance, 0);

  const openLent = lentEntries.filter(e => e.status !== 'settled');
  const openBorrowed = borrowedEntries.filter(e => e.status !== 'settled');
  const totalLent = openLent.reduce((s, e) => s + (e.principalAmount - e.settledAmount), 0);
  const totalBorrowed = openBorrowed.reduce((s, e) => s + (e.principalAmount - e.settledAmount), 0);

  const netWorth = totalBankBalance + totalLent - totalBorrowed;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Net Worth</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Net Worth hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Estimated Net Worth</Text>
          <Text style={[styles.heroAmount, { color: netWorth >= 0 ? '#00C896' : '#FF4757' }]}>
            {formatCurrency(netWorth)}
          </Text>
          <Text style={styles.heroSub}>Bank balances + Lent − Borrowed</Text>
        </View>

        {/* Breakdown */}
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownCard}>
            <MaterialIcons name="account-balance" size={20} color="#00C896" />
            <Text style={styles.breakdownLabel}>Bank Balance</Text>
            <Text style={[styles.breakdownAmount, { color: '#00C896' }]}>{formatCurrency(totalBankBalance)}</Text>
          </View>
          <View style={styles.breakdownCard}>
            <MaterialIcons name="call-made" size={20} color="#8257E6" />
            <Text style={styles.breakdownLabel}>You Lent</Text>
            <Text style={[styles.breakdownAmount, { color: '#8257E6' }]}>+{formatCurrency(totalLent)}</Text>
          </View>
          <View style={styles.breakdownCard}>
            <MaterialIcons name="call-received" size={20} color="#FF4757" />
            <Text style={styles.breakdownLabel}>You Borrowed</Text>
            <Text style={[styles.breakdownAmount, { color: '#FF4757' }]}>-{formatCurrency(totalBorrowed)}</Text>
          </View>
        </View>

        {/* Bank accounts */}
        {balances.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Accounts</Text>
            {balances.map((b, i) => (
              <View key={i} style={styles.accountCard}>
                <View style={styles.accountLeft}>
                  <MaterialIcons name="account-balance" size={20} color="#00C896" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.accountName}>
                      {b.bankName}{b.accountLast4 ? ` ••${b.accountLast4}` : ''}
                    </Text>
                    <Text style={styles.accountDate}>Last: {formatDate(b.lastDate)}</Text>
                  </View>
                </View>
                <Text style={styles.accountBalance}>{formatCurrency(b.availableBalance)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Open lent entries */}
        {openLent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Outstanding Lent</Text>
            {openLent.map(e => (
              <View key={e.id} style={styles.ledgerCard}>
                <View style={[styles.ledgerBadge, { backgroundColor: '#8257E622' }]}>
                  <MaterialIcons name="call-made" size={14} color="#8257E6" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.ledgerPerson}>{e.personName}</Text>
                  <Text style={styles.ledgerDesc}>{e.description}</Text>
                </View>
                <Text style={[styles.ledgerAmount, { color: '#8257E6' }]}>
                  {formatCurrency(e.principalAmount - e.settledAmount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Open borrowed entries */}
        {openBorrowed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Outstanding Borrowed</Text>
            {openBorrowed.map(e => (
              <View key={e.id} style={styles.ledgerCard}>
                <View style={[styles.ledgerBadge, { backgroundColor: '#FF475722' }]}>
                  <MaterialIcons name="call-received" size={14} color="#FF4757" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.ledgerPerson}>{e.personName}</Text>
                  <Text style={styles.ledgerDesc}>{e.description}</Text>
                </View>
                <Text style={[styles.ledgerAmount, { color: '#FF4757' }]}>
                  -{formatCurrency(e.principalAmount - e.settledAmount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {balances.length === 0 && openLent.length === 0 && openBorrowed.length === 0 && (
          <Text style={styles.empty}>No balance data available. Transaction data with account balance is needed.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0D0D0D' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 },
  headerTitle:     { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  heroCard:        { marginHorizontal: 20, backgroundColor: '#1A1A1A', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  heroLabel:       { fontSize: 12, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  heroAmount:      { fontSize: 36, fontWeight: '700', marginBottom: 4 },
  heroSub:         { fontSize: 11, color: '#4B4B4B' },
  breakdownRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 20 },
  breakdownCard:   { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  breakdownLabel:  { fontSize: 10, color: '#6B6B6B', textAlign: 'center' },
  breakdownAmount: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  section:         { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle:    { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  accountCard:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, marginBottom: 8 },
  accountLeft:     { flexDirection: 'row', alignItems: 'center' },
  accountName:     { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  accountDate:     { fontSize: 11, color: '#4B4B4B', marginTop: 2 },
  accountBalance:  { fontSize: 16, fontWeight: '700', color: '#00C896' },
  ledgerCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12, marginBottom: 8 },
  ledgerBadge:     { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ledgerPerson:    { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  ledgerDesc:      { fontSize: 11, color: '#6B6B6B', marginTop: 2 },
  ledgerAmount:    { fontSize: 14, fontWeight: '700' },
  empty:           { color: '#4B4B4B', textAlign: 'center', paddingTop: 60, fontSize: 14, paddingHorizontal: 40 },
});
