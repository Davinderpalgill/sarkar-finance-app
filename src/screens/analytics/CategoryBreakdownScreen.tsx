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
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'CategoryBreakdown'>;
  route: RouteProp<AnalyticsStackParamList, 'CategoryBreakdown'>;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthRange(yyyyMM: string): { from: number; to: number } {
  const [y, m] = yyyyMM.split('-').map(Number);
  const from = new Date(y, m - 1, 1).getTime();
  const to   = new Date(y, m, 0, 23, 59, 59, 999).getTime();
  return { from, to };
}

interface BreakdownItem {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  totalDebit: number;
  pct: number;
}

export default function CategoryBreakdownScreen({ navigation, route }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getCategoryBreakdown } = useTransactionStore();
  const catMap = useCategoryMap();
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<BreakdownItem[]>([]);
  const [totalDebit, setTotalDebit] = useState(0);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    route.params?.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  const load = useCallback(async () => {
    const { from, to } = monthRange(selectedMonth);
    const raw = await getCategoryBreakdown(userId, from, to);
    const total = raw.reduce((s, r) => s + r.totalDebit, 0);
    setTotalDebit(total);
    const mapped: BreakdownItem[] = raw
      .filter(r => r.totalDebit > 0)
      .map(r => {
        const cat = catMap.get(r.categoryId ?? '');
        return {
          categoryId: r.categoryId,
          name: cat?.name ?? 'Uncategorized',
          icon: cat?.icon ?? 'label',
          color: cat?.color ?? '#8257E6',
          totalDebit: r.totalDebit,
          pct: total > 0 ? Math.round((r.totalDebit / total) * 100) : 0,
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Category Breakdown</Text>
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

        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Spending</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalDebit)}</Text>
        </View>

        {/* Donut chart (custom) */}
        {items.length > 0 && (
          <View style={styles.donutSection}>
            <Text style={styles.sectionTitle}>Breakdown</Text>
            {/* Simple percentage bars acting as donut segments */}
            <View style={styles.donutBar}>
              {items.slice(0, 8).map(item => (
                <View
                  key={item.categoryId ?? 'null'}
                  style={[styles.donutSegment, { flex: item.pct, backgroundColor: item.color }]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Category list */}
        {items.length === 0 ? (
          <Text style={styles.empty}>No spending data for this month.</Text>
        ) : (
          <View style={styles.section}>
            {items.map(item => (
              <TouchableOpacity
                key={item.categoryId ?? 'null'}
                style={styles.catRow}
                onPress={() => {
                  const { from, to } = monthRange(selectedMonth);
                  navigation.navigate('CategoryTransactions', {
                    categoryId: item.categoryId,
                    categoryName: item.name,
                    fromDate: from,
                    toDate: to,
                  });
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.catIcon, { backgroundColor: item.color + '33' }]}>
                  <MaterialIcons name={item.icon as any} size={18} color={item.color} />
                </View>
                <View style={styles.catInfo}>
                  <Text style={styles.catName}>{item.name}</Text>
                  <View style={styles.catBar}>
                    <View style={[styles.catBarFill, { width: `${item.pct}%` as any, backgroundColor: item.color }]} />
                  </View>
                </View>
                <View style={styles.catAmounts}>
                  <Text style={styles.catAmount}>{formatCurrencyCompact(item.totalDebit)}</Text>
                  <Text style={styles.catPct}>{item.pct}%</Text>
                </View>
              </TouchableOpacity>
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
  totalCard:    { marginHorizontal: 20, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, marginBottom: 16, alignItems: 'center' },
  totalLabel:   { fontSize: 11, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  totalAmount:  { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  donutSection: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  donutBar:     { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  donutSegment: { height: 12 },
  section:      { paddingHorizontal: 20, paddingBottom: 30 },
  catRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12, marginBottom: 8 },
  catIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catInfo:      { flex: 1, marginRight: 12 },
  catName:      { fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginBottom: 6 },
  catBar:       { height: 4, backgroundColor: '#2C2C2C', borderRadius: 2 },
  catBarFill:   { height: 4, borderRadius: 2 },
  catAmounts:   { alignItems: 'flex-end' },
  catAmount:    { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  catPct:       { fontSize: 11, color: '#6B6B6B' },
  empty:        { color: '#4B4B4B', textAlign: 'center', paddingTop: 60, fontSize: 15 },
});
