import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { AnalyticsStackParamList } from '../../navigation/types/navigation';
import { useUiStore } from '../../store/uiStore';
import { Transaction } from '../../models/Transaction';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDate } from '../../utils/dateUtils';
import { getDatabase } from '../../storage/database';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'CategoryTransactions'>;
  route:      RouteProp<AnalyticsStackParamList, 'CategoryTransactions'>;
};

type VendorSummary = { name: string; total: number; count: number };

export default function CategoryTransactionsScreen({ navigation, route }: Props) {
  const { categoryId, categoryName, fromDate, toDate } = route.params;
  const userId = useUiStore(s => s.userId)!;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const catCondition = categoryId ? `AND category_id = ?` : `AND category_id IS NULL`;
      const params: any[] = [userId, fromDate, toDate];
      if (categoryId) params.push(categoryId);

      const [result] = await db.executeSql(
        `SELECT * FROM transactions
         WHERE user_id = ?
           AND transaction_date >= ?
           AND transaction_date <= ?
           ${catCondition}
         ORDER BY transaction_date DESC`,
        params,
      );

      const rows: Transaction[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        const r = result.rows.item(i);
        rows.push({
          id:               r.id,
          userId:           r.user_id,
          amount:           r.amount,
          type:             r.type,
          categoryId:       r.category_id ?? null,
          categoryConfidence: r.category_confidence ?? 0,
          merchantName:     r.merchant_name ?? null,
          personName:       r.person_name ?? null,
          bankName:         r.bank_name,
          accountLast4:     r.account_last4 ?? null,
          transactionDate:  r.transaction_date,
          referenceNumber:  r.reference_number ?? null,
          upiId:            r.upi_id ?? null,
          availableBalance: r.available_balance ?? null,
          note:             r.note ?? null,
          rawSms:           r.raw_sms ?? null,
          source:           r.source ?? 'manual',
          syncedAt:         r.synced_at ?? null,
          createdAt:        r.created_at,
          updatedAt:        r.updated_at,
        });
      }
      setTransactions(rows);
    } finally {
      setLoading(false);
    }
  }, [userId, categoryId, fromDate, toDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Group debit transactions by vendor, sort by total spend
  const topVendors = useMemo<VendorSummary[]>(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const tx of transactions) {
      if (tx.type !== 'debit') continue;
      const key = tx.merchantName || tx.personName || tx.bankName;
      const existing = map.get(key) ?? { total: 0, count: 0 };
      map.set(key, { total: existing.total + tx.amount, count: existing.count + 1 });
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions]);

  const handleEdit = (item: Transaction) => {
    const tabNav = navigation.getParent() as any;
    tabNav?.navigate('Transactions', { screen: 'TransactionDetail', params: { id: item.id } });
  };

  const handleDelete = (item: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Delete ${formatCurrency(item.amount)} at ${item.merchantName || item.bankName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const db = await getDatabase();
          await db.executeSql('DELETE FROM transactions WHERE id = ?', [item.id]);
          setTransactions(prev => prev.filter(t => t.id !== item.id));
        }},
      ]
    );
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={styles.item}>
      <View style={[styles.badge, item.type === 'credit' ? styles.creditBadge : styles.debitBadge]}>
        <Text style={styles.badgeText}>{item.type === 'credit' ? '↓' : '↑'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.merchant} numberOfLines={1}>
          {item.merchantName || item.personName || item.bankName}
        </Text>
        <Text style={styles.date}>{formatDate(item.transactionDate)} · {item.bankName}</Text>
      </View>
      <Text style={[styles.amount, item.type === 'credit' ? styles.credit : styles.debit]}>
        {item.type === 'credit' ? '+' : '-'}{formatCurrency(item.amount)}
      </Text>
      <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
        <MaterialIcons name="edit" size={15} color="#8257E6" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
        <MaterialIcons name="close" size={15} color="#FF4757" />
      </TouchableOpacity>
    </View>
  );

  const monthLabel = new Date(fromDate).toLocaleString('default', { month: 'long', year: 'numeric' });

  const ListHeader = () =>
    topVendors.length > 1 ? (
      <View style={styles.vendorCard}>
        <Text style={styles.vendorTitle}>Top Vendors</Text>
        {topVendors.map((v, idx) => (
          <View key={v.name} style={styles.vendorRow}>
            <Text style={styles.vendorRank}>#{idx + 1}</Text>
            <Text style={styles.vendorName} numberOfLines={1}>{v.name}</Text>
            <Text style={styles.vendorCount}>{v.count}x</Text>
            <Text style={styles.vendorTotal}>{formatCurrency(v.total)}</Text>
          </View>
        ))}
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{categoryName}</Text>
          <Text style={styles.subtitle}>{monthLabel}</Text>
        </View>
      </View>

      {loading && <ActivityIndicator color="#8257E6" style={{ marginVertical: 16 }} />}

      <FlatList
        data={transactions}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        ListHeaderComponent={loading ? null : <ListHeader />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 }}
        ListEmptyComponent={
          loading ? null : (
            <Text style={styles.empty}>
              No {categoryName} transactions in {monthLabel}.
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0D0D0D' },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  subtitle:    { fontSize: 12, color: '#6B6B6B', marginTop: 2 },

  vendorCard:  { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, marginBottom: 16, marginTop: 8, gap: 10 },
  vendorTitle: { fontSize: 11, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 1 },
  vendorRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vendorRank:  { fontSize: 12, color: '#4B4B4B', width: 22 },
  vendorName:  { flex: 1, fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  vendorCount: { fontSize: 12, color: '#6B6B6B' },
  vendorTotal: { fontSize: 14, fontWeight: '700', color: '#FF4757', minWidth: 70, textAlign: 'right' },

  item:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  badge:       { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  creditBadge: { backgroundColor: '#0D3320' },
  debitBadge:  { backgroundColor: '#3D0A0A' },
  badgeText:   { fontSize: 16, fontWeight: '700', color: '#FFF' },
  info:        { flex: 1 },
  merchant:    { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  date:        { fontSize: 11, color: '#6B6B6B', marginTop: 2 },
  amount:      { fontSize: 14, fontWeight: '700' },
  credit:      { color: '#00C896' },
  debit:       { color: '#FF4757' },
  actionBtn:   { padding: 6 },
  empty:       { textAlign: 'center', color: '#4B4B4B', paddingTop: 60, fontSize: 14, paddingHorizontal: 24 },
});
