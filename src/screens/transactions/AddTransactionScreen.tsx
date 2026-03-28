import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TextInput, TouchableOpacity, Alert
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TransactionStackParamList } from '../../navigation/types/navigation';
import { Transaction, TransactionType } from '../../models/Transaction';
import { TransactionRepository } from '../../storage/repositories/TransactionRepository';
import { useTransactionStore } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { rupeesToPaise } from '../../utils/currencyUtils';
import { generateId } from '../../utils/generateId';

type Props = {
  navigation: NativeStackNavigationProp<TransactionStackParamList, 'AddTransaction'>;
};

export default function AddTransactionScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { addTransaction } = useTransactionStore();

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('debit');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const paise = rupeesToPaise(amount);
    if (paise <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }
    setSaving(true);
    const now = Date.now();
    const tx: Transaction = {
      id: generateId(),
      userId,
      amount: paise,
      type,
      categoryId: null,
      categoryConfidence: 0,
      merchantType: 'unknown',
      merchantName: merchant || null,
      personName: null,
      bankName: 'Manual',
      accountLast4: null,
      availableBalance: null,
      rawSms: '',
      smsId: `manual_${generateId()}`,
      senderAddress: 'MANUAL',
      parsedAt: now,
      transactionDate: now,
      referenceNumber: null,
      upiId: null,
      isEmi: false,
      emiId: null,
      isSplit: false,
      splitId: null,
      isLedger: false,
      ledgerEntryId: null,
      tags: [],
      note: note || null,
      source: 'manual',
      syncedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await TransactionRepository.insert(tx);
      addTransaction(tx);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Transaction</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor="#4B4B4B"
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          {(['debit', 'credit'] as TransactionType[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, type === t && styles.typeBtnActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Merchant / Person</Text>
        <TextInput
          style={styles.input}
          value={merchant}
          onChangeText={setMerchant}
          placeholder="e.g. Swiggy"
          placeholderTextColor="#4B4B4B"
        />

        <Text style={styles.label}>Note</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          onChangeText={setNote}
          placeholder="Optional note..."
          placeholderTextColor="#4B4B4B"
          multiline
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Add Transaction'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0D0D0D' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:      { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  cancelBtn:        { paddingHorizontal: 8, paddingVertical: 8 },
  cancelText:       { fontSize: 15, color: '#8257E6', fontWeight: '600' },
  content:          { padding: 24, gap: 8 },
  label:            { fontSize: 14, color: '#ABABAB', marginTop: 16, marginBottom: 4 },
  input:            { backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  noteInput:        { minHeight: 80 },
  typeRow:          { flexDirection: 'row', gap: 12 },
  typeBtn:          { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2C2C2C', alignItems: 'center' },
  typeBtnActive:    { backgroundColor: '#8257E6', borderColor: '#8257E6' },
  typeBtnText:      { color: '#ABABAB', fontSize: 15 },
  typeBtnTextActive:{ color: '#FFF', fontWeight: '600' },
  saveBtn:          { backgroundColor: '#8257E6', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 32 },
  disabled:         { opacity: 0.6 },
  saveBtnText:      { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
