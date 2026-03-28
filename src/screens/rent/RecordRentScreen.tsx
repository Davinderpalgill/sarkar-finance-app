import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RentStackParamList } from '../../navigation/types/navigation';
import { useRentStore } from '../../store/rentStore';
import { useUiStore } from '../../store/uiStore';
import { RentRepository } from '../../storage/repositories/RentRepository';
import { RentRecord, PaymentMode, ExtraCharge } from '../../models/RentRecord';
import { RentTenant } from '../../models/RentTenant';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<RentStackParamList, 'RecordRent'>;
  route: RouteProp<RentStackParamList, 'RecordRent'>;
};

function formatRupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

const MODES: PaymentMode[] = ['cash', 'upi', 'bank', 'mapped'];
const MODE_LABELS: Record<PaymentMode, string> = {
  cash: 'Cash', upi: 'UPI', bank: 'Bank Transfer', mapped: 'Mapped Transaction',
};

const CHARGE_PRESETS = ['Electricity', 'Water', 'Food', 'Internet', 'Maintenance', 'Other'];

type ChargeInput = { label: string; amount: string };

export default function RecordRentScreen({ navigation, route }: Props) {
  const { recordId, tenantId } = route.params;
  const userId = useUiStore(s => s.userId);
  const { records, recordPayment } = useRentStore();

  const [record, setRecord] = useState<RentRecord | null>(null);
  const [tenant, setTenant] = useState<RentTenant | null>(null);
  const [amount, setAmount] = useState('');
  const [lateFee, setLateFee] = useState('0');
  const [extraCharges, setExtraCharges] = useState<ChargeInput[]>([]);
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [note, setNote] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const rec = records.find(r => r.id === recordId) ?? await RentRepository.getRecordById(recordId);
      if (rec) {
        setRecord(rec);
        setAmount(String(rec.amountDue / 100));
        setLateFee(String((rec.lateFee ?? 0) / 100));
        setExtraCharges((rec.extraCharges ?? []).map(c => ({ label: c.label, amount: String(c.amount / 100) })));
        if (userId) {
          const sugg = await RentRepository.getSuggestedTransactions(userId, rec.amountDue, rec.month);
          setSuggestions(sugg);
        }
      }
      const t = await RentRepository.getTenantById(tenantId);
      setTenant(t);
    })();
  }, [recordId]);

  const addPreset = (label: string) => {
    setExtraCharges(prev => [...prev, { label, amount: '' }]);
  };

  const removeCharge = (index: number) => {
    setExtraCharges(prev => prev.filter((_, i) => i !== index));
  };

  const updateCharge = (index: number, field: 'label' | 'amount', value: string) => {
    setExtraCharges(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    if (!record) return;
    const amountPaise = Math.round(parseFloat(amount || '0') * 100);
    if (amountPaise <= 0) { Alert.alert('Error', 'Enter a valid payment amount.'); return; }
    const lateFeePaise = Math.round(parseFloat(lateFee || '0') * 100);
    const charges: ExtraCharge[] = extraCharges
      .filter(c => c.label.trim() && parseFloat(c.amount || '0') > 0)
      .map(c => ({ label: c.label.trim(), amount: Math.round(parseFloat(c.amount) * 100) }));

    try {
      await recordPayment(record.id, amountPaise, mode, selectedTxId ?? undefined, note || undefined, lateFeePaise, charges);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to record payment.');
    }
  };

  const selectSuggestion = (tx: any) => {
    setAmount(String(tx.amount / 100));
    setMode('mapped');
    setSelectedTxId(tx.id);
  };

  if (!record) return null;

  const lateFeePaise   = Math.round(parseFloat(lateFee || '0') * 100);
  const extraTotal     = extraCharges.reduce((s, c) => s + Math.round(parseFloat(c.amount || '0') * 100), 0);
  const grandTotal     = record.amountDue + lateFeePaise + extraTotal;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Record Payment</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveBtn}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>

          {/* Summary card */}
          <View style={styles.summaryCard}>
            <Text style={styles.tenantName}>{tenant?.name ?? '—'}</Text>
            <Text style={styles.monthText}>{record.month}</Text>
            <View style={styles.summaryLines}>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLineLabel}>Base Rent</Text>
                <Text style={styles.summaryLineValue}>{formatRupees(record.amountDue)}</Text>
              </View>
              {lateFeePaise > 0 && (
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLineLabel}>Late Fee</Text>
                  <Text style={[styles.summaryLineValue, { color: '#FF4757' }]}>{formatRupees(lateFeePaise)}</Text>
                </View>
              )}
              {extraCharges.filter(c => parseFloat(c.amount || '0') > 0).map((c, i) => (
                <View key={i} style={styles.summaryLine}>
                  <Text style={styles.summaryLineLabel}>{c.label || 'Extra'}</Text>
                  <Text style={styles.summaryLineValue}>{formatRupees(Math.round(parseFloat(c.amount) * 100))}</Text>
                </View>
              ))}
              <View style={[styles.summaryLine, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Total Due</Text>
                <Text style={styles.summaryTotalValue}>{formatRupees(grandTotal)}</Text>
              </View>
            </View>
            {record.amountPaid > 0 && (
              <Text style={styles.paidText}>Already Paid: {formatRupees(record.amountPaid)}</Text>
            )}
          </View>

          {/* Payment amount */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Payment Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
              placeholderTextColor="#4B4B4B"
            />
          </View>

          {/* Late fee */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Late Fee (₹)</Text>
            <TextInput
              style={styles.input}
              value={lateFee}
              onChangeText={setLateFee}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#4B4B4B"
            />
          </View>

          {/* Extra charges */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Extra Charges</Text>
            <View style={styles.presetRow}>
              {CHARGE_PRESETS.map(p => (
                <TouchableOpacity key={p} style={styles.presetChip} onPress={() => addPreset(p)}>
                  <MaterialIcons name="add" size={12} color="#8257E6" />
                  <Text style={styles.presetChipText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {extraCharges.map((c, i) => (
              <View key={i} style={styles.chargeRow}>
                <TextInput
                  style={[styles.input, styles.chargeLabelInput]}
                  value={c.label}
                  onChangeText={v => updateCharge(i, 'label', v)}
                  placeholder="Label"
                  placeholderTextColor="#4B4B4B"
                />
                <TextInput
                  style={[styles.input, styles.chargeAmountInput]}
                  value={c.amount}
                  onChangeText={v => updateCharge(i, 'amount', v)}
                  keyboardType="numeric"
                  placeholder="₹0"
                  placeholderTextColor="#4B4B4B"
                />
                <TouchableOpacity onPress={() => removeCharge(i)} style={styles.removeChargeBtn}>
                  <MaterialIcons name="close" size={18} color="#FF4757" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Payment mode */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Payment Mode</Text>
            <View style={styles.modeRow}>
              {MODES.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                  onPress={() => setMode(m)}
                >
                  <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                    {MODE_LABELS[m]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Note */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Paid via NEFT"
              placeholderTextColor="#4B4B4B"
            />
          </View>

          {/* Suggested transactions */}
          {suggestions.length > 0 && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Suggested Matching Transactions</Text>
              <Text style={styles.sublabel}>Credit transactions within ±10% of due amount</Text>
              {suggestions.map(tx => (
                <TouchableOpacity
                  key={tx.id}
                  style={[styles.txCard, selectedTxId === tx.id && styles.txCardSelected]}
                  onPress={() => selectSuggestion(tx)}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={styles.txName}>{tx.merchant_name ?? tx.person_name ?? tx.bank_name}</Text>
                    <Text style={styles.txDate}>{new Date(tx.transaction_date).toLocaleDateString('en-IN')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.txAmount}>{formatRupees(tx.amount)}</Text>
                    {selectedTxId === tx.id && (
                      <MaterialIcons name="check-circle" size={16} color="#00C896" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0D0D0D' },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title:              { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  saveBtn:            { fontSize: 16, fontWeight: '700', color: '#8257E6' },
  content:            { padding: 16, gap: 20, paddingBottom: 60 },

  // Summary card
  summaryCard:        { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, gap: 10 },
  tenantName:         { fontSize: 18, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  monthText:          { fontSize: 13, color: '#6B6B6B', textAlign: 'center', marginBottom: 4 },
  summaryLines:       { gap: 6, borderTopWidth: 1, borderTopColor: '#2C2C2C', paddingTop: 10 },
  summaryLine:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLineLabel:   { fontSize: 13, color: '#6B6B6B' },
  summaryLineValue:   { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  summaryTotal:       { borderTopWidth: 1, borderTopColor: '#2C2C2C', paddingTop: 8, marginTop: 2 },
  summaryTotalLabel:  { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  summaryTotalValue:  { fontSize: 18, fontWeight: '800', color: '#8257E6' },
  paidText:           { fontSize: 13, color: '#00C896', textAlign: 'center' },

  // Fields
  fieldGroup:         { gap: 8 },
  label:              { fontSize: 13, color: '#6B6B6B', fontWeight: '600' },
  sublabel:           { fontSize: 12, color: '#4B4B4B', marginTop: -4 },
  input:              { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2C2C2C' },

  // Extra charges
  presetRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8257E622', borderRadius: 10, borderWidth: 1, borderColor: '#8257E644', paddingHorizontal: 10, paddingVertical: 6 },
  presetChipText:     { fontSize: 12, color: '#8257E6', fontWeight: '600' },
  chargeRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chargeLabelInput:   { flex: 1 },
  chargeAmountInput:  { width: 90 },
  removeChargeBtn:    { padding: 6 },

  // Payment mode
  modeRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeBtn:            { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  modeBtnActive:      { backgroundColor: '#8257E6', borderColor: '#8257E6' },
  modeBtnText:        { fontSize: 13, color: '#6B6B6B', fontWeight: '600' },
  modeBtnTextActive:  { color: '#FFFFFF' },

  // Suggestions
  txCard:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2C2C2C' },
  txCardSelected:     { borderColor: '#00C896' },
  txName:             { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  txDate:             { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  txAmount:           { fontSize: 15, fontWeight: '800', color: '#00C896' },
});
