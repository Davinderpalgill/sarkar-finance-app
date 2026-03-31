import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { TransactionRepository } from '../../storage/repositories/TransactionRepository';
import { useTransactionStore, AccountSummary } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { formatCurrency, formatCurrencyCompact } from '../../utils/currencyUtils';
import { formatDate } from '../../utils/dateUtils';
import { Transaction } from '../../models/Transaction';
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'CashFlowCalendar'>;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_OF_WEEK = ['S','M','T','W','T','F','S'];

export default function CashFlowCalendarScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getAccounts } = useTransactionStore();
  const [refreshing,       setRefreshing]       = useState(false);
  const [dayData,          setDayData]          = useState<Record<string, { debit: number; txns: Transaction[] }>>({});
  const [selectedDay,      setSelectedDay]      = useState<string | null>(null);
  const [modalTxns,        setModalTxns]        = useState<Transaction[]>([]);
  const [accounts,         setAccounts]         = useState<AccountSummary[]>([]);
  const [selectedAccount,  setSelectedAccount]  = useState<AccountSummary | null>(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based

  useEffect(() => {
    getAccounts(userId).then(setAccounts);
  }, [userId]);

  const load = useCallback(async () => {
    const from = new Date(year, month - 1, 1).getTime();
    const to = new Date(year, month, 0, 23, 59, 59, 999).getTime();
    const txns = await TransactionRepository.findByUser(userId, {
      fromDate: from,
      toDate: to,
      limit: 500,
      ...(selectedAccount ? { bankName: selectedAccount.bankName, accountLast4: selectedAccount.accountLast4 } : {}),
    });
    const map: Record<string, { debit: number; txns: Transaction[] }> = {};
    txns.forEach(tx => {
      const d = new Date(tx.transactionDate);
      const key = String(d.getDate()).padStart(2, '0');
      if (!map[key]) map[key] = { debit: 0, txns: [] };
      if (tx.type === 'debit') map[key].debit += tx.amount;
      map[key].txns.push(tx);
    });
    setDayData(map);
  }, [userId, year, month, selectedAccount]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const changeMonth = (delta: number) => {
    let newM = month + delta;
    let newY = year;
    if (newM > 12) { newM = 1; newY++; }
    if (newM < 1) { newM = 12; newY--; }
    setMonth(newM); setYear(newY);
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const maxDebit = Math.max(...Object.values(dayData).map(d => d.debit), 1);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const openDay = (day: number) => {
    const key = String(day).padStart(2, '0');
    const d = dayData[key];
    if (d && d.txns.length > 0) {
      setModalTxns(d.txns.sort((a, b) => b.transactionDate - a.transactionDate));
      setSelectedDay(key);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cash Flow Calendar</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Month picker */}
        <View style={styles.monthPicker}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
            <MaterialIcons name="chevron-left" size={24} color="#8257E6" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[month - 1]} {year}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
            <MaterialIcons name="chevron-right" size={24} color="#8257E6" />
          </TouchableOpacity>
        </View>

        {/* Account filter tabs */}
        {accounts.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountRow}
            style={{ marginBottom: 12 }}
          >
            <TouchableOpacity
              style={[styles.accountChip, !selectedAccount && styles.accountChipActive]}
              onPress={() => setSelectedAccount(null)}
            >
              <Text style={[styles.accountChipText, !selectedAccount && styles.accountChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {accounts.map(acct => {
              const key = `${acct.bankName}|${acct.accountLast4 ?? ''}`;
              const active = selectedAccount
                ? `${selectedAccount.bankName}|${selectedAccount.accountLast4 ?? ''}` === key
                : false;
              const label = acct.accountLast4
                ? `${acct.bankName} ••${acct.accountLast4}`
                : acct.bankName;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.accountChip, active && styles.accountChipActive]}
                  onPress={() => setSelectedAccount(active ? null : acct)}
                >
                  <Text style={[styles.accountChipText, active && styles.accountChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Calendar */}
        <View style={styles.calendarCard}>
          {/* Day headers */}
          <View style={styles.weekRow}>
            {DAYS_OF_WEEK.map((d, i) => (
              <Text key={i} style={styles.dayHeader}>{d}</Text>
            ))}
          </View>
          {/* Cells */}
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={`e-${i}`} style={styles.cell} />;
              const key = String(day).padStart(2, '0');
              const d = dayData[key];
              const intensity = d ? Math.min(d.debit / maxDebit, 1) : 0;
              const bg = intensity > 0
                ? `rgba(239,68,68,${0.15 + intensity * 0.75})`
                : '#1A1A1A';
              const isToday = year === now.getFullYear() && month === now.getMonth() + 1 && day === now.getDate();
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.cell, { backgroundColor: bg }, isToday && styles.todayCell]}
                  onPress={() => openDay(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayNum, isToday && styles.todayNum]}>{day}</Text>
                  {d && d.debit > 0 && (
                    <Text style={styles.dayCost}>{formatCurrencyCompact(d.debit)}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendLabel}>Low spend</Text>
          {[0.15, 0.35, 0.55, 0.75, 0.9].map(o => (
            <View key={o} style={[styles.legendBox, { backgroundColor: `rgba(239,68,68,${o})` }]} />
          ))}
          <Text style={styles.legendLabel}>High spend</Text>
        </View>
      </ScrollView>

      {/* Day detail modal */}
      <Modal visible={selectedDay !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDay && `${MONTHS[month - 1]} ${parseInt(selectedDay, 10)}, ${year}`}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <MaterialIcons name="close" size={22} color="#ABABAB" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {modalTxns.map(tx => (
                <View key={tx.id} style={styles.txRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txMerchant}>{tx.merchantName ?? tx.bankName}</Text>
                    <Text style={styles.txTime}>{formatDate(tx.transactionDate, 'hh:mm a')}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: tx.type === 'debit' ? '#FF4757' : '#00C896' }]}>
                    {tx.type === 'debit' ? '-' : '+'}{formatCurrency(tx.amount)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0D0D0D' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  monthPicker:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  monthBtn:     { padding: 8 },
  monthLabel:   { fontSize: 16, fontWeight: '600', color: '#FFFFFF', minWidth: 130, textAlign: 'center' },
  calendarCard: { marginHorizontal: 20, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 12, marginBottom: 16 },
  weekRow:      { flexDirection: 'row', marginBottom: 4 },
  dayHeader:    { flex: 1, textAlign: 'center', fontSize: 11, color: '#4B4B4B', fontWeight: '600' },
  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  cell:         { width: '14.28%', aspectRatio: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 2, padding: 2 },
  todayCell:    { borderWidth: 1, borderColor: '#8257E6' },
  dayNum:       { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  todayNum:     { color: '#8257E6' },
  dayCost:      { fontSize: 8, color: '#FCA5A5' },
  legend:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingBottom: 20 },
  legendLabel:  { fontSize: 11, color: '#4B4B4B' },
  legendBox:    { width: 14, height: 14, borderRadius: 3 },
  accountRow:         { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  accountChip:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#2C2C2C', backgroundColor: '#1A1A1A' },
  accountChipActive:  { backgroundColor: '#8257E6', borderColor: '#8257E6' },
  accountChipText:    { fontSize: 13, color: '#ABABAB', fontWeight: '500' },
  accountChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  txRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2C2C2C' },
  txMerchant:   { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  txTime:       { fontSize: 11, color: '#6B6B6B', marginTop: 2 },
  txAmount:     { fontSize: 14, fontWeight: '700' },
});
