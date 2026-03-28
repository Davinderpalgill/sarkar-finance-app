import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTransactionStore } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { formatCurrencyCompact } from '../../utils/currencyUtils';
import { useCategoryMap } from '../../hooks/useCategoryMap';
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'YearOverYear'>;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CHART_HEIGHT = 120;

export default function YearOverYearScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getCategoryBreakdown, getSummary } = useTransactionStore();
  const catMap = useCategoryMap();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-based

  const [thisYear, setThisYear] = useState<{ debit: number; credit: number; catBreakdown: Array<{ id: string | null; name: string; color: string; amount: number }> }>({ debit: 0, credit: 0, catBreakdown: [] });
  const [lastYear, setLastYear] = useState<{ debit: number; credit: number; catBreakdown: Array<{ id: string | null; name: string; color: string; amount: number }> }>({ debit: 0, credit: 0, catBreakdown: [] });

  const currentYear = now.getFullYear();

  const loadForYear = async (year: number) => {
    const from = new Date(year, selectedMonth - 1, 1).getTime();
    const to = new Date(year, selectedMonth, 0, 23, 59, 59, 999).getTime();
    const [summary, breakdown] = await Promise.all([
      getSummary(userId, from, to),
      getCategoryBreakdown(userId, from, to),
    ]);
    const catBreakdown = breakdown
      .filter(r => r.totalDebit > 0)
      .slice(0, 6)
      .map(r => {
        const cat = catMap.get(r.categoryId ?? '');
        return { id: r.categoryId, name: cat?.name ?? 'Other', color: cat?.color ?? '#8257E6', amount: r.totalDebit };
      });
    return { debit: summary.totalDebit, credit: summary.totalCredit, catBreakdown };
  };

  const load = useCallback(async () => {
    const [ty, ly] = await Promise.all([loadForYear(currentYear), loadForYear(currentYear - 1)]);
    setThisYear(ty); setLastYear(ly);
  }, [userId, selectedMonth, catMap]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const changeMonth = (delta: number) => {
    let m = selectedMonth + delta;
    if (m > 12) m = 1;
    if (m < 1) m = 12;
    setSelectedMonth(m);
  };

  const maxVal = Math.max(thisYear.debit, lastYear.debit, thisYear.credit, lastYear.credit, 1);
  const barW = (width - 80) / 4 - 8;

  const pctChange = (current: number, prev: number) => {
    if (prev === 0) return null;
    return Math.round(((current - prev) / prev) * 100);
  };

  const spendChange = pctChange(thisYear.debit, lastYear.debit);
  const incomeChange = pctChange(thisYear.credit, lastYear.credit);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Year over Year</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Month picker */}
        <View style={styles.monthPicker}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
            <MaterialIcons name="chevron-left" size={24} color="#8257E6" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[selectedMonth - 1]}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
            <MaterialIcons name="chevron-right" size={24} color="#8257E6" />
          </TouchableOpacity>
        </View>

        {/* Side-by-side bars */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>{MONTHS[selectedMonth - 1]}: {currentYear - 1} vs {currentYear}</Text>
          <View style={styles.chartRow}>
            {/* Last year spending */}
            <View style={styles.barGroup}>
              <Text style={styles.barLabel}>{currentYear - 1}</Text>
              <View style={styles.barTrack}>
                <View style={{ width: barW }}>
                  <View style={{ height: Math.max(Math.round((lastYear.debit / maxVal) * CHART_HEIGHT), 2), backgroundColor: '#FF475799', borderRadius: 4 }} />
                </View>
                <View style={{ width: barW }}>
                  <View style={{ height: Math.max(Math.round((lastYear.credit / maxVal) * CHART_HEIGHT), 2), backgroundColor: '#00C89699', borderRadius: 4 }} />
                </View>
              </View>
              <Text style={styles.barVal}>{formatCurrencyCompact(lastYear.debit)}</Text>
            </View>

            <View style={styles.vsBox}><Text style={styles.vsText}>VS</Text></View>

            {/* This year spending */}
            <View style={styles.barGroup}>
              <Text style={styles.barLabel}>{currentYear}</Text>
              <View style={styles.barTrack}>
                <View style={{ width: barW }}>
                  <View style={{ height: Math.max(Math.round((thisYear.debit / maxVal) * CHART_HEIGHT), 2), backgroundColor: '#FF4757', borderRadius: 4 }} />
                </View>
                <View style={{ width: barW }}>
                  <View style={{ height: Math.max(Math.round((thisYear.credit / maxVal) * CHART_HEIGHT), 2), backgroundColor: '#00C896', borderRadius: 4 }} />
                </View>
              </View>
              <Text style={styles.barVal}>{formatCurrencyCompact(thisYear.debit)}</Text>
            </View>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#FF4757' }]} /><Text style={styles.legendText}>Spending</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#00C896' }]} /><Text style={styles.legendText}>Income</Text></View>
          </View>
        </View>

        {/* Changes summary */}
        <View style={styles.changeRow}>
          <View style={[styles.changeCard, spendChange !== null && spendChange > 0 && styles.badChange]}>
            <Text style={styles.changeLabel}>Spending</Text>
            {spendChange !== null ? (
              <Text style={[styles.changePct, { color: spendChange > 0 ? '#FF4757' : '#00C896' }]}>
                {spendChange > 0 ? '↑' : '↓'}{Math.abs(spendChange)}%
              </Text>
            ) : <Text style={styles.changePct}>N/A</Text>}
          </View>
          <View style={[styles.changeCard, incomeChange !== null && incomeChange < 0 && styles.badChange]}>
            <Text style={styles.changeLabel}>Income</Text>
            {incomeChange !== null ? (
              <Text style={[styles.changePct, { color: incomeChange >= 0 ? '#00C896' : '#FF4757' }]}>
                {incomeChange >= 0 ? '↑' : '↓'}{Math.abs(incomeChange)}%
              </Text>
            ) : <Text style={styles.changePct}>N/A</Text>}
          </View>
        </View>

        {/* Category comparison */}
        {(thisYear.catBreakdown.length > 0 || lastYear.catBreakdown.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Comparison</Text>
            {[...catMap.entries()].map(([catId, cat]) => {
              const ty = thisYear.catBreakdown.find(c => c.id === catId)?.amount ?? 0;
              const ly = lastYear.catBreakdown.find(c => c.id === catId)?.amount ?? 0;
              if (ty === 0 && ly === 0) return null;
              const maxCat = Math.max(ty, ly, 1);
              const chg = pctChange(ty, ly);
              return (
                <View key={catId} style={styles.catRow}>
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '33' }]}>
                    <MaterialIcons name={cat.icon as any} size={14} color={cat.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <View style={styles.dualBars}>
                      <View style={[styles.dualBar, { width: `${Math.round((ly / maxCat) * 100)}%` as any, backgroundColor: cat.color + '66' }]} />
                    </View>
                    <View style={styles.dualBars}>
                      <View style={[styles.dualBar, { width: `${Math.round((ty / maxCat) * 100)}%` as any, backgroundColor: cat.color }]} />
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                    <Text style={styles.catAmount}>{formatCurrencyCompact(ty)}</Text>
                    {chg !== null && (
                      <Text style={[styles.catChg, { color: chg > 0 ? '#FF4757' : '#00C896' }]}>
                        {chg > 0 ? '+' : ''}{chg}%
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
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
  monthLabel:   { fontSize: 16, fontWeight: '600', color: '#FFFFFF', minWidth: 60, textAlign: 'center' },
  chartCard:    { marginHorizontal: 20, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 14 },
  chartRow:     { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  barGroup:     { alignItems: 'center' },
  barLabel:     { fontSize: 12, color: '#ABABAB', marginBottom: 8, fontWeight: '600' },
  barTrack:     { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: CHART_HEIGHT, justifyContent: 'center' },
  barVal:       { fontSize: 11, color: '#ABABAB', marginTop: 6 },
  vsBox:        { paddingHorizontal: 8, paddingBottom: 20 },
  vsText:       { fontSize: 12, color: '#4B4B4B', fontWeight: '700' },
  legend:       { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  legendText:   { fontSize: 11, color: '#ABABAB' },
  changeRow:    { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  changeCard:   { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  badChange:    { borderColor: '#FF475744' },
  changeLabel:  { fontSize: 11, color: '#6B6B6B', marginBottom: 4 },
  changePct:    { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  section:      { paddingHorizontal: 20, paddingBottom: 30 },
  catRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 10, marginBottom: 8 },
  catIcon:      { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catName:      { fontSize: 12, color: '#ABABAB', marginBottom: 4 },
  dualBars:     { height: 5, backgroundColor: '#2C2C2C', borderRadius: 3, marginBottom: 2 },
  dualBar:      { height: 5, borderRadius: 3 },
  catAmount:    { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  catChg:       { fontSize: 10, fontWeight: '600' },
});
