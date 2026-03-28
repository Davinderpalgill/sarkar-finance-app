import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TextInput, TouchableOpacity, Alert
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { TransactionStackParamList } from '../../navigation/types/navigation';
import { Transaction, TransactionType } from '../../models/Transaction';
import { TransactionRepository } from '../../storage/repositories/TransactionRepository';
import { useTransactionStore } from '../../store/transactionStore';
import { formatCurrency, rupeesToPaise } from '../../utils/currencyUtils';
import { formatDateTime } from '../../utils/dateUtils';
import { maskAccount } from '../../utils/stringUtils';
import CategoryPopup from '../../components/transactions/CategoryPopup';
import { DEFAULT_CATEGORIES } from '../../config/categories';

const CAT_MAP = new Map(DEFAULT_CATEGORIES.map(c => [c.id, c]));

function parseDDMMYYYY(s: string): number | null {
  const parts = s.trim().split(/[-\/]/);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y || y < 2000 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const ms = new Date(y, m - 1, d).getTime();
  return isNaN(ms) ? null : ms;
}

function getCategoryLabel(categoryId: string): string {
  const known = CAT_MAP.get(categoryId);
  if (known) return known.name;
  if (categoryId.startsWith('custom_')) {
    return categoryId
      .replace('custom_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  return categoryId;
}

type Props = {
  navigation: NativeStackNavigationProp<TransactionStackParamList, 'TransactionDetail'>;
  route:      RouteProp<TransactionStackParamList, 'TransactionDetail'>;
};

export default function TransactionDetailScreen({ route, navigation }: Props) {
  const [tx, setTx] = useState<Transaction | null>(null);
  const [note, setNote] = useState('');
  const [showCatPopup, setShowCatPopup] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<TransactionType>('debit');
  const [editMerchant, setEditMerchant] = useState('');
  const [editDate, setEditDate] = useState('');
  const { updateTransaction, deleteTransaction } = useTransactionStore();

  useEffect(() => {
    TransactionRepository.findById(route.params.id).then(t => {
      if (!t) return;
      setTx(t);
      setNote(t.note ?? '');
      setEditAmount((t.amount / 100).toFixed(2));
      setEditType(t.type);
      setEditMerchant(t.merchantName ?? '');
      const d = new Date(t.transactionDate);
      setEditDate(
        `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
      );
    });
  }, [route.params.id]);

  if (!tx) return null;

  const saveNote = async () => {
    await updateTransaction({
      id: tx.id,
      note,
      categoryId: tx.categoryId,
      categoryConfidence: tx.categoryConfidence,
      tags: tx.tags,
    });
    Alert.alert('Saved');
  };

  const handleSaveEdit = async () => {
    const paise = rupeesToPaise(editAmount);
    if (paise <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }
    const parsedDate = parseDDMMYYYY(editDate);
    if (!parsedDate) {
      Alert.alert('Invalid date', 'Please enter date as DD-MM-YYYY (e.g. 15-03-2025).');
      return;
    }
    const updated = {
      id: tx.id,
      amount: paise,
      type: editType,
      merchantName: editMerchant.trim() || null,
      transactionDate: parsedDate,
      categoryId: tx.categoryId,
      categoryConfidence: tx.categoryConfidence,
      tags: tx.tags,
    };
    await updateTransaction(updated);
    setTx(prev => prev ? { ...prev, ...updated } : prev);
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      `Delete ${formatCurrency(tx.amount)} at ${tx.merchantName || tx.bankName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(tx.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const Field = ({ label, value }: { label: string; value: string | null | undefined }) =>
    value ? (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Amount hero */}
        <View style={[styles.hero, tx.type === 'credit' ? styles.heroCredit : styles.heroDebit]}>
          <Text style={styles.heroType}>{tx.type === 'credit' ? 'Credit' : 'Debit'}</Text>
          <Text style={styles.heroAmount}>{formatCurrency(tx.amount)}</Text>
          <Text style={styles.heroDate}>{formatDateTime(tx.transactionDate)}</Text>
        </View>

        {/* Edit / Delete actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, isEditing && styles.actionBtnActive]}
            onPress={() => setIsEditing(e => !e)}
          >
            <Text style={[styles.actionBtnText, isEditing && styles.actionBtnTextActive]}>
              {isEditing ? 'Cancel Edit' : 'Edit'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteActionBtn} onPress={handleDelete}>
            <Text style={styles.deleteActionBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Inline edit form */}
        {isEditing && (
          <View style={styles.card}>
            <Text style={styles.editTitle}>Edit Transaction</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.editInput}
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#4B4B4B"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeRow}>
                {(['debit', 'credit'] as TransactionType[]).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, editType === t && styles.typeBtnActive]}
                    onPress={() => setEditType(t)}
                  >
                    <Text style={[styles.typeBtnText, editType === t && styles.typeBtnTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Merchant / Person</Text>
              <TextInput
                style={styles.editInput}
                value={editMerchant}
                onChangeText={setEditMerchant}
                placeholder="e.g. Swiggy"
                placeholderTextColor="#4B4B4B"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Transaction Date (DD-MM-YYYY)</Text>
              <TextInput
                style={styles.editInput}
                value={editDate}
                onChangeText={setEditDate}
                placeholder="15-03-2025"
                placeholderTextColor="#4B4B4B"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <TouchableOpacity style={styles.saveEditBtn} onPress={handleSaveEdit}>
              <Text style={styles.saveEditBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Details */}
        <View style={styles.card}>
          <Field label="Bank"            value={tx.bankName} />
          <Field label="Account"         value={maskAccount(tx.accountLast4)} />
          <Field label="Merchant"        value={tx.merchantName} />
          <Field label="Person"          value={tx.personName} />
          <Field label="UPI ID"          value={tx.upiId} />
          <Field label="Reference"       value={tx.referenceNumber} />
          <Field label="Available Bal."  value={tx.availableBalance ? formatCurrency(tx.availableBalance) : null} />
          <Field label="Merchant Type"   value={tx.merchantType} />

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity onPress={() => setShowCatPopup(true)} style={styles.categoryRow}>
              {tx.categoryId && (
                <View style={[styles.catDot, { backgroundColor: CAT_MAP.get(tx.categoryId)?.color ?? '#6B6B6B' }]} />
              )}
              <Text style={[styles.fieldValue, !tx.categoryId && styles.uncatText]}>
                {tx.categoryId ? getCategoryLabel(tx.categoryId) : 'Tap to categorize'}
                {tx.categoryId && tx.categoryConfidence > 0 && ` (${Math.round(tx.categoryConfidence * 100)}%)`}
              </Text>
              <Text style={styles.editHint}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Note */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note..."
              placeholderTextColor="#4B4B4B"
              multiline
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveNote}>
              <Text style={styles.saveBtnText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Raw SMS / Email body */}
        {tx.rawSms && (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Original {tx.source === 'email' ? 'Email' : 'SMS'}</Text>
            <Text style={styles.smsBody}>{tx.rawSms}</Text>
          </View>
        )}
      </ScrollView>

      <CategoryPopup
        visible={showCatPopup}
        transactionId={tx.id}
        currentCategoryId={tx.categoryId}
        onDismiss={() => setShowCatPopup(false)}
        onCategoryChanged={(catId) =>
          setTx(prev => prev ? { ...prev, categoryId: catId, categoryConfidence: 1.0 } : prev)
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0D0D0D' },
  content:            { padding: 16, gap: 16 },
  hero:               { borderRadius: 20, padding: 28, alignItems: 'center' },
  heroCredit:         { backgroundColor: '#0D3320' },
  heroDebit:          { backgroundColor: '#3D0A0A' },
  heroType:           { color: '#86EFAC', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  heroAmount:         { color: '#FFF', fontSize: 36, fontWeight: '800', marginVertical: 8 },
  heroDate:           { color: '#ABABAB', fontSize: 13 },
  actionRow:          { flexDirection: 'row', gap: 12 },
  actionBtn:          { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#8257E6', alignItems: 'center' },
  actionBtnActive:    { backgroundColor: '#1A1A1A' },
  actionBtnText:      { color: '#8257E6', fontSize: 14, fontWeight: '600' },
  actionBtnTextActive:{ color: '#ABABAB' },
  deleteActionBtn:    { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FF4757', alignItems: 'center' },
  deleteActionBtnText:{ color: '#FF4757', fontSize: 14, fontWeight: '600' },
  card:               { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, gap: 16 },
  editTitle:          { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  field:              { gap: 4 },
  fieldLabel:         { fontSize: 12, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue:         { fontSize: 15, color: '#FFFFFF' },
  uncatText:          { color: '#FFA502' },
  categoryRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot:             { width: 10, height: 10, borderRadius: 5 },
  editHint:           { fontSize: 12, color: '#8257E6', marginLeft: 'auto' },
  editInput:          { backgroundColor: '#0D0D0D', color: '#FFFFFF', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#2C2C2C', fontSize: 15 },
  typeRow:            { flexDirection: 'row', gap: 12 },
  typeBtn:            { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#2C2C2C', alignItems: 'center' },
  typeBtnActive:      { backgroundColor: '#8257E6', borderColor: '#8257E6' },
  typeBtnText:        { color: '#ABABAB', fontSize: 14 },
  typeBtnTextActive:  { color: '#FFF', fontWeight: '600' },
  saveEditBtn:        { backgroundColor: '#8257E6', padding: 14, borderRadius: 10, alignItems: 'center' },
  saveEditBtnText:    { color: '#FFF', fontSize: 15, fontWeight: '700' },
  noteInput:          { backgroundColor: '#0D0D0D', color: '#FFFFFF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#2C2C2C', minHeight: 60 },
  saveBtn:            { alignSelf: 'flex-end', backgroundColor: '#8257E6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 8 },
  saveBtnText:        { color: '#FFF', fontWeight: '600' },
  smsBody:            { color: '#ABABAB', fontSize: 13, lineHeight: 20, fontFamily: 'monospace' },
});
