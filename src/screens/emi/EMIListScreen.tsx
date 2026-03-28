import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmiStackParamList } from '../../navigation/types/navigation';
import { useEMI } from '../../hooks/useEMI';
import { useEmiStore } from '../../store/emiStore';
import { useUiStore } from '../../store/uiStore';
import { EMI } from '../../models/EMI';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDate, daysUntil } from '../../utils/dateUtils';
import { getDatabase } from '../../storage/database';
import { generateId } from '../../utils/generateId';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<EmiStackParamList, 'EMIList'>;
};

const STATUS_COLORS: Record<EMI['status'], string> = {
  active:    '#8257E6',
  completed: '#00C896',
  defaulted: '#FF4757',
  paused:    '#FFA502',
};

export default function EMIListScreen({ navigation }: Props) {
  const { emis, loading } = useEMI();
  const { addEmi, loadEmis } = useEmiStore();
  const { userId } = useUiStore();
  const [detecting, setDetecting] = useState(false);

  const handleAutoDetect = async () => {
    if (!userId) return;
    setDetecting(true);
    try {
      const db = await getDatabase();
      // Get all cat_emi debit transactions grouped by merchant
      const [result] = await db.executeSql(
        `SELECT merchant_name, person_name, bank_name, amount, transaction_date
         FROM transactions
         WHERE user_id=? AND category_id='cat_emi' AND type='debit'
         ORDER BY transaction_date ASC`,
        [userId],
      );

      // Group by merchant name
      const groups = new Map<string, { amount: number; dates: number[] }>();
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        const merchant: string = row.merchant_name || row.person_name || row.bank_name || 'Unknown Lender';
        const existing = groups.get(merchant);
        if (existing) {
          existing.dates.push(row.transaction_date);
        } else {
          groups.set(merchant, { amount: row.amount, dates: [row.transaction_date] });
        }
      }

      if (groups.size === 0) {
        Alert.alert('No EMI transactions found', 'Import your bank emails (Gmail) first so the app can find EMI payments.');
        return;
      }

      // Check which merchants are already tracked
      const existingNames = new Set(emis.map(e => e.lenderName.toLowerCase()));
      const newGroups = [...groups.entries()].filter(
        ([name]) => !existingNames.has(name.toLowerCase()),
      );

      if (newGroups.length === 0) {
        Alert.alert('All EMIs already tracked', 'No new EMI merchants found that aren\'t already in your tracker.');
        return;
      }

      const now = Date.now();
      let created = 0;
      for (const [merchant, { amount, dates }] of newGroups) {
        const paid = dates.length;
        const startDate = dates[0];
        const emi: EMI = {
          id:                  generateId(),
          userId,
          name:                merchant,
          lenderName:          merchant,
          principalAmount:     amount * 12,   // estimate: 1 year
          emiAmount:           amount,
          totalInstallments:   12,            // default estimate
          paidInstallments:    paid,
          startDate,
          nextDueDate:         now + 30 * 24 * 60 * 60 * 1000,
          endDate:             startDate + 12 * 30 * 24 * 60 * 60 * 1000,
          interestRate:        null,
          loanAccountNumber:   null,
          status:              'active',
          transactionIds:      [],
          detectedFromSms:     false,
          detectionConfidence: 0.7,
          reminderDaysBefore:  3,
          createdAt:           now,
          updatedAt:           now,
        };
        await addEmi(emi);
        created++;
      }

      await loadEmis(userId);
      Alert.alert(
        'Done',
        `${created} EMI(s) detected and added.\n\nOpen each one to update the total installments and loan amount if needed.`,
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Detection failed.');
    } finally {
      setDetecting(false);
    }
  };

  const renderItem = ({ item }: { item: EMI }) => {
    const progress = item.totalInstallments > 0
      ? item.paidInstallments / item.totalInstallments
      : 0;
    const days = daysUntil(item.nextDueDate);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('EMIDetail', { id: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.emiName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.lender}>{item.lenderName}</Text>

        <View style={styles.amounts}>
          <View>
            <Text style={styles.amtLabel}>Monthly EMI</Text>
            <Text style={styles.amtValue}>{formatCurrency(item.emiAmount)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amtLabel}>Next due</Text>
            <Text style={[styles.amtValue, days <= 3 && { color: '#FF4757' }]}>
              {days <= 0 ? 'Overdue' : `${days}d · ${formatDate(item.nextDueDate)}`}
            </Text>
          </View>
        </View>

        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
        <Text style={styles.progressText}>
          {item.paidInstallments}/{item.totalInstallments} installments paid
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Auto-detect banner */}
      <TouchableOpacity style={styles.detectBtn} onPress={handleAutoDetect} disabled={detecting}>
        {detecting
          ? <ActivityIndicator color="#8257E6" size="small" />
          : <MaterialIcons name="auto-fix-high" size={18} color="#8257E6" />
        }
        <Text style={styles.detectText}>
          {detecting ? 'Detecting…' : 'Auto-detect from Transactions'}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={emis}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          loading
            ? <Text style={styles.empty}>Loading...</Text>
            : <Text style={styles.empty}>No EMIs yet. Tap "Auto-detect" above or add one manually with the + button.</Text>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEMI', undefined)}
      >
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0D0D0D' },
  detectBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 0, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#3D2A6E' },
  detectText:  { fontSize: 14, color: '#8257E6', fontWeight: '600' },
  card:        { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 18, gap: 10 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emiName:     { fontSize: 17, fontWeight: '700', color: '#FFFFFF', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText:  { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  lender:      { fontSize: 13, color: '#6B6B6B' },
  amounts:     { flexDirection: 'row', justifyContent: 'space-between' },
  amtLabel:    { fontSize: 12, color: '#6B6B6B' },
  amtValue:    { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  progressBg:  { height: 6, backgroundColor: '#0D0D0D', borderRadius: 3 },
  progressFill:{ height: 6, backgroundColor: '#8257E6', borderRadius: 3 },
  progressText:{ fontSize: 12, color: '#6B6B6B' },
  empty:       { textAlign: 'center', color: '#4B4B4B', paddingTop: 60, fontSize: 14, paddingHorizontal: 32 },
  fab:         { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
