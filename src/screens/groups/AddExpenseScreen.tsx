import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TextInput, TouchableOpacity, Alert
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { GroupStackParamList } from '../../navigation/types/navigation';
import { Split, ShareEntry } from '../../models/Split';
import { SplitMethod } from '../../models/Group';
import { useGroupStore } from '../../store/groupStore';
import { useUiStore } from '../../store/uiStore';
import { rupeesToPaise } from '../../utils/currencyUtils';
import { generateId } from '../../utils/generateId';

type Props = {
  navigation: NativeStackNavigationProp<GroupStackParamList, 'AddExpense'>;
  route:      RouteProp<GroupStackParamList, 'AddExpense'>;
};

export default function AddExpenseScreen({ navigation, route }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { groups, addSplit } = useGroupStore();
  const group = groups.find(g => g.id === route.params.groupId)!;

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equally');
  const [paidBy, setPaidBy] = useState(group?.members[0]?.userId ?? group?.members[0]?.name ?? '');
  const [saving, setSaving] = useState(false);

  if (!group) return null;

  const handleAdd = async () => {
    const paise = rupeesToPaise(amount);
    if (!description.trim()) { Alert.alert('Enter description'); return; }
    if (paise <= 0) { Alert.alert('Enter valid amount'); return; }

    const perMember = Math.floor(paise / group.members.length);
    const shares: ShareEntry[] = group.members.map(m => ({
      memberId: m.userId ?? m.name,
      shareAmount: perMember,
      paid: (m.userId ?? m.name) === paidBy,
      paidAt: (m.userId ?? m.name) === paidBy ? Date.now() : null,
    }));

    // Adjust last member for rounding
    const total = shares.reduce((s, e) => s + e.shareAmount, 0);
    if (shares.length > 0) shares[shares.length - 1].shareAmount += paise - total;

    const now = Date.now();
    const split: Split = {
      id: generateId(),
      groupId: group.id,
      paidBy,
      description: description.trim(),
      totalAmount: paise,
      splitMethod,
      shares,
      categoryId: null,
      transactionId: null,
      date: now,
      syncedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    setSaving(true);
    try {
      await addSplit(split);
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
        <Text style={styles.label}>Description</Text>
        <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="e.g. Hotel booking" placeholderTextColor="#4B4B4B" />

        <Text style={styles.label}>Total Amount (₹)</Text>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#4B4B4B" keyboardType="numeric" />

        <Text style={styles.label}>Split Method</Text>
        <View style={styles.methodRow}>
          {(['equally', 'exact', 'percentage', 'shares'] as SplitMethod[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.methodBtn, splitMethod === m && styles.methodBtnActive]}
              onPress={() => setSplitMethod(m)}
            >
              <Text style={[styles.methodText, splitMethod === m && styles.methodTextActive]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Paid By</Text>
        {group.members.map(m => {
          const id = m.userId ?? m.name;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.paidByBtn, paidBy === id && styles.paidByActive]}
              onPress={() => setPaidBy(id)}
            >
              <Text style={[styles.paidByText, paidBy === id && styles.paidByTextActive]}>{m.name}</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabled]}
          onPress={handleAdd}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Adding...' : 'Add Expense'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0D0D0D' },
  content:          { padding: 24, gap: 10 },
  label:            { fontSize: 14, color: '#ABABAB', marginTop: 12, marginBottom: 4 },
  input:            { backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  methodRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodBtn:        { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#2C2C2C' },
  methodBtnActive:  { backgroundColor: '#8257E6', borderColor: '#8257E6' },
  methodText:       { color: '#ABABAB', fontSize: 13 },
  methodTextActive: { color: '#FFF', fontWeight: '600' },
  paidByBtn:        { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2C2C2C', marginBottom: 4 },
  paidByActive:     { backgroundColor: '#1A1A1A', borderColor: '#8257E6' },
  paidByText:       { color: '#ABABAB' },
  paidByTextActive: { color: '#8257E6', fontWeight: '700' },
  saveBtn:          { backgroundColor: '#8257E6', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  disabled:         { opacity: 0.6 },
  saveBtnText:      { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
