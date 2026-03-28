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
import { formatCurrencyCompact } from '../../utils/currencyUtils';
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'TopMerchants'>;
  route: RouteProp<AnalyticsStackParamList, 'TopMerchants'>;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthRange(yyyyMM: string): { from: number; to: number } {
  const [y, m] = yyyyMM.split('-').map(Number);
  return { from: new Date(y, m - 1, 1).getTime(), to: new Date(y, m, 0, 23, 59, 59, 999).getTime() };
}

export default function TopMerchantsScreen({ navigation, route }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getTopMerchants } = useTransactionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [merchants, setMerchants] = useState<Array<{ merchantName: string; count: number; total: number }>>([]);
  const [allTime, setAllTime] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    route.params?.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  const load = useCallback(async () => {
    let from: number, to: number;
    if (allTime) {
      from = 0; to = Date.now();
    } else {
      ({ from, to } = monthRange(selectedMonth));
    }
    const data = await getTopMerchants(userId, from, to, 20);
    setMerchants(data);
  }, [userId, selectedMonth, allTime]);

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

  const grandTotal = merchants.reduce((s, m) => s + m.total, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Top Merchants</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Toggle + month picker */}
        <View style={styles.controls}>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggle, !allTime && styles.toggleActive]} onPress={() => setAllTime(false)}>
              <Text style={[styles.toggleText, !allTime && styles.toggleTextActive]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggle, allTime && styles.toggleActive]} onPress={() => setAllTime(true)}>
              <Text style={[styles.toggleText, allTime && styles.toggleTextActive]}>All Time</Text>
            </TouchableOpacity>
          </View>
          {!allTime && (
            <View style={styles.monthPicker}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
                <MaterialIcons name="chevron-left" size={24} color="#8257E6" />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{monthLabel()}</Text>
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
                <MaterialIcons name="chevron-right" size={24} color="#8257E6" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* List */}
        {merchants.length === 0 ? (
          <Text style={styles.empty}>No merchant data found.</Text>
        ) : (
          <View style={styles.section}>
            {merchants.map((m, idx) => {
              const pct = grandTotal > 0 ? Math.round((m.total / grandTotal) * 100) : 0;
              return (
                <View key={m.merchantName} style={styles.row}>
                  <Text style={styles.rank}>#{idx + 1}</Text>
                  <View style={styles.info}>
                    <Text style={styles.merchantName}>{m.merchantName}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%` as any }]} />
                    </View>
                    <Text style={styles.countText}>{m.count} txn{m.count !== 1 ? 's' : ''} · {pct}% of total</Text>
                  </View>
                  <Text style={styles.amount}>{formatCurrencyCompact(m.total)}</Text>
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
  container:       { flex: 1, backgroundColor: '#0D0D0D' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 },
  headerTitle:     { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  controls:        { paddingHorizontal: 20, marginBottom: 16 },
  toggleRow:       { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 10, padding: 3, marginBottom: 12 },
  toggle:          { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  toggleActive:    { backgroundColor: '#8257E6' },
  toggleText:      { fontSize: 13, color: '#ABABAB', fontWeight: '600' },
  toggleTextActive:{ color: '#FFF' },
  monthPicker:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  monthBtn:        { padding: 8 },
  monthLabel:      { fontSize: 15, fontWeight: '600', color: '#FFFFFF', minWidth: 100, textAlign: 'center' },
  section:         { paddingHorizontal: 20, paddingBottom: 30 },
  row:             { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12, marginBottom: 8 },
  rank:            { fontSize: 16, fontWeight: '700', color: '#8257E6', width: 30 },
  info:            { flex: 1, marginRight: 10 },
  merchantName:    { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 6 },
  barTrack:        { height: 4, backgroundColor: '#2C2C2C', borderRadius: 2, marginBottom: 4 },
  barFill:         { height: 4, backgroundColor: '#FFA502', borderRadius: 2 },
  countText:       { fontSize: 11, color: '#6B6B6B' },
  amount:          { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  empty:           { color: '#4B4B4B', textAlign: 'center', paddingTop: 80, fontSize: 15 },
});
