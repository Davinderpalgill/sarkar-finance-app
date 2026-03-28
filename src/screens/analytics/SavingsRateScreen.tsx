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
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'SavingsRate'>;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TARGET_RATE = 20;
const CHART_HEIGHT = 140;

interface MonthRate {
  month: string;
  rate: number;
}

function build12MonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

export default function SavingsRateScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getMonthlyTrend } = useTransactionStore();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<MonthRate[]>([]);

  const load = useCallback(async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 11, 1).getTime();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const raw = await getMonthlyTrend(userId, from, to);
    const keys = build12MonthKeys();
    const map = new Map(raw.map(r => [r.month, r]));
    setData(keys.map(k => {
      const r = map.get(k);
      const rate = r && r.totalCredit > 0
        ? Math.round(((r.totalCredit - r.totalDebit) / r.totalCredit) * 100)
        : 0;
      return { month: k, rate };
    }));
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const nonZero = data.filter(d => d.rate !== 0);
  const avg = nonZero.length > 0 ? Math.round(nonZero.reduce((s, d) => s + d.rate, 0) / nonZero.length) : 0;
  const best = nonZero.length > 0 ? nonZero.reduce((b, d) => d.rate > b.rate ? d : b, nonZero[0]) : null;
  const worst = nonZero.length > 0 ? nonZero.reduce((b, d) => d.rate < b.rate ? d : b, nonZero[0]) : null;

  const maxRate = Math.max(...data.map(d => Math.abs(d.rate)), TARGET_RATE, 1);
  const chartWidth = width - 40;
  const slotWidth = chartWidth / Math.max(data.length, 1);
  const barWidth = Math.max(Math.floor(slotWidth - 6), 4);

  const abbr = (yyyyMM: string) => MONTHS[parseInt(yyyyMM.split('-')[1], 10) - 1];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Savings Rate</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg Rate</Text>
            <Text style={[styles.summaryValue, { color: avg >= TARGET_RATE ? '#00C896' : '#FF4757' }]}>{avg}%</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Best Month</Text>
            <Text style={styles.summaryValue}>{best ? `${abbr(best.month)} ${best.rate}%` : 'N/A'}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Worst</Text>
            <Text style={[styles.summaryValue, { color: '#FF4757' }]}>{worst ? `${abbr(worst.month)} ${worst.rate}%` : 'N/A'}</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>12-Month Savings Rate</Text>
          <Text style={styles.targetLabel}>Target: {TARGET_RATE}%</Text>
          <View style={{ height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', position: 'relative' }}>
            {/* Target line */}
            <View style={[styles.targetLine, { bottom: Math.round((TARGET_RATE / maxRate) * CHART_HEIGHT) }]} />
            {data.map(d => {
              const h = Math.max(Math.round((Math.abs(d.rate) / maxRate) * CHART_HEIGHT), 2);
              const color = d.rate >= TARGET_RATE ? '#00C896' : d.rate >= 0 ? '#FFA502' : '#FF4757';
              return (
                <View key={d.month} style={{ width: slotWidth, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <View style={{ width: barWidth, height: h, backgroundColor: color, borderRadius: 3 }} />
                </View>
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
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#00C896' }]} /><Text style={styles.legendText}>Above target</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#FFA502' }]} /><Text style={styles.legendText}>Below target</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#FF4757' }]} /><Text style={styles.legendText}>Negative</Text></View>
          </View>
        </View>

        {/* Monthly breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Detail</Text>
          {[...data].reverse().map(d => (
            <View key={d.month} style={styles.monthRow}>
              <Text style={styles.monthName}>{abbr(d.month)} {d.month.split('-')[0]}</Text>
              <View style={styles.rateBar}>
                <View style={[styles.rateBarFill, {
                  width: `${Math.min(Math.abs(d.rate), 100)}%` as any,
                  backgroundColor: d.rate >= TARGET_RATE ? '#00C896' : d.rate >= 0 ? '#FFA502' : '#FF4757',
                }]} />
              </View>
              <Text style={[styles.rateText, { color: d.rate >= 0 ? '#00C896' : '#FF4757' }]}>{d.rate}%</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0D0D0D' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  summaryRow:   { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginVertical: 16 },
  summaryCard:  { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryLabel: { fontSize: 10, color: '#6B6B6B', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  chartCard:    { marginHorizontal: 20, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, marginBottom: 20, position: 'relative', overflow: 'hidden' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  targetLabel:  { fontSize: 11, color: '#8257E6', marginBottom: 12 },
  targetLine:   { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#8257E6', opacity: 0.6 },
  legend:       { flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  legendText:   { fontSize: 11, color: '#ABABAB' },
  section:      { paddingHorizontal: 20, paddingBottom: 30 },
  monthRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  monthName:    { width: 60, fontSize: 12, color: '#ABABAB' },
  rateBar:      { flex: 1, height: 6, backgroundColor: '#2C2C2C', borderRadius: 3, marginHorizontal: 10 },
  rateBarFill:  { height: 6, borderRadius: 3 },
  rateText:     { width: 40, fontSize: 12, fontWeight: '600', textAlign: 'right' },
});
