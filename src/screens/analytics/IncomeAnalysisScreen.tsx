import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTransactionStore } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { formatCurrency, formatCurrencyCompact } from '../../utils/currencyUtils';
import { useCategoryMap } from '../../hooks/useCategoryMap';
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'IncomeAnalysis'>;
  route: RouteProp<AnalyticsStackParamList, 'IncomeAnalysis'>;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthRange(yyyyMM: string): { from: number; to: number } {
  const [y, m] = yyyyMM.split('-').map(Number);
  return { from: new Date(y, m - 1, 1).getTime(), to: new Date(y, m, 0, 23, 59, 59, 999).getTime() };
}

interface IncomeItem {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  total: number;
  count: number;
  pct: number;
}

export default function IncomeAnalysisScreen({ navigation, route }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getIncomeBreakdown, getSummary } = useTransactionStore();
  const catMap = useCategoryMap();
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<IncomeItem[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [prevMonthIncome, setPrevMonthIncome] = useState(0);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    route.params?.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  const load = useCallback(async () => {
    const { from, to } = monthRange(selectedMonth);
    const [breakdown, summary] = await Promise.all([
      getIncomeBreakdown(userId, from, to),
      getSummary(userId, from, to),
    ]);

    // Previous month for comparison
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const { from: pFrom, to: pTo } = monthRange(prevMonth);
    const prevSummary = await getSummary(userId, pFrom, pTo);
    setPrevMonthIncome(prevSummary.totalCredit);

    setTotalIncome(summary.totalCredit);
    const total = summary.totalCredit;
    const mapped: IncomeItem[] = breakdown.map(r => {
      const cat = catMap.get(r.categoryId ?? '');
      return {
        categoryId: r.categoryId,
        name: cat?.name ?? 'Uncategorized',
        icon: cat?.icon ?? 'label',
        color: cat?.color ?? '#8257E6',
        total: r.total,
        count: r.count,
        pct: total > 0 ? Math.round((r.total / total) * 100) : 0,
      };
    });
    setItems(mapped);
  }, [userId, selectedMonth, catMap]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  };

  const incomeChange = prevMonthIncome > 0
    ? Math.round(((totalIncome - prevMonthIncome) / prevMonthIncome) * 100) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Income Analysis</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Month picker */}
        <View style={styles.monthPicker}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
            <MaterialIcons name="chevron-left" size={24} color="#8257E6" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel()}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
            <MaterialIcons name="chevron-right" size={24} color="#8257E6" />
          </TouchableOpacity>
        </View>

        {/* Total income */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Income</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalIncome)}</Text>
          {incomeChange !== null && (
            <View style={styles.changeChip}>
              <MaterialIcons
                name={incomeChange >= 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={incomeChange >= 0 ? '#00C896' : '#FF4757'}
              />
              <Text style={[styles.changeText, { color: incomeChange >= 0 ? '#00C896' : '#FF4757' }]}>
                {incomeChange >= 0 ? '+' : ''}{incomeChange}% vs last month
              </Text>
            </View>
          )}
        </View>

        {/* Color bar */}
        {items.length > 0 && (
          <View style={styles.colorBar}>
            {items.map(item => (
              <View
                key={item.categoryId ?? 'null'}
                style={{ flex: item.pct, height: 10, backgroundColor: item.color }}
              />
            ))}
          </View>
        )}

        {/* Category list */}
        {items.length === 0 ? (
          <Text style={styles.empty}>No income data for this month.</Text>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Category</Text>
            {items.map(item => (
              <View key={item.categoryId ?? 'null'} style={styles.catRow}>
                <View style={[styles.catIcon, { backgroundColor: item.color + '33' }]}>
                  <MaterialIcons name={item.icon as any} size={18} color={item.color} />
                </View>
                <View style={styles.catInfo}>
                  <Text style={styles.catName}>{item.name}</Text>
                  <Text style={styles.catCount}>{item.count} transaction{item.count !== 1 ? 's' : ''}</Text>
                  <View style={styles.catBar}>
                    <View style={[styles.catBarFill, { width: `${item.pct}%` as any, backgroundColor: item.color }]} />
                  </View>
                </View>
                <View style={styles.catAmounts}>
                  <Text style={styles.catAmount}>{formatCurrencyCompact(item.total)}</Text>
                  <Text style={styles.catPct}>{item.pct}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0D0D0D' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  monthPicker:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  monthBtn:     { padding: 8 },
  monthLabel:   { fontSize: 16, fontWeight: '600', color: '#FFFFFF', minWidth: 110, textAlign: 'center' },
  totalCard:    { marginHorizontal: 20, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16 },
  totalLabel:   { fontSize: 11, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  totalAmount:  { fontSize: 30, fontWeight: '700', color: '#00C896' },
  changeChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  changeText:   { fontSize: 12, fontWeight: '600' },
  colorBar:     { flexDirection: 'row', marginHorizontal: 20, borderRadius: 8, overflow: 'hidden', height: 10, marginBottom: 20 },
  section:      { paddingHorizontal: 20, paddingBottom: 30 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  catRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12, marginBottom: 8 },
  catIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catInfo:      { flex: 1, marginRight: 12 },
  catName:      { fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  catCount:     { fontSize: 10, color: '#4B4B4B', marginBottom: 6 },
  catBar:       { height: 4, backgroundColor: '#2C2C2C', borderRadius: 2 },
  catBarFill:   { height: 4, borderRadius: 2 },
  catAmounts:   { alignItems: 'flex-end' },
  catAmount:    { fontSize: 14, fontWeight: '700', color: '#00C896' },
  catPct:       { fontSize: 11, color: '#6B6B6B' },
  empty:        { color: '#4B4B4B', textAlign: 'center', paddingTop: 60, fontSize: 15 },
});
