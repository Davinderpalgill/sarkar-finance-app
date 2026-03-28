import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTransactionStore } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { formatCurrency, formatCurrencyCompact } from '../../utils/currencyUtils';
import { DEFAULT_CATEGORIES } from '../../config/categories';
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'CategoryTrends'>;
  route: RouteProp<AnalyticsStackParamList, 'CategoryTrends'>;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CHART_HEIGHT = 140;

function build12MonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

export default function CategoryTrendsScreen({ navigation, route }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getCategoryTrend } = useTransactionStore();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Array<{ month: string; total: number; count: number }>>([]);
  const [selectedId, setSelectedId] = useState(route.params.categoryId);

  const cat = DEFAULT_CATEGORIES.find(c => c.id === selectedId);

  const load = useCallback(async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 11, 1).getTime();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const raw = await getCategoryTrend(userId, selectedId, from, to);
    const keys = build12MonthKeys();
    const map = new Map(raw.map(r => [r.month, r]));
    setData(keys.map(k => map.get(k) ?? { month: k, total: 0, count: 0 }));
  }, [userId, selectedId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [selectedId]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const maxVal = Math.max(...data.map(d => d.total), 1);
  const chartWidth = width - 40;
  const slotWidth = chartWidth / Math.max(data.length, 1);
  const barWidth = Math.max(Math.floor(slotWidth - 6), 4);
  const accentColor = cat?.color ?? '#8257E6';

  const abbr = (yyyyMM: string) => MONTHS[parseInt(yyyyMM.split('-')[1], 10) - 1];

  const goToTransactions = (yyyyMM: string) => {
    const [y, m] = yyyyMM.split('-').map(Number);
    const fromDate = new Date(y, m - 1, 1).getTime();
    const toDate = new Date(y, m, 0, 23, 59, 59, 999).getTime();
    navigation.navigate('CategoryTransactions', {
      categoryId: selectedId,
      categoryName: cat?.name ?? selectedId,
      fromDate,
      toDate,
    });
  };

  // Month-over-month change
  const momChange = (idx: number) => {
    if (idx === 0 || data[idx - 1].total === 0) return null;
    return Math.round(((data[idx].total - data[idx - 1].total) / data[idx - 1].total) * 100);
  };

  const nonZero = data.filter(d => d.total > 0);
  const avg = nonZero.length > 0 ? Math.round(nonZero.reduce((s, d) => s + d.total, 0) / nonZero.length) : 0;
  const peak = nonZero.length > 0 ? nonZero.reduce((b, d) => d.total > b.total ? d : b, nonZero[0]) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Category Trends</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Category picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pickerRow}
        >
          {DEFAULT_CATEGORIES.map(c => {
            const active = c.id === selectedId;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, active && { backgroundColor: c.color + '33', borderColor: c.color }]}
                onPress={() => setSelectedId(c.id)}
                activeOpacity={0.7}
              >
                <MaterialIcons name={c.icon as any} size={14} color={active ? c.color : '#6B6B6B'} />
                <Text style={[styles.chipText, active && { color: c.color }]}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Monthly Avg</Text>
            <Text style={styles.summaryValue}>{formatCurrencyCompact(avg)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Peak Month</Text>
            <Text style={styles.summaryValue}>{peak ? abbr(peak.month) : 'N/A'}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Peak Amount</Text>
            <Text style={styles.summaryValue}>{peak ? formatCurrencyCompact(peak.total) : 'N/A'}</Text>
          </View>
        </View>

        {/* Bar chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>12-Month Trend</Text>
          <View style={{ height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end' }}>
            {data.map((d, i) => {
              const h = Math.max(Math.round((d.total / maxVal) * CHART_HEIGHT), d.total > 0 ? 3 : 0);
              const change = momChange(i);
              return (
                <TouchableOpacity
                  key={d.month}
                  style={{ width: slotWidth, alignItems: 'center', justifyContent: 'flex-end' }}
                  onPress={() => goToTransactions(d.month)}
                  activeOpacity={0.7}
                  disabled={d.total === 0}
                >
                  {change !== null && change !== 0 && (
                    <Text style={[styles.changeLabel, { color: change > 0 ? '#FF4757' : '#00C896' }]}>
                      {change > 0 ? '+' : ''}{change}%
                    </Text>
                  )}
                  <View style={{ width: barWidth, height: h, backgroundColor: accentColor, borderRadius: 3, opacity: d.total > 0 ? 1 : 0.2 }} />
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            {data.map(d => (
              <Text key={d.month} style={{ width: slotWidth, textAlign: 'center', fontSize: 9, color: '#6B6B6B' }}>
                {abbr(d.month)}
              </Text>
            ))}
          </View>
        </View>

        {/* Monthly detail */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Detail</Text>
          {[...data].reverse().map((d, i) => {
            const origIdx = data.length - 1 - i;
            const change = momChange(origIdx);
            return (
              <TouchableOpacity
                key={d.month}
                style={styles.monthRow}
                onPress={() => goToTransactions(d.month)}
                activeOpacity={0.7}
                disabled={d.total === 0}
              >
                <Text style={styles.monthName}>{abbr(d.month)} {d.month.split('-')[0]}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${maxVal > 0 ? Math.round((d.total / maxVal) * 100) : 0}%` as any, backgroundColor: accentColor }]} />
                </View>
                <Text style={styles.monthAmount}>{formatCurrencyCompact(d.total)}</Text>
                {change !== null && (
                  <Text style={[styles.changeChip, { color: change > 0 ? '#FF4757' : '#00C896' }]}>
                    {change > 0 ? '↑' : '↓'}{Math.abs(change)}%
                  </Text>
                )}
                <MaterialIcons name="chevron-right" size={14} color="#3A3A3A" />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0D0D0D' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  catBadge:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  catIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catName:      { fontSize: 14, color: '#ABABAB' },
  summaryRow:   { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  summaryCard:  { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 10, alignItems: 'center' },
  summaryLabel: { fontSize: 10, color: '#6B6B6B', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  chartCard:    { marginHorizontal: 20, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  changeLabel:  { fontSize: 8, fontWeight: '600', marginBottom: 2 },
  section:      { paddingHorizontal: 20, paddingBottom: 30 },
  monthRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  monthName:    { width: 50, fontSize: 12, color: '#ABABAB' },
  barTrack:     { flex: 1, height: 6, backgroundColor: '#2C2C2C', borderRadius: 3, marginHorizontal: 8 },
  barFill:      { height: 6, borderRadius: 3 },
  monthAmount:  { width: 50, fontSize: 11, color: '#FFFFFF', textAlign: 'right' },
  changeChip:   { width: 40, fontSize: 10, fontWeight: '600', textAlign: 'right' },
  pickerRow:    { paddingHorizontal: 20, paddingBottom: 16, gap: 8, flexDirection: 'row' },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  chipText:     { fontSize: 12, color: '#6B6B6B', fontWeight: '600' },
});
