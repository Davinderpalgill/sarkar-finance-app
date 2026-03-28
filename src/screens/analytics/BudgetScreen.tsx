import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, TextInput, Modal, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { generateId } from '../../utils/generateId';
import { useTransactionStore } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { useBudgetStore } from '../../store/budgetStore';
import { formatCurrency, rupeesToPaise } from '../../utils/currencyUtils';
import { currentMonthRange } from '../../utils/dateUtils';
import { DEFAULT_CATEGORIES } from '../../config/categories';
import { Budget } from '../../models/Budget';
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'Budget'>;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthRange(yyyyMM: string): { from: number; to: number } {
  const [y, m] = yyyyMM.split('-').map(Number);
  return { from: new Date(y, m - 1, 1).getTime(), to: new Date(y, m, 0, 23, 59, 59, 999).getTime() };
}

export default function BudgetScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getCategoryBreakdown, getSummary } = useTransactionStore();
  const { budgets, loadBudgets, saveBudget, deleteBudget } = useBudgetStore();
  const [refreshing, setRefreshing] = useState(false);
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [totalSpent, setTotalSpent] = useState(0);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');

  const load = useCallback(async () => {
    const { from, to } = monthRange(selectedMonth);
    const [breakdown, summary] = await Promise.all([
      getCategoryBreakdown(userId, from, to),
      getSummary(userId, from, to),
      loadBudgets(userId, selectedMonth),
    ]);
    setTotalSpent(summary.totalDebit);
    const map: Record<string, number> = { overall: summary.totalDebit };
    breakdown.forEach(r => { if (r.categoryId) map[r.categoryId] = r.totalDebit; });
    setSpending(map);
  }, [userId, selectedMonth]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  };

  const openModal = (categoryId: string | null) => {
    setEditingCategoryId(categoryId);
    const existing = budgets.find(b => b.categoryId === categoryId);
    setAmountInput(existing ? String(existing.limitAmount / 100) : '');
    setModalVisible(true);
  };

  const saveLimit = async () => {
    const paise = rupeesToPaise(amountInput);
    if (paise <= 0) { Alert.alert('Enter a valid amount'); return; }
    const existing = budgets.find(b => b.categoryId === editingCategoryId);
    const now2 = Date.now();
    const budget: Budget = {
      id: existing?.id ?? generateId(),
      userId,
      month: selectedMonth,
      categoryId: editingCategoryId,
      limitAmount: paise,
      createdAt: existing?.createdAt ?? now2,
      updatedAt: now2,
    };
    await saveBudget(budget);
    setModalVisible(false);
  };

  const removeLimit = async (id: string) => {
    await deleteBudget(id);
  };

  const overallBudget = budgets.find(b => b.categoryId === null);
  const overallPct = overallBudget ? Math.min(Math.round((totalSpent / overallBudget.limitAmount) * 100), 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Budgets</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Month picker */}
        <View style={styles.monthPicker}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
            <MaterialIcons name="chevron-left" size={24} color="#8257E6" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel()}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
            <MaterialIcons name="chevron-right" size={24} color="#8257E6" />
          </TouchableOpacity>
        </View>

        {/* Overall budget */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Monthly Budget</Text>
          <View style={[styles.budgetCard, overallBudget && totalSpent > overallBudget.limitAmount && styles.overBudget]}>
            <View style={styles.budgetRow}>
              <View>
                <Text style={styles.budgetLabel}>Spent</Text>
                <Text style={styles.budgetAmount}>{formatCurrency(totalSpent)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.budgetLabel}>Limit</Text>
                <Text style={styles.budgetLimit}>
                  {overallBudget ? formatCurrency(overallBudget.limitAmount) : 'Not set'}
                </Text>
              </View>
            </View>
            {overallBudget && (
              <>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, {
                    width: `${overallPct}%` as any,
                    backgroundColor: overallPct >= 100 ? '#FF4757' : overallPct >= 80 ? '#FFA502' : '#00C896',
                  }]} />
                </View>
                <Text style={styles.pctText}>{overallPct}% used</Text>
              </>
            )}
            <TouchableOpacity style={styles.editBtn} onPress={() => openModal(null)}>
              <MaterialIcons name={overallBudget ? 'edit' : 'add'} size={16} color="#8257E6" />
              <Text style={styles.editText}>{overallBudget ? 'Edit' : 'Set'} overall budget</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Per-category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Budgets</Text>
          {DEFAULT_CATEGORIES.filter(c => c.id !== 'cat_other').map(cat => {
            const budget = budgets.find(b => b.categoryId === cat.id);
            const spent = spending[cat.id] ?? 0;
            const pct = budget ? Math.min(Math.round((spent / budget.limitAmount) * 100), 100) : 0;
            const over = budget && spent > budget.limitAmount;

            return (
              <View key={cat.id} style={[styles.catCard, over && styles.overBudget]}>
                <View style={styles.catHeader}>
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '33' }]}>
                    <MaterialIcons name={cat.icon as any} size={16} color={cat.color} />
                  </View>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <TouchableOpacity onPress={() => openModal(cat.id)}>
                    <MaterialIcons name={budget ? 'edit' : 'add-circle-outline'} size={18} color={budget ? '#8257E6' : '#4B4B4B'} />
                  </TouchableOpacity>
                </View>
                <View style={styles.catAmounts}>
                  <Text style={styles.catSpent}>{formatCurrency(spent)}</Text>
                  {budget ? (
                    <Text style={styles.catLimit}>/ {formatCurrency(budget.limitAmount)}</Text>
                  ) : (
                    <Text style={styles.catNoLimit}>No limit</Text>
                  )}
                </View>
                {budget && (
                  <>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, {
                        width: `${pct}%` as any,
                        backgroundColor: pct >= 100 ? '#FF4757' : pct >= 80 ? '#FFA502' : cat.color,
                      }]} />
                    </View>
                    <View style={styles.catFooter}>
                      <Text style={[styles.pctText, over && { color: '#FF4757' }]}>{over ? 'OVER BUDGET' : `${pct}% used`}</Text>
                      <TouchableOpacity onPress={() => removeLimit(budget.id)}>
                        <MaterialIcons name="delete-outline" size={16} color="#4B4B4B" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCategoryId
                ? `Set Budget: ${DEFAULT_CATEGORIES.find(c => c.id === editingCategoryId)?.name}`
                : 'Set Overall Monthly Budget'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Amount in ₹"
              placeholderTextColor="#4B4B4B"
              keyboardType="numeric"
              value={amountInput}
              onChangeText={setAmountInput}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveLimit}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
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
  monthLabel:   { fontSize: 16, fontWeight: '600', color: '#FFFFFF', minWidth: 110, textAlign: 'center' },
  section:      { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  budgetCard:   { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'transparent' },
  overBudget:   { borderColor: '#FF4757' },
  budgetRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  budgetLabel:  { fontSize: 11, color: '#6B6B6B', marginBottom: 2 },
  budgetAmount: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  budgetLimit:  { fontSize: 16, fontWeight: '600', color: '#ABABAB' },
  progressTrack:{ height: 8, backgroundColor: '#2C2C2C', borderRadius: 4, marginVertical: 8 },
  progressFill: { height: 8, borderRadius: 4 },
  pctText:      { fontSize: 11, color: '#6B6B6B' },
  editBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  editText:     { fontSize: 13, color: '#8257E6' },
  catCard:      { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  catHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  catIcon:      { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  catName:      { flex: 1, fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  catAmounts:   { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 6 },
  catSpent:     { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  catLimit:     { fontSize: 12, color: '#6B6B6B' },
  catNoLimit:   { fontSize: 12, color: '#2C2C2C' },
  catFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:   { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  input:        { backgroundColor: '#0D0D0D', borderRadius: 10, padding: 14, fontSize: 18, color: '#FFFFFF', marginBottom: 16 },
  modalBtns:    { flexDirection: 'row', gap: 12 },
  cancelBtn:    { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#2C2C2C', alignItems: 'center' },
  cancelText:   { color: '#ABABAB', fontWeight: '600' },
  saveBtn:      { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#8257E6', alignItems: 'center' },
  saveText:     { color: '#FFF', fontWeight: '700' },
});
