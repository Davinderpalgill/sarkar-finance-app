import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { EmiStackParamList } from '../../navigation/types/navigation';
import { useEmiStore } from '../../store/emiStore';
import { useUiStore } from '../../store/uiStore';
import { generateId } from '../../utils/generateId';
import { EMI } from '../../models/EMI';

type Props = {
  navigation: NativeStackNavigationProp<EmiStackParamList, 'AddEMI'>;
  route:      RouteProp<EmiStackParamList, 'AddEMI'>;
};

export default function AddEMIScreen({ navigation, route }: Props) {
  const { userId } = useUiStore();
  const { addEmi } = useEmiStore();
  const prefill = route.params?.prefill;

  const [name,              setName]              = useState(prefill?.name ?? '');
  const [lenderName,        setLenderName]        = useState(prefill?.merchantName ?? '');
  const [emiAmount,         setEmiAmount]         = useState(prefill ? String(Math.round(prefill.emiAmount / 100)) : '');
  const [totalAmount,       setTotalAmount]       = useState('');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [paidInstallments,  setPaidInstallments]  = useState('0');
  const [saving,            setSaving]            = useState(false);

  const handleSave = async () => {
    if (!name.trim())              return Alert.alert('Required', 'Enter a loan name.');
    if (!lenderName.trim())        return Alert.alert('Required', 'Enter the lender name.');
    if (!emiAmount || isNaN(Number(emiAmount)) || Number(emiAmount) <= 0)
      return Alert.alert('Required', 'Enter a valid EMI amount.');
    if (!totalInstallments || isNaN(Number(totalInstallments)) || Number(totalInstallments) <= 0)
      return Alert.alert('Required', 'Enter total number of installments.');

    const emiPaise   = Math.round(Number(emiAmount) * 100);
    const totalPaise = totalAmount
      ? Math.round(Number(totalAmount) * 100)
      : emiPaise * Number(totalInstallments);
    const paid  = Math.max(0, Math.min(Number(paidInstallments), Number(totalInstallments)));
    const total = Number(totalInstallments);

    const now       = Date.now();
    const startDate = now - paid * 30 * 24 * 60 * 60 * 1000;
    const nextDue   = now + 30 * 24 * 60 * 60 * 1000;
    const endDate   = startDate + total * 30 * 24 * 60 * 60 * 1000;

    const emi: EMI = {
      id:                  generateId(),
      userId:              userId!,
      name:                name.trim(),
      lenderName:          lenderName.trim(),
      principalAmount:     totalPaise,
      emiAmount:           emiPaise,
      totalInstallments:   total,
      paidInstallments:    paid,
      startDate,
      nextDueDate:         nextDue,
      endDate,
      interestRate:        null,
      loanAccountNumber:   null,
      status:              paid >= total ? 'completed' : 'active',
      transactionIds:      [],
      detectedFromSms:     false,
      detectionConfidence: 0,
      reminderDaysBefore:  3,
      createdAt:           now,
      updatedAt:           now,
    };

    setSaving(true);
    try {
      await addEmi(emi);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save EMI.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <Field label="Loan / EMI Name" placeholder="e.g. Home Loan, Car Loan" value={name} onChangeText={setName} />
          <Field label="Lender / Bank Name" placeholder="e.g. HDFC Bank, Bajaj Finance" value={lenderName} onChangeText={setLenderName} />
          <Field label="Monthly EMI (₹)" placeholder="e.g. 12500" value={emiAmount} onChangeText={setEmiAmount} keyboardType="numeric" />
          <Field label="Total Loan Amount (₹) — optional" placeholder="Leave blank to auto-calculate" value={totalAmount} onChangeText={setTotalAmount} keyboardType="numeric" />
          <Field label="Total Installments" placeholder="e.g. 24" value={totalInstallments} onChangeText={setTotalInstallments} keyboardType="numeric" />
          <Field label="Installments Already Paid" placeholder="e.g. 3" value={paidInstallments} onChangeText={setPaidInstallments} keyboardType="numeric" />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save EMI'}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, placeholder, value, onChangeText, keyboardType }: {
  label: string; placeholder: string; value: string;
  onChangeText: (t: string) => void; keyboardType?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#4B4B4B"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        returnKeyType="next"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content:   { padding: 20, gap: 16, paddingBottom: 40 },
  field:     { gap: 6 },
  label:     { fontSize: 12, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 },
  input:     { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, fontSize: 15, color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2C' },
  saveBtn:   { backgroundColor: '#8257E6', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
