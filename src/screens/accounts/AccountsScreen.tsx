import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTransactionStore, AccountSummary } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { formatCurrency } from '../../utils/currencyUtils';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CHART_HEIGHT = 120;

type MonthPoint = { month: string; totalCredit: number; totalDebit: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

function accountLabel(a: AccountSummary): string {
  return a.accountLast4 ? `${a.bankName} ••${a.accountLast4}` : a.bankName;
}

function accountKey(a: AccountSummary): string {
  return `${a.bankName}|${a.accountLast4 ?? ''}`;
}

function build6MonthKeys(year: number, month: number): string[] {
  const keys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

// ── Chart ─────────────────────────────────────────────────────────────────────

function MiniChart({ data }: { data: MonthPoint[] }) {
  const { width } = useWindowDimensions();
  const chartWidth = width - 40;
  const slotWidth  = chartWidth / Math.max(data.length, 1);
  const barWidth   = Math.max(Math.floor((slotWidth - 10) / 2), 4);
  const maxVal     = Math.max(...data.flatMap(d => [d.totalCredit, d.totalDebit]), 1);

  const abbr = (yyyyMM: string) => MONTHS[parseInt(yyyyMM.split('-')[1], 10) - 1];

  return (
    <View style={{ backgroundColor: '#1A1A1A', borderRadius: 14, padding: 12 }}>
      <View style={{ height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end' }}>
        {data.map(d => {
          const creditH = Math.round((d.totalCredit / maxVal) * CHART_HEIGHT);
          const debitH  = Math.round((d.totalDebit  / maxVal) * CHART_HEIGHT);
          return (
            <View key={d.month} style={{ width: slotWidth, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 3 }}>
              <View style={{ width: barWidth, height: Math.max(creditH, 2), backgroundColor: '#00C896', borderRadius: 3 }} />
              <View style={{ width: barWidth, height: Math.max(debitH,  2), backgroundColor: '#FF4757', borderRadius: 3 }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {data.map(d => (
          <Text key={d.month} style={{ width: slotWidth, textAlign: 'center', fontSize: 10, color: '#6B6B6B' }}>
            {abbr(d.month)}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AccountsScreen() {
  const userId = useUiStore(s => s.userId)!;
  const { getAccounts, getMonthlyTrend } = useTransactionStore();

  const [accounts,         setAccounts]         = useState<AccountSummary[]>([]);
  const [selectedAccount,  setSelectedAccount]  = useState<AccountSummary | null>(null);
  const [trendData,        setTrendData]        = useState<MonthPoint[]>([]);
  const [refreshing,       setRefreshing]       = useState(false);

  const now = new Date();

  const load = useCallback(async (acct: AccountSummary | null) => {
    const accts = await getAccounts(userId);
    setAccounts(accts);

    const trendFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1).getTime();
    const trendTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const keys      = build6MonthKeys(now.getFullYear(), now.getMonth());
    const raw       = await getMonthlyTrend(
      userId, trendFrom, trendTo,
      acct ? { bankName: acct.bankName, accountLast4: acct.accountLast4 } : null,
    );
    const dataMap = new Map(raw.map(d => [d.month, d]));
    setTrendData(keys.map(k => dataMap.get(k) ?? { month: k, totalCredit: 0, totalDebit: 0 }));
  }, [userId]);

  useFocusEffect(useCallback(() => {
    load(selectedAccount);
  }, [selectedAccount]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load(selectedAccount);
    setRefreshing(false);
  };

  const selectAccount = (acct: AccountSummary | null) => {
    setSelectedAccount(acct);
  };

  // Overall totals across all accounts
  const grandCredit = accounts.reduce((s, a) => s + a.totalCredit, 0);
  const grandDebit  = accounts.reduce((s, a) => s + a.totalDebit,  0);
  const hasTrend    = trendData.some(d => d.totalCredit > 0 || d.totalDebit > 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Accounts</Text>
        </View>

        {accounts.length === 0 ? (
          <Text style={styles.empty}>No accounts found. Import some transactions first.</Text>
        ) : (
          <>
            {/* Overall summary */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Income</Text>
                <Text style={[styles.summaryAmount, styles.creditColor]}>{formatCurrency(grandCredit)}</Text>
                <Text style={styles.summaryMeta}>All accounts · All time</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Spent</Text>
                <Text style={[styles.summaryAmount, styles.debitColor]}>{formatCurrency(grandDebit)}</Text>
                <Text style={styles.summaryMeta}>All accounts · All time</Text>
              </View>
            </View>

            {/* Account cards */}
            <Text style={styles.sectionTitle}>Accounts</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll} contentContainerStyle={styles.accountScrollContent}>
              {accounts.map(acct => {
                const isSelected = selectedAccount ? accountKey(selectedAccount) === accountKey(acct) : false;
                const savings = acct.totalCredit - acct.totalDebit;
                return (
                  <TouchableOpacity
                    key={accountKey(acct)}
                    style={[styles.accountCard, isSelected && styles.accountCardSelected]}
                    onPress={() => selectAccount(isSelected ? null : acct)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.accountCardHeader}>
                      <Text style={styles.accountBankName}>{acct.bankName}</Text>
                      {acct.accountLast4 ? (
                        <Text style={styles.accountLast4}>••{acct.accountLast4}</Text>
                      ) : null}
                    </View>
                    <View style={styles.accountAmountRow}>
                      <Text style={[styles.accountAmount, styles.creditColor]}>↓ {formatCurrency(acct.totalCredit)}</Text>
                    </View>
                    <View style={styles.accountAmountRow}>
                      <Text style={[styles.accountAmount, styles.debitColor]}>↑ {formatCurrency(acct.totalDebit)}</Text>
                    </View>
                    <View style={styles.accountDivider} />
                    <Text style={[styles.accountSavings, savings >= 0 ? styles.creditColor : styles.debitColor]}>
                      {savings >= 0 ? '+' : ''}{formatCurrency(savings)}
                    </Text>
                    <Text style={styles.accountMeta}>{acct.transactionCount} transactions</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 6-Month chart */}
            {hasTrend && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  6-Month Trend{selectedAccount ? ` · ${accountLabel(selectedAccount)}` : ' · All Accounts'}
                </Text>

                {/* Account filter chips for chart */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.chip, !selectedAccount && styles.chipActive]}
                      onPress={() => selectAccount(null)}
                    >
                      <Text style={[styles.chipText, !selectedAccount && styles.chipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {accounts.map(acct => {
                      const active = selectedAccount ? accountKey(selectedAccount) === accountKey(acct) : false;
                      return (
                        <TouchableOpacity
                          key={accountKey(acct)}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => selectAccount(acct)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {accountLabel(acct)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <MiniChart data={trendData} />

                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#00C896' }]} />
                    <Text style={styles.legendText}>Income</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF4757' }]} />
                    <Text style={styles.legendText}>Spending</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#0D0D0D' },
  header:               { padding: 20, paddingBottom: 8 },
  headerTitle:          { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  empty:                { color: '#4B4B4B', textAlign: 'center', paddingTop: 80, fontSize: 15, paddingHorizontal: 40 },
  summaryRow:           { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  summaryCard:          { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14 },
  summaryLabel:         { fontSize: 11, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryAmount:        { fontSize: 18, fontWeight: '700' },
  summaryMeta:          { fontSize: 10, color: '#4B4B4B', marginTop: 3 },
  creditColor:          { color: '#00C896' },
  debitColor:           { color: '#FF4757' },
  sectionTitle:         { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 12, paddingHorizontal: 20 },
  section:              { paddingHorizontal: 20, marginBottom: 24 },
  accountScroll:        { marginBottom: 24 },
  accountScrollContent: { paddingHorizontal: 20, gap: 12 },
  accountCard:          { width: 160, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 14, borderWidth: 2, borderColor: 'transparent' },
  accountCardSelected:  { borderColor: '#8257E6' },
  accountCardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  accountBankName:      { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  accountLast4:         { fontSize: 12, color: '#6B6B6B' },
  accountAmountRow:     { marginBottom: 2 },
  accountAmount:        { fontSize: 13, fontWeight: '600' },
  accountDivider:       { height: 1, backgroundColor: '#2C2C2C', marginVertical: 8 },
  accountSavings:       { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  accountMeta:          { fontSize: 11, color: '#4B4B4B' },
  chipRow:              { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  chip:                 { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#2C2C2C' },
  chipActive:           { backgroundColor: '#8257E6', borderColor: '#8257E6' },
  chipText:             { color: '#ABABAB', fontSize: 13 },
  chipTextActive:       { color: '#FFF' },
  legend:               { flexDirection: 'row', gap: 16, marginTop: 10 },
  legendItem:           { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:            { width: 8, height: 8, borderRadius: 4 },
  legendText:           { fontSize: 12, color: '#ABABAB' },
});
