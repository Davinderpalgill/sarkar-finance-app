import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert, TextInput, Modal
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { LedgerStackParamList } from '../../navigation/types/navigation';
import { LedgerEntry } from '../../models/LedgerEntry';
import { useLedgerStore } from '../../store/ledgerStore';
import { formatCurrency, rupeesToPaise } from '../../utils/currencyUtils';
import { formatDate, formatDateTime } from '../../utils/dateUtils';

type Props = {
  navigation: NativeStackNavigationProp<LedgerStackParamList, 'LedgerDetail'>;
  route:      RouteProp<LedgerStackParamList, 'LedgerDetail'>;
};

export default function LedgerDetailScreen({ route }: Props) {
  const { getEntry, settle } = useLedgerStore();
  const [entry, setEntry] = useState<LedgerEntry | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [showSettleModal, setShowSettleModal] = useState(false);

  const load = async () => {
    const e = await getEntry(route.params.id);
    setEntry(e);
  };

  useEffect(() => { load(); }, [route.params.id]);

  if (!entry) return null;

  const handleSettle = async () => {
    const amount = rupeesToPaise(settleAmount);
    if (amount <= 0) {
      Alert.alert('Invalid amount');
      return;
    }
    await settle(entry.id, amount, null, settleNote);
    setShowSettleModal(false);
    await load();
  };

  const isSettled = entry.status === 'settled';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={[styles.hero, entry.direction === 'lent' ? styles.lentHero : styles.borrowHero]}>
          <Text style={styles.heroDir}>{entry.direction === 'lent' ? 'You Lent' : 'You Borrowed'}</Text>
          <Text style={styles.heroAmount}>{formatCurrency(entry.outstandingAmount)}</Text>
          <Text style={styles.heroPerson}>{entry.personName}</Text>
          {entry.dueDate && <Text style={styles.heroDue}>Due {formatDate(entry.dueDate)}</Text>}
        </View>

        {/* Info */}
        <View style={styles.card}>
          <Row label="Principal"   value={formatCurrency(entry.principalAmount)} />
          <Row label="Settled"     value={formatCurrency(entry.settledAmount)} />
          <Row label="Outstanding" value={formatCurrency(entry.outstandingAmount)} />
          <Row label="Status"      value={entry.status.replace('_', ' ')} />
          {entry.personPhone && <Row label="Phone" value={entry.personPhone} />}
          {entry.personUpiId && <Row label="UPI"   value={entry.personUpiId} />}
          <Row label="Description" value={entry.description} />
          <Row label="Added"       value={formatDateTime(entry.createdAt)} />
        </View>

        {/* Settlement history */}
        {entry.settlementHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Settlement History</Text>
            {entry.settlementHistory.map(s => (
              <View key={s.id} style={styles.settleRow}>
                <Text style={styles.settleDate}>{formatDate(s.settledAt)}</Text>
                <Text style={styles.settleAmount}>{formatCurrency(s.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Settle button */}
        {!isSettled && (
          <TouchableOpacity style={styles.settleBtn} onPress={() => setShowSettleModal(true)}>
            <Text style={styles.settleBtnText}>Record Settlement</Text>
          </TouchableOpacity>
        )}
        {isSettled && (
          <View style={styles.settledBanner}>
            <Text style={styles.settledText}>Fully Settled ✓</Text>
          </View>
        )}
      </ScrollView>

      {/* Settle modal */}
      <Modal visible={showSettleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Record Settlement</Text>
            <TextInput
              style={styles.modalInput}
              value={settleAmount}
              onChangeText={setSettleAmount}
              placeholder="Amount (₹)"
              placeholderTextColor="#4B4B4B"
              keyboardType="numeric"
            />
            <TextInput
              style={styles.modalInput}
              value={settleNote}
              onChangeText={setSettleNote}
              placeholder="Note (optional)"
              placeholderTextColor="#4B4B4B"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowSettleModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSettle}>
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0D0D0D' },
  content:         { padding: 16, gap: 16 },
  hero:            { borderRadius: 20, padding: 28, alignItems: 'center', gap: 6 },
  lentHero:        { backgroundColor: '#0D3320' },
  borrowHero:      { backgroundColor: '#3D0A0A' },
  heroDir:         { color: '#86EFAC', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  heroAmount:      { color: '#FFF', fontSize: 36, fontWeight: '800' },
  heroPerson:      { color: '#ABABAB', fontSize: 16 },
  heroDue:         { color: '#FCA5A5', fontSize: 13 },
  card:            { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, gap: 12 },
  cardTitle:       { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  row:             { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel:        { color: '#6B6B6B', fontSize: 14 },
  rowValue:        { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  settleRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  settleDate:      { color: '#ABABAB', fontSize: 14 },
  settleAmount:    { color: '#00C896', fontSize: 14, fontWeight: '700' },
  settleBtn:       { backgroundColor: '#8257E6', padding: 18, borderRadius: 14, alignItems: 'center' },
  settleBtnText:   { color: '#FFF', fontSize: 17, fontWeight: '700' },
  settledBanner:   { backgroundColor: '#0D3320', padding: 16, borderRadius: 14, alignItems: 'center' },
  settledText:     { color: '#00C896', fontSize: 16, fontWeight: '700' },
  modalOverlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet:      { backgroundColor: '#1A1A1A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 16 },
  modalTitle:      { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  modalInput:      { backgroundColor: '#0D0D0D', color: '#FFFFFF', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  modalBtns:       { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel:     { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#2C2C2C' },
  modalCancelText: { color: '#ABABAB', fontWeight: '600' },
  modalConfirm:    { flex: 1, backgroundColor: '#8257E6', padding: 14, borderRadius: 10, alignItems: 'center' },
  modalConfirmText:{ color: '#FFF', fontWeight: '700' },
});
