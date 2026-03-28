import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, ActivityIndicator, useWindowDimensions,
  StatusBar, Platform,
} from 'react-native';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DashboardStackParamList } from '../../navigation/types/navigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTransactionStore } from '../../store/transactionStore';
import { useEmiStore } from '../../store/emiStore';
import { useLedgerStore } from '../../store/ledgerStore';
import { useUiStore } from '../../store/uiStore';
import { useSmsReader } from '../../hooks/useSmsReader';
import { runGmailSync } from '../../services/GmailService';
import CategoryPopup from '../../components/transactions/CategoryPopup';
import { formatCurrency, formatCurrencyCompact } from '../../utils/currencyUtils';
import { formatDate } from '../../utils/dateUtils';
import { DEFAULT_CATEGORIES } from '../../config/categories';
import { getCustomCategories } from '../../utils/customCategories';

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, 'DashboardHome'>;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const BASE_CAT_MAP = new Map(DEFAULT_CATEGORIES.map(c => [c.id, { name: c.name, color: c.color }]));

export default function DashboardScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { categoryPopupVisible, categoryPopupTransactionId, hideCategoryPopup } = useUiStore();
  const { transactions, loadTransactions, getSummary, getMonthlyTrend, getCategoryBreakdown, getTopMerchants, getLatestBalancePerAccount } = useTransactionStore();
  const { emis, loadEmis } = useEmiStore();
  const { lentEntries, borrowedEntries, loadLedger } = useLedgerStore();
  const { importing, importSms } = useSmsReader();

  const now = new Date();
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [summary,       setSummary]       = useState({ totalCredit: 0, totalDebit: 0, count: 0 });
  const [refreshing,    setRefreshing]    = useState(false);
  const [trendData,     setTrendData]     = useState<Array<{ month: string; totalCredit: number; totalDebit: number }>>([]);
  const [categoryData,  setCategoryData]  = useState<Array<{ categoryId: string; totalDebit: number; count: number }>>([]);
  const [topMerchants,  setTopMerchants]  = useState<Array<{ merchantName: string; count: number; total: number }>>([]);
  const [catMap,        setCatMap]        = useState<Map<string, { name: string; color: string }>>(BASE_CAT_MAP);
  const [bankBalances,  setBankBalances]  = useState<Array<{ bankName: string; accountLast4: string | null; availableBalance: number; lastDate: number }>>([]);

  const monthFrom = (y: number, m: number) => new Date(y, m, 1).getTime();
  const monthTo   = (y: number, m: number) => new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();

  const build6MonthKeys = (year: number, month: number): string[] => {
    const keys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return keys;
  };

  const load = useCallback(async (year: number, month: number) => {
    const from    = monthFrom(year, month);
    const to      = monthTo(year, month);
    const trendFrom = new Date(year, month - 5, 1).getTime();

    await Promise.all([
      loadTransactions(userId, { fromDate: from, toDate: to, limit: 20 }),
      loadEmis(userId),
      loadLedger(userId),
    ]);

    const [s, rawTrend, cats, merchants, bals] = await Promise.all([
      getSummary(userId, from, to),
      getMonthlyTrend(userId, trendFrom, to),
      getCategoryBreakdown(userId, from, to),
      getTopMerchants(userId, from, to, 3),
      getLatestBalancePerAccount(userId),
    ]);

    setBankBalances(bals);

    setSummary(s);
    setCategoryData(cats.filter(c => c.totalDebit > 0).slice(0, 5));
    setTopMerchants(merchants);

    const customs = await getCustomCategories();
    const merged = new Map(BASE_CAT_MAP);
    customs.forEach(c => merged.set(c.id, { name: c.name, color: c.color }));
    setCatMap(merged);

    const keys = build6MonthKeys(year, month);
    const dataMap = new Map(rawTrend.map(d => [d.month, d]));
    setTrendData(keys.map(k => dataMap.get(k) ?? { month: k, totalCredit: 0, totalDebit: 0 }));
  }, [userId]);

  useFocusEffect(useCallback(() => {
    load(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(selectedYear, selectedMonth), runGmailSync(userId)]);
    setRefreshing(false);
  };

  const prevMonth = () => {
    let y = selectedYear, m = selectedMonth;
    if (m === 0) { y -= 1; m = 11; } else { m -= 1; }
    setSelectedYear(y); setSelectedMonth(m);
  };

  const nextMonth = () => {
    const next = new Date(selectedYear, selectedMonth + 1, 1);
    if (next > now) return;
    let y = selectedYear, m = selectedMonth;
    if (m === 11) { y += 1; m = 0; } else { m += 1; }
    setSelectedYear(y); setSelectedMonth(m);
  };

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  const monthLabel     = `${MONTHS[selectedMonth]} ${selectedYear}`;
  const savings        = summary.totalCredit - summary.totalDebit;
  const savingsRate    = summary.totalCredit > 0 ? Math.round((savings / summary.totalCredit) * 100) : 0;

  const totalBankBalance = bankBalances.reduce((s, b) => s + b.availableBalance, 0);
  const totalLent        = lentEntries.reduce((s, e) => s + e.outstandingAmount, 0);
  const totalBorrowed    = borrowedEntries.reduce((s, e) => s + e.outstandingAmount, 0);
  const totalEmiOutstanding = emis
    .filter(e => e.status === 'active')
    .reduce((s, e) => s + (e.totalInstallments - e.paidInstallments) * e.emiAmount, 0);
  const totalLiabilities = totalBorrowed + totalEmiOutstanding;
  const netWorth         = totalBankBalance + totalLent - totalLiabilities;
  const upcomingEmis  = emis.filter(e => e.status === 'active').slice(0, 3);

  const totalCategorySpend = categoryData.reduce((s, c) => s + c.totalDebit, 0);

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.headerTitle}>Sarkar</Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <MaterialIcons name="settings" size={20} color="#ABABAB" />
          </TouchableOpacity>
        </View>

        {/* ── Month picker ── */}
        <View style={styles.monthRow}>
          <TouchableOpacity style={styles.monthArrow} onPress={prevMonth}>
            <Text style={styles.monthArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity
            style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
            onPress={nextMonth} disabled={isCurrentMonth}
          >
            <Text style={[styles.monthArrowText, isCurrentMonth && styles.monthArrowTextDisabled]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero balance card ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total Spent · {MONTHS[selectedMonth]}</Text>
          <Text style={styles.heroAmount}>{formatCurrency(summary.totalDebit)}</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Income</Text>
              <Text style={[styles.heroStatValue, styles.green]}>{formatCurrencyCompact(summary.totalCredit)}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Savings</Text>
              <Text style={[styles.heroStatValue, savings >= 0 ? styles.green : styles.red]}>
                {savings < 0 ? '-' : '+'}{formatCurrencyCompact(Math.abs(savings))}
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Saved</Text>
              <Text style={[styles.heroStatValue, savingsRate >= 20 ? styles.green : styles.amber]}>
                {savingsRate}%
              </Text>
            </View>
          </View>
        </View>

        {/* ── Assets & Liabilities ── */}
        <View style={styles.netWorthCard}>
          <View style={styles.netWorthHeader}>
            <Text style={styles.netWorthTitle}>Assets & Liabilities</Text>
            <Text style={[styles.netWorthAmount, { color: netWorth >= 0 ? '#00C896' : '#FF4757' }]}>
              {formatCurrencyCompact(netWorth)}
            </Text>
          </View>
          <View style={styles.netWorthRow}>
            <View style={styles.netWorthStat}>
              <Text style={styles.netWorthStatLabel}>Assets</Text>
              <Text style={[styles.netWorthStatValue, styles.green]}>{formatCurrencyCompact(totalBankBalance + totalLent)}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.netWorthStat}>
              <Text style={styles.netWorthStatLabel}>Liabilities</Text>
              <Text style={[styles.netWorthStatValue, styles.red]}>{formatCurrencyCompact(totalLiabilities)}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.netWorthStat}>
              <Text style={styles.netWorthStatLabel}>Net Worth</Text>
              <Text style={[styles.netWorthStatValue, { color: netWorth >= 0 ? '#00C896' : '#FF4757' }]}>{formatCurrencyCompact(netWorth)}</Text>
            </View>
          </View>
        </View>

        {/* ── Import buttons ── */}
        <View style={styles.importRow}>
          {Platform.OS === 'android' && (
            <TouchableOpacity style={styles.importBtn} onPress={importSms} disabled={importing}>
              {importing
                ? <ActivityIndicator color="#8257E6" size="small" />
                : <Text style={styles.importText}>📩  Import SMS</Text>
              }
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.importBtn} onPress={() => navigation.navigate('EmailSetup')}>
            <Text style={styles.importText}>✉️  Gmail</Text>
          </TouchableOpacity>
        </View>

        {/* ── Category Breakdown ── */}
        {categoryData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Where did it go?</Text>
            {categoryData.map(c => {
              const cat  = catMap.get(c.categoryId);
              const pct  = totalCategorySpend > 0 ? (c.totalDebit / totalCategorySpend) * 100 : 0;
              return (
                <TouchableOpacity
                  key={c.categoryId}
                  style={styles.catRow}
                  onPress={() => navigation.dispatch(
                    CommonActions.navigate('Transactions', {
                      screen: 'TransactionList',
                      params: {
                        categoryId: c.categoryId,
                        categoryName: cat?.name ?? 'Other',
                        fromDate: monthFrom(selectedYear, selectedMonth),
                        toDate: monthTo(selectedYear, selectedMonth),
                      },
                    })
                  )}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catDot, { backgroundColor: cat?.color ?? '#ABABAB' }]} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.catLabelRow}>
                      <Text style={styles.catName}>{cat?.name ?? c.categoryId ?? 'Other'}</Text>
                      <Text style={styles.catAmount}>{formatCurrencyCompact(c.totalDebit)}</Text>
                    </View>
                    <View style={styles.catBarBg}>
                      <View
                        style={[styles.catBarFill, {
                          width: `${Math.min(pct, 100)}%` as any,
                          backgroundColor: cat?.color ?? '#8257E6',
                        }]}
                      />
                    </View>
                    <Text style={styles.catPct}>{Math.round(pct)}% of spending</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={18} color="#6B6B6B" style={{ marginLeft: 6, alignSelf: 'center' }} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Top Merchants ── */}
        {topMerchants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Merchants</Text>
            <View style={styles.merchantGrid}>
              {topMerchants.map((m, i) => (
                <View key={m.merchantName} style={styles.merchantCard}>
                  <View style={styles.merchantRank}>
                    <Text style={styles.merchantRankText}>#{i + 1}</Text>
                  </View>
                  <Text style={styles.merchantName} numberOfLines={1}>{m.merchantName}</Text>
                  <Text style={styles.merchantAmount}>{formatCurrencyCompact(m.total)}</Text>
                  <Text style={styles.merchantCount}>{m.count} txns</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── 6-Month Trend ── */}
        {trendData.some(d => d.totalCredit > 0 || d.totalDebit > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6-Month Trend</Text>
            <MonthlyChart data={trendData} />
            <View style={styles.chartLegend}>
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

        {/* ── Ledger Summary ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ledger</Text>
          <View style={styles.cardRow}>
            <View style={[styles.card, styles.creditCard]}>
              <Text style={styles.cardLabel}>You lent</Text>
              <Text style={[styles.cardAmount, styles.green]}>{formatCurrency(totalLent)}</Text>
            </View>
            <View style={[styles.card, styles.debitCard]}>
              <Text style={styles.cardLabel}>You owe</Text>
              <Text style={[styles.cardAmount, styles.red]}>{formatCurrency(totalBorrowed)}</Text>
            </View>
          </View>
        </View>

        {/* ── Upcoming EMIs ── */}
        {upcomingEmis.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming EMIs</Text>
            {upcomingEmis.map(emi => (
              <View key={emi.id} style={styles.emiRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emiName}>{emi.name}</Text>
                  <Text style={styles.emiDue}>Due {formatDate(emi.nextDueDate)}</Text>
                </View>
                <Text style={styles.emiAmount}>{formatCurrency(emi.emiAmount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Recent Transactions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent · {MONTHS[selectedMonth]}</Text>
          {transactions.slice(0, 10).map(tx => (
            <View key={tx.id} style={styles.txRow}>
              <View style={[styles.txBadge, tx.type === 'credit' ? styles.txBadgeCredit : styles.txBadgeDebit]}>
                <Text style={styles.txBadgeText}>{tx.type === 'credit' ? '↓' : '↑'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txMerchant} numberOfLines={1}>
                  {tx.merchantName || tx.personName || tx.bankName}
                </Text>
                <Text style={styles.txDate}>{formatDate(tx.transactionDate)}</Text>
              </View>
              <Text style={[styles.txAmount, tx.type === 'credit' ? styles.green : styles.red]}>
                {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
              </Text>
            </View>
          ))}
          {transactions.length === 0 && (
            <Text style={styles.empty}>No transactions for {monthLabel}.</Text>
          )}
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      <CategoryPopup
        visible={categoryPopupVisible}
        transactionId={categoryPopupTransactionId}
        onDismiss={hideCategoryPopup}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTransaction')}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
const CHART_HEIGHT = 110;

function MonthlyChart({ data }: { data: Array<{ month: string; totalCredit: number; totalDebit: number }> }) {
  const { width } = useWindowDimensions();
  const chartWidth = width - 40;
  const slotWidth  = chartWidth / data.length;
  const barWidth   = Math.max(Math.floor((slotWidth - 10) / 2), 4);
  const maxVal     = Math.max(...data.flatMap(d => [d.totalCredit, d.totalDebit]), 1);
  const monthAbbr  = (s: string) => MONTHS[parseInt(s.split('-')[1], 10) - 1];

  return (
    <View style={{ backgroundColor: '#1A1A1A', borderRadius: 16, padding: 14 }}>
      <View style={{ height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end' }}>
        {data.map(d => {
          const cH = Math.round((d.totalCredit / maxVal) * CHART_HEIGHT);
          const dH = Math.round((d.totalDebit  / maxVal) * CHART_HEIGHT);
          return (
            <View key={d.month} style={{ width: slotWidth, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 3 }}>
              <View style={{ width: barWidth, height: Math.max(cH, 2), backgroundColor: '#00C896', borderRadius: 3 }} />
              <View style={{ width: barWidth, height: Math.max(dH, 2), backgroundColor: '#FF4757', borderRadius: 3 }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {data.map(d => (
          <Text key={d.month} style={{ width: slotWidth, textAlign: 'center', fontSize: 10, color: '#6B6B6B' }}>
            {monthAbbr(d.month)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: '#0D0D0D' },

  // Header
  header:                 { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  greeting:               { fontSize: 13, color: '#6B6B6B', fontWeight: '500' },
  headerTitle:            { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  settingsBtn:            { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A1A', borderRadius: 12 },

  // Month picker
  monthRow:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 20 },
  monthArrow:             { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#1A1A1A' },
  monthArrowDisabled:     { backgroundColor: '#0D0D0D' },
  monthArrowText:         { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  monthArrowTextDisabled: { color: '#2C2C2C' },
  monthLabel:             { fontSize: 16, fontWeight: '700', color: '#FFFFFF', minWidth: 100, textAlign: 'center' },

  // Hero card
  heroCard:               { marginHorizontal: 20, backgroundColor: '#1A1A1A', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  heroLabel:              { fontSize: 12, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  heroAmount:             { fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginBottom: 20 },
  heroRow:                { flexDirection: 'row', alignItems: 'center' },
  heroStat:               { flex: 1, alignItems: 'center' },
  heroStatLabel:          { fontSize: 11, color: '#6B6B6B', marginBottom: 4 },
  heroStatValue:          { fontSize: 16, fontWeight: '700' },
  heroDivider:            { width: 1, height: 32, backgroundColor: '#2C2C2C' },

  // Colors
  green:                  { color: '#00C896' },
  red:                    { color: '#FF4757' },
  amber:                  { color: '#FFA502' },

  // Net Worth card
  netWorthCard:           { marginHorizontal: 20, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  netWorthHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  netWorthTitle:          { fontSize: 13, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 },
  netWorthAmount:         { fontSize: 20, fontWeight: '800' },
  netWorthRow:            { flexDirection: 'row', alignItems: 'center' },
  netWorthStat:           { flex: 1, alignItems: 'center' },
  netWorthStatLabel:      { fontSize: 10, color: '#6B6B6B', marginBottom: 4 },
  netWorthStatValue:      { fontSize: 14, fontWeight: '700' },

  // Import row
  importRow:              { flexDirection: 'row', marginHorizontal: 20, marginBottom: 24, gap: 10 },
  importBtn:              { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  importText:             { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // Section
  section:                { paddingHorizontal: 20, marginBottom: 28 },
  sectionTitle:           { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 14 },

  // Category breakdown
  catRow:                 { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  catDot:                 { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  catLabelRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName:                { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  catAmount:              { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
  catBarBg:               { height: 5, backgroundColor: '#2C2C2C', borderRadius: 3, overflow: 'hidden' },
  catBarFill:             { height: 5, borderRadius: 3 },
  catPct:                 { fontSize: 11, color: '#6B6B6B' },

  // Top merchants
  merchantGrid:           { flexDirection: 'row', gap: 10 },
  merchantCard:           { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2C2C2C' },
  merchantRank:           { width: 24, height: 24, borderRadius: 8, backgroundColor: '#3D2A6E', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  merchantRankText:       { fontSize: 11, color: '#8257E6', fontWeight: '700' },
  merchantName:           { fontSize: 13, color: '#FFFFFF', fontWeight: '600', marginBottom: 6 },
  merchantAmount:         { fontSize: 15, color: '#FF4757', fontWeight: '700' },
  merchantCount:          { fontSize: 11, color: '#6B6B6B', marginTop: 2 },

  // Cards
  cardRow:                { flexDirection: 'row', gap: 12 },
  card:                   { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16 },
  creditCard:             { borderLeftWidth: 3, borderLeftColor: '#00C896' },
  debitCard:              { borderLeftWidth: 3, borderLeftColor: '#FF4757' },
  cardLabel:              { fontSize: 11, color: '#6B6B6B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardAmount:             { fontSize: 18, fontWeight: '700' },

  // EMIs
  emiRow:                 { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2C2C2C' },
  emiName:                { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  emiDue:                 { fontSize: 12, color: '#ABABAB', marginTop: 2 },
  emiAmount:              { fontSize: 16, fontWeight: '700', color: '#FF4757' },

  // Transactions
  txRow:                  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  txBadge:                { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txBadgeCredit:          { backgroundColor: '#0D3320' },
  txBadgeDebit:           { backgroundColor: '#3D0A0A' },
  txBadgeText:            { color: '#FFF', fontSize: 14, fontWeight: '700' },
  txMerchant:             { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  txDate:                 { fontSize: 11, color: '#6B6B6B', marginTop: 1 },
  txAmount:               { fontSize: 14, fontWeight: '700' },

  empty:                  { color: '#4B4B4B', textAlign: 'center', paddingVertical: 24, fontSize: 14 },
  fab:                    { position: 'absolute', right: 20, bottom: 28, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#8257E6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  chartLegend:            { flexDirection: 'row', gap: 16, marginTop: 10 },
  legendItem:             { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:              { width: 8, height: 8, borderRadius: 4 },
  legendText:             { fontSize: 12, color: '#ABABAB' },
});
