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
import { useBudgetStore } from '../../store/budgetStore';
import { formatCurrencyCompact } from '../../utils/currencyUtils';
import { currentMonthRange } from '../../utils/dateUtils';
import { useCategoryMap } from '../../hooks/useCategoryMap';
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'AnalyticsHome'>;
};

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

interface ReportCard {
  icon: string;
  title: string;
  subtitle: string;
  screen: keyof AnalyticsStackParamList;
  params?: any;
  color: string;
}

export default function AnalyticsHomeScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getCategoryBreakdown, getTopMerchants, getSummary } = useTransactionStore();
  const { loadBudgets, budgets } = useBudgetStore();
  const catMap = useCategoryMap();
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState({
    topCategory: '',
    topCategoryAmount: 0,
    topMerchant: '',
    savingsRate: 0,
    overBudgetCount: 0,
  });

  const load = useCallback(async () => {
    const { from, to } = currentMonthRange();
    const [breakdown, merchants, summary] = await Promise.all([
      getCategoryBreakdown(userId, from, to),
      getTopMerchants(userId, from, to, 1),
      getSummary(userId, from, to),
    ]);
    await loadBudgets(userId, CURRENT_MONTH);

    const topCat = breakdown[0];
    const catInfo = topCat ? catMap.get(topCat.categoryId ?? '') : undefined;

    const rate = summary.totalCredit > 0
      ? Math.round(((summary.totalCredit - summary.totalDebit) / summary.totalCredit) * 100)
      : 0;

    setKpis({
      topCategory: catInfo?.name ?? 'N/A',
      topCategoryAmount: topCat?.totalDebit ?? 0,
      topMerchant: merchants[0]?.merchantName ?? 'N/A',
      savingsRate: rate,
      overBudgetCount: 0,
    });
  }, [userId, catMap]);

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const cards: ReportCard[] = [
    { icon: 'donut-large',        title: 'Category Breakdown', subtitle: `Top: ${kpis.topCategory} ${formatCurrencyCompact(kpis.topCategoryAmount)}`, screen: 'CategoryBreakdown', color: '#8257E6' },
    { icon: 'store',              title: 'Top Merchants',       subtitle: `#1: ${kpis.topMerchant}`,                                                    screen: 'TopMerchants',        color: '#FFA502' },
    { icon: 'savings',            title: 'Savings Rate',        subtitle: `This month: ${kpis.savingsRate}%`,                                           screen: 'SavingsRate',         color: '#00C896' },
    { icon: 'track-changes',      title: 'Budgets',             subtitle: 'Set & track limits',                                                          screen: 'Budget',              color: '#FF4757' },
    { icon: 'calendar-today',     title: 'Cash Flow Calendar',  subtitle: 'Daily spending heatmap',                                                      screen: 'CashFlowCalendar',    color: '#8B5CF6' },
    { icon: 'autorenew',          title: 'Recurring',           subtitle: 'Subscriptions & repeats',                                                     screen: 'RecurringTransactions', color: '#06B6D4' },
    { icon: 'account-balance',    title: 'EMI Burden',          subtitle: 'Loan impact on income',                                                       screen: 'EMIBurden',           color: '#CD853F' },
    { icon: 'trending-up',        title: 'Category Trends',     subtitle: 'Spending over time',                                                          screen: 'CategoryTrends', params: { categoryId: 'cat_food', categoryName: 'Food & Dining' }, color: '#10B981' },
    { icon: 'date-range',         title: 'Custom Range',        subtitle: 'Any date range report',                                                       screen: 'CustomRangeReport',   color: '#F97316' },
    { icon: 'compare',            title: 'Year over Year',      subtitle: 'Same month comparison',                                                       screen: 'YearOverYear',        color: '#EC4899' },
    { icon: 'account-balance-wallet', title: 'Net Worth',       subtitle: 'Assets vs liabilities',                                                      screen: 'NetWorth',            color: '#14B8A6' },
    { icon: 'payments',           title: 'Income Analysis',     subtitle: 'Income by category',                                                          screen: 'IncomeAnalysis',      color: '#00C896' },
    { icon: 'hourglass-empty',    title: 'Ledger Aging',        subtitle: 'Overdue lend entries',                                                        screen: 'LedgerAging',         color: '#FF4757' },
    { icon: 'bar-chart',          title: 'Spending Patterns',   subtitle: 'Day-of-week analysis',                                                        screen: 'SpendingPatterns',    color: '#8257E6' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSub}>Insights from your finances</Text>
        </View>

        {/* KPI row */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Savings Rate</Text>
            <Text style={[styles.kpiValue, { color: kpis.savingsRate >= 0 ? '#00C896' : '#FF4757' }]}>
              {kpis.savingsRate}%
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Top Category</Text>
            <Text style={styles.kpiValue} numberOfLines={1}>{kpis.topCategory}</Text>
          </View>
        </View>

        {/* Cards grid */}
        <View style={styles.grid}>
          {cards.map(card => (
            <TouchableOpacity
              key={card.screen}
              style={styles.card}
              onPress={() => (navigation as any).navigate(card.screen, card.params)}
              activeOpacity={0.8}
            >
              <View style={[styles.cardIcon, { backgroundColor: card.color + '22' }]}>
                <MaterialIcons name={card.icon} size={22} color={card.color} />
              </View>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSub} numberOfLines={2}>{card.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0D0D0D' },
  header:      { padding: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  headerSub:   { fontSize: 13, color: '#6B6B6B', marginTop: 2 },
  kpiRow:      { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  kpiCard:     { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14 },
  kpiLabel:    { fontSize: 11, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  kpiValue:    { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12, paddingBottom: 30 },
  card:        { width: '47%', backgroundColor: '#1A1A1A', borderRadius: 16, padding: 14 },
  cardIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  cardSub:     { fontSize: 11, color: '#6B6B6B', lineHeight: 16 },
});
