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
import { formatCurrency, formatCurrencyCompact } from '../../utils/currencyUtils';
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'RecurringTransactions'>;
};

export default function RecurringTransactionsScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getRecurringTransactions } = useTransactionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Array<{
    merchantName: string; monthCount: number; totalCount: number; avgAmount: number; totalAmount: number;
  }>>([]);

  const load = useCallback(async () => {
    const data = await getRecurringTransactions(userId);
    setItems(data);
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const annualEstimate = (avg: number, monthCount: number) =>
    monthCount > 0 ? Math.round(avg * 12) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recurring Transactions</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={16} color="#8257E6" />
          <Text style={styles.infoText}>Merchants appearing in 2+ different months</Text>
        </View>

        {items.length === 0 ? (
          <Text style={styles.empty}>No recurring transactions found yet.</Text>
        ) : (
          <View style={styles.section}>
            {items.map(item => (
              <View key={item.merchantName} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconBg}>
                    <MaterialIcons name="autorenew" size={20} color="#06B6D4" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.merchantName}>{item.merchantName}</Text>
                    <Text style={styles.frequency}>Seen in {item.monthCount} months · {item.totalCount} times</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.avgAmount}>{formatCurrencyCompact(item.avgAmount)}</Text>
                    <Text style={styles.avgLabel}>avg/month</Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Total Spent</Text>
                    <Text style={styles.statValue}>{formatCurrency(item.totalAmount)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Est. Annual</Text>
                    <Text style={styles.statValue}>{formatCurrencyCompact(annualEstimate(item.avgAmount, item.monthCount))}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: item.monthCount >= 6 ? '#FF475722' : '#FFA50222' }]}>
                    <Text style={[styles.badgeText, { color: item.monthCount >= 6 ? '#FF4757' : '#FFA502' }]}>
                      {item.monthCount >= 6 ? 'Regular' : 'Occasional'}
                    </Text>
                  </View>
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
  infoCard:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 16, backgroundColor: '#1A1A1A', borderRadius: 10, padding: 12 },
  infoText:     { fontSize: 12, color: '#ABABAB' },
  section:      { paddingHorizontal: 20, paddingBottom: 30 },
  card:         { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 14, marginBottom: 10 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBg:       { width: 40, height: 40, borderRadius: 12, backgroundColor: '#06B6D422', alignItems: 'center', justifyContent: 'center' },
  merchantName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  frequency:    { fontSize: 11, color: '#6B6B6B', marginTop: 2 },
  avgAmount:    { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  avgLabel:     { fontSize: 10, color: '#6B6B6B' },
  cardFooter:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stat:         { flex: 1 },
  statLabel:    { fontSize: 10, color: '#6B6B6B', marginBottom: 2 },
  statValue:    { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:    { fontSize: 11, fontWeight: '700' },
  empty:        { color: '#4B4B4B', textAlign: 'center', paddingTop: 80, fontSize: 15, paddingHorizontal: 40 },
});
