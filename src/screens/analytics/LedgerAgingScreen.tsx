import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useLedgerStore } from '../../store/ledgerStore';
import { useUiStore } from '../../store/uiStore';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDate } from '../../utils/dateUtils';
import { LedgerEntry } from '../../models/LedgerEntry';
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'LedgerAging'>;
};

function ageDays(entry: LedgerEntry): number {
  return Math.floor((Date.now() - entry.createdAt) / (1000 * 60 * 60 * 24));
}

function isOverdue(entry: LedgerEntry): boolean {
  if (!entry.dueDate) return false;
  return entry.dueDate < Date.now() && entry.status !== 'settled';
}

function ageBadgeColor(days: number): string {
  if (days > 90) return '#FF4757';
  if (days > 30) return '#FFA502';
  return '#00C896';
}

export default function LedgerAgingScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { lentEntries, loadLedger, settle } = useLedgerStore();
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await loadLedger(userId);
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Open and partially settled, sorted oldest first
  const openLent = lentEntries
    .filter(e => e.status !== 'settled')
    .sort((a, b) => a.createdAt - b.createdAt);

  const totalOutstanding = openLent.reduce((s, e) => s + (e.principalAmount - e.settledAmount), 0);
  const overdueCount = openLent.filter(isOverdue).length;

  const handleSettle = (entry: LedgerEntry) => {
    Alert.alert(
      `Settle with ${entry.personName}?`,
      `Mark the full outstanding amount (${formatCurrency(entry.principalAmount - entry.settledAmount)}) as settled?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle',
          onPress: async () => {
            await settle(entry.id, entry.principalAmount - entry.settledAmount, null);
            await load();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ledger Aging</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Outstanding</Text>
            <Text style={[styles.summaryValue, { color: '#8257E6' }]}>{formatCurrency(totalOutstanding)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Overdue</Text>
            <Text style={[styles.summaryValue, { color: overdueCount > 0 ? '#FF4757' : '#00C896' }]}>
              {overdueCount} entr{overdueCount !== 1 ? 'ies' : 'y'}
            </Text>
          </View>
        </View>

        {openLent.length === 0 ? (
          <Text style={styles.empty}>No open lent entries. You're all settled up!</Text>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Open Lent Entries (Oldest First)</Text>
            {openLent.map(entry => {
              const days = ageDays(entry);
              const overdue = isOverdue(entry);
              const outstanding = entry.principalAmount - entry.settledAmount;
              return (
                <View key={entry.id} style={[styles.entryCard, overdue && styles.overdueCard]}>
                  <View style={styles.entryHeader}>
                    <View style={styles.personRow}>
                      <View style={[styles.personIcon, { backgroundColor: overdue ? '#FF475733' : '#8257E633' }]}>
                        <MaterialIcons name="person" size={18} color={overdue ? '#FF4757' : '#8257E6'} />
                      </View>
                      <View>
                        <Text style={styles.personName}>{entry.personName}</Text>
                        {entry.personPhone && (
                          <Text style={styles.personPhone}>{entry.personPhone}</Text>
                        )}
                      </View>
                    </View>
                    <View style={[styles.ageBadge, { backgroundColor: ageBadgeColor(days) + '33' }]}>
                      <Text style={[styles.ageText, { color: ageBadgeColor(days) }]}>
                        {days}d old
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.description}>{entry.description}</Text>

                  <View style={styles.amountRow}>
                    <View>
                      <Text style={styles.amountLabel}>Principal</Text>
                      <Text style={styles.principalAmount}>{formatCurrency(entry.principalAmount)}</Text>
                    </View>
                    {entry.settledAmount > 0 && (
                      <View>
                        <Text style={styles.amountLabel}>Settled</Text>
                        <Text style={[styles.settledAmount, { color: '#00C896' }]}>{formatCurrency(entry.settledAmount)}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.amountLabel}>Outstanding</Text>
                      <Text style={styles.outstandingAmount}>{formatCurrency(outstanding)}</Text>
                    </View>
                  </View>

                  <View style={styles.entryFooter}>
                    <View>
                      <Text style={styles.dateText}>Lent: {formatDate(entry.createdAt)}</Text>
                      {entry.dueDate && (
                        <Text style={[styles.dueDateText, { color: overdue ? '#FF4757' : '#FFA502' }]}>
                          Due: {formatDate(entry.dueDate)} {overdue ? '(OVERDUE)' : ''}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity style={styles.settleBtn} onPress={() => handleSettle(entry)}>
                      <MaterialIcons name="check-circle-outline" size={14} color="#00C896" />
                      <Text style={styles.settleBtnText}>Settle</Text>
                    </TouchableOpacity>
                  </View>

                  {entry.status === 'partially_settled' && (
                    <View style={styles.partialBadge}>
                      <Text style={styles.partialText}>Partially Settled</Text>
                    </View>
                  )}
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
  summaryRow:      { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginVertical: 16 },
  summaryCard:     { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14 },
  summaryLabel:    { fontSize: 11, color: '#6B6B6B', marginBottom: 4 },
  summaryValue:    { fontSize: 20, fontWeight: '700' },
  section:         { paddingHorizontal: 20, paddingBottom: 30 },
  sectionTitle:    { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  entryCard:       { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'transparent' },
  overdueCard:     { borderColor: '#FF475755' },
  entryHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  personRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personIcon:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  personName:      { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  personPhone:     { fontSize: 11, color: '#6B6B6B' },
  ageBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  ageText:         { fontSize: 12, fontWeight: '700' },
  description:     { fontSize: 12, color: '#ABABAB', marginBottom: 12 },
  amountRow:       { flexDirection: 'row', gap: 16, marginBottom: 12 },
  amountLabel:     { fontSize: 10, color: '#6B6B6B', marginBottom: 2 },
  principalAmount: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  settledAmount:   { fontSize: 14, fontWeight: '600' },
  outstandingAmount:{ fontSize: 15, fontWeight: '700', color: '#8257E6' },
  entryFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  dateText:        { fontSize: 11, color: '#4B4B4B' },
  dueDateText:     { fontSize: 11, fontWeight: '600', marginTop: 2 },
  settleBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00C89622', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  settleBtnText:   { fontSize: 12, color: '#00C896', fontWeight: '700' },
  partialBadge:    { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#FFA50222', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  partialText:     { fontSize: 10, color: '#FFA502', fontWeight: '600' },
  empty:           { color: '#4B4B4B', textAlign: 'center', paddingTop: 80, fontSize: 15, paddingHorizontal: 40 },
});
