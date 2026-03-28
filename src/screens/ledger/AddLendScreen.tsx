import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TextInput, TouchableOpacity, Alert
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LedgerStackParamList } from '../../navigation/types/navigation';
import { LedgerEntry, LedgerDirection } from '../../models/LedgerEntry';
import { useLedgerStore } from '../../store/ledgerStore';
import { useUiStore } from '../../store/uiStore';
import { rupeesToPaise } from '../../utils/currencyUtils';
import { generateId } from '../../utils/generateId';

type Props = {
  navigation: NativeStackNavigationProp<LedgerStackParamList, 'AddLend'>;
};

export default function AddLendScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { addEntry } = useLedgerStore();

  const [direction, setDirection] = useState<LedgerDirection>('lent');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!personName.trim()) { Alert.alert('Enter person name'); return; }
    const paise = rupeesToPaise(amount);
    if (paise <= 0) { Alert.alert('Enter valid amount'); return; }

    setSaving(true);
    const now = Date.now();
    let dueDateMs: number | null = null;
    if (dueDate) {
      const parsed = new Date(dueDate).getTime();
      if (!isNaN(parsed)) dueDateMs = parsed;
    }

    const entry: LedgerEntry = {
      id: generateId(),
      userId,
      direction,
      personName: personName.trim(),
      personPhone: personPhone.trim() || null,
      personUpiId: null,
      principalAmount: paise,
      settledAmount: 0,
      outstandingAmount: paise,
      transactionId: null,
      description: description.trim() || `${direction === 'lent' ? 'Lent to' : 'Borrowed from'} ${personName}`,
      status: 'open',
      dueDate: dueDateMs,
      reminders: [],
      settlementHistory: [],
      syncedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await addEntry(entry);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          {(['lent', 'borrowed'] as LedgerDirection[]).map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.typeBtn, direction === d && styles.typeBtnActive]}
              onPress={() => setDirection(d)}
            >
              <Text style={[styles.typeBtnText, direction === d && styles.typeBtnTextActive]}>
                {d === 'lent' ? 'I Lent' : 'I Borrowed'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Person Name</Text>
        <TextInput style={styles.input} value={personName} onChangeText={setPersonName} placeholder="e.g. Rahul Sharma" placeholderTextColor="#4B4B4B" autoCapitalize="words" />

        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput style={styles.input} value={personPhone} onChangeText={setPersonPhone} placeholder="+91 XXXXX XXXXX" placeholderTextColor="#4B4B4B" keyboardType="phone-pad" />

        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#4B4B4B" keyboardType="numeric" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="e.g. Rent advance" placeholderTextColor="#4B4B4B" />

        <Text style={styles.label}>Due Date (optional, YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="2025-12-31" placeholderTextColor="#4B4B4B" />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Add Entry'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0D0D0D' },
  content:          { padding: 24, gap: 8 },
  label:            { fontSize: 14, color: '#ABABAB', marginTop: 16, marginBottom: 4 },
  input:            { backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  typeRow:          { flexDirection: 'row', gap: 12 },
  typeBtn:          { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2C2C2C', alignItems: 'center' },
  typeBtnActive:    { backgroundColor: '#8257E6', borderColor: '#8257E6' },
  typeBtnText:      { color: '#ABABAB', fontSize: 15 },
  typeBtnTextActive:{ color: '#FFF', fontWeight: '600' },
  saveBtn:          { backgroundColor: '#8257E6', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 32 },
  disabled:         { opacity: 0.6 },
  saveBtnText:      { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
