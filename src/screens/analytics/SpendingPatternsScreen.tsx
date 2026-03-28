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
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'SpendingPatterns'>;
};

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CHART_HEIGHT = 140;

export default function SpendingPatternsScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getDayOfWeekPattern } = useTransactionStore();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [dowData, setDowData] = useState<Array<{ dow: number; total: number; count: number }>>([]);

  const load = useCallback(async () => {
    // Last 3 months
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
    const to = now.getTime();
    const raw = await getDayOfWeekPattern(userId, from, to);
    // Fill all 7 days
    const filled = Array.from({ length: 7 }, (_, dow) => {
      const found = raw.find(r => r.dow === dow);
      return found ?? { dow, total: 0, count: 0 };
    });
    setDowData(filled);
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const maxTotal = Math.max(...dowData.map(d => d.total), 1);
  const maxCount = Math.max(...dowData.map(d => d.count), 1);
  const busiestDow = dowData.reduce((b, d) => d.total > b.total ? d : b, dowData[0] ?? { dow: 0, total: 0, count: 0 });

  const chartWidth = width - 40;
  const slotWidth = chartWidth / 7;
  const barWidth = Math.max(Math.floor(slotWidth - 12), 10);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Spending Patterns</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={14} color="#8257E6" />
          <Text style={styles.infoText}>Based on last 3 months of spending</Text>
        </View>

        {/* Busiest day highlight */}
        {dowData.length > 0 && busiestDow.total > 0 && (
          <View style={styles.highlightCard}>
            <MaterialIcons name="local-fire-department" size={24} color="#FFA502" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.highlightLabel}>Busiest Spending Day</Text>
              <Text style={styles.highlightDay}>{DOW_LABELS[busiestDow.dow]}</Text>
              <Text style={styles.highlightAmount}>{formatCurrencyCompact(busiestDow.total)} total</Text>
            </View>
          </View>
        )}

        {/* Day-of-week bar chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Day-of-Week Spending</Text>
          <View style={{ height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end' }}>
            {dowData.map(d => {
              const h = Math.max(Math.round((d.total / maxTotal) * CHART_HEIGHT), d.total > 0 ? 3 : 0);
              const isBusiest = d.dow === busiestDow.dow && d.total > 0;
              const isWeekend = d.dow === 0 || d.dow === 6;
              return (
                <View key={d.dow} style={{ width: slotWidth, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <Text style={styles.barAmount}>{d.total > 0 ? formatCurrencyCompact(d.total) : ''}</Text>
                  <View style={{
                    width: barWidth,
                    height: h,
                    backgroundColor: isBusiest ? '#FFA502' : isWeekend ? '#8B5CF6' : '#8257E6',
                    borderRadius: 4,
                    opacity: d.total > 0 ? 1 : 0.15,
                  }} />
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            {dowData.map(d => (
              <Text key={d.dow} style={{ width: slotWidth, textAlign: 'center', fontSize: 11, color: '#6B6B6B', fontWeight: '600' }}>
                {DOW_LABELS[d.dow]}
              </Text>
            ))}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#FFA502' }]} /><Text style={styles.legendText}>Busiest</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#8B5CF6' }]} /><Text style={styles.legendText}>Weekend</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#8257E6' }]} /><Text style={styles.legendText}>Weekday</Text></View>
          </View>
        </View>

        {/* Detail table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Detail</Text>
          {dowData.map(d => {
            const pct = maxTotal > 0 ? Math.round((d.total / maxTotal) * 100) : 0;
            return (
              <View key={d.dow} style={styles.detailRow}>
                <Text style={styles.detailDay}>{DOW_LABELS[d.dow]}</Text>
                <View style={styles.detailBar}>
                  <View style={[styles.detailBarFill, {
                    width: `${pct}%` as any,
                    backgroundColor: d.dow === busiestDow.dow ? '#FFA502' : (d.dow === 0 || d.dow === 6) ? '#8B5CF6' : '#8257E6',
                  }]} />
                </View>
                <Text style={styles.detailAmount}>{formatCurrencyCompact(d.total)}</Text>
                <Text style={styles.detailCount}>{d.count} txns</Text>
              </View>
            );
          })}
        </View>

        {/* Transaction count chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Transaction Count by Day</Text>
          <View style={{ height: 80, flexDirection: 'row', alignItems: 'flex-end' }}>
            {dowData.map(d => {
              const h = Math.max(Math.round((d.count / maxCount) * 80), d.count > 0 ? 3 : 0);
              return (
                <View key={d.dow} style={{ width: slotWidth, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <View style={{ width: barWidth, height: h, backgroundColor: '#00C896', borderRadius: 3, opacity: d.count > 0 ? 1 : 0.15 }} />
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            {dowData.map(d => (
              <Text key={d.dow} style={{ width: slotWidth, textAlign: 'center', fontSize: 11, color: '#6B6B6B' }}>
                {DOW_LABELS[d.dow]}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0D0D0D' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  infoCard:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, backgroundColor: '#1A1A1A', borderRadius: 10, padding: 10 },
  infoText:     { fontSize: 12, color: '#ABABAB' },
  highlightCard:{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: '#FFA50222', borderRadius: 14, padding: 14, marginBottom: 16 },
  highlightLabel:{ fontSize: 11, color: '#ABABAB', marginBottom: 2 },
  highlightDay: { fontSize: 20, fontWeight: '700', color: '#FFA502' },
  highlightAmount:{ fontSize: 12, color: '#ABABAB', marginTop: 2 },
  chartCard:    { marginHorizontal: 20, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  barAmount:    { fontSize: 8, color: '#6B6B6B', marginBottom: 2 },
  legend:       { flexDirection: 'row', gap: 12, marginTop: 12 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  legendText:   { fontSize: 11, color: '#ABABAB' },
  section:      { paddingHorizontal: 20, marginBottom: 16 },
  detailRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailDay:    { width: 36, fontSize: 13, fontWeight: '600', color: '#ABABAB' },
  detailBar:    { flex: 1, height: 6, backgroundColor: '#2C2C2C', borderRadius: 3, marginHorizontal: 8 },
  detailBarFill:{ height: 6, borderRadius: 3 },
  detailAmount: { width: 52, fontSize: 11, color: '#FFFFFF', textAlign: 'right' },
  detailCount:  { width: 46, fontSize: 10, color: '#4B4B4B', textAlign: 'right' },
});
