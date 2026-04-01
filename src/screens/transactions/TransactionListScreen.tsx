import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView,
  Modal, KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { TransactionStackParamList } from '../../navigation/types/navigation';
import { useTransactionStore, AccountSummary } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { Transaction } from '../../models/Transaction';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDate } from '../../utils/dateUtils';
import { DEFAULT_CATEGORIES } from '../../config/categories';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<TransactionStackParamList, 'TransactionList'>;
  route: RouteProp<TransactionStackParamList, 'TransactionList'>;
};

type FilterType = 'all' | 'credit' | 'debit';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function TransactionListScreen({ navigation, route }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const {
    transactions, loading, loadingMore, hasMore,
    loadTransactions, loadMoreTransactions, deleteTransaction, getAccounts,
  } = useTransactionStore();

  const [accounts,        setAccounts]        = useState<AccountSummary[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountSummary | null>(null);
  const [filter,          setFilter]          = useState<FilterType>('all');
  const [search,          setSearch]          = useState('');

  // Category filter (from analytics drill-down OR user-selected in filter sheet)
  const initFrom = route?.params?.fromDate;
  const initDate = initFrom ? new Date(initFrom) : new Date();
  const [catFilter,     setCatFilter]     = useState<string | null>(route?.params?.categoryId ?? null);
  const [catFilterName, setCatFilterName] = useState<string | null>(route?.params?.categoryName ?? null);

  // Amount filter (client-side, in rupees)
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  // Filter sheet
  const [sheetVisible,     setSheetVisible]     = useState(false);
  const [draftCat,         setDraftCat]         = useState<string | null>(null);
  const [draftAmountMin,   setDraftAmountMin]   = useState('');
  const [draftAmountMax,   setDraftAmountMax]   = useState('');

  const now = new Date();
  const [selectedYear,  setSelectedYear]  = useState(initDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initDate.getMonth());

  const buildOptions = (year: number, month: number, f: FilterType, acct: AccountSummary | null, cat: string | null) => ({
    ...(f !== 'all' ? { type: f as 'credit' | 'debit' } : {}),
    fromDate: new Date(year, month, 1).getTime(),
    toDate:   new Date(year, month + 1, 0, 23, 59, 59, 999).getTime(),
    ...(acct ? { bankName: acct.bankName, accountLast4: acct.accountLast4 } : {}),
    ...(cat ? { categoryId: cat } : {}),
  });

  useEffect(() => {
    getAccounts(userId).then(setAccounts);
  }, [userId]);

  useEffect(() => {
    loadTransactions(userId, buildOptions(selectedYear, selectedMonth, filter, selectedAccount, catFilter));
  }, [selectedYear, selectedMonth, filter, selectedAccount, catFilter]);

  // Reload when returning from TransactionDetail (e.g. after category change)
  useFocusEffect(useCallback(() => {
    loadTransactions(userId, buildOptions(selectedYear, selectedMonth, filter, selectedAccount, catFilter));
  }, [selectedYear, selectedMonth, filter, selectedAccount, catFilter, userId]));

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedYear(y => y - 1); setSelectedMonth(11); }
    else setSelectedMonth(m => m - 1);
  };

  const nextMonth = () => {
    const next = new Date(selectedYear, selectedMonth + 1, 1);
    if (next > now) return;
    if (selectedMonth === 11) { setSelectedYear(y => y + 1); setSelectedMonth(0); }
    else setSelectedMonth(m => m + 1);
  };

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  // Client-side filtering: search + amount range
  const minPaise = amountMin ? parseFloat(amountMin) * 100 : null;
  const maxPaise = amountMax ? parseFloat(amountMax) * 100 : null;

  const filtered = transactions.filter(tx => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        tx.merchantName?.toLowerCase().includes(q) ||
        tx.personName?.toLowerCase().includes(q) ||
        tx.bankName.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (minPaise !== null && tx.amount < minPaise) return false;
    if (maxPaise !== null && tx.amount > maxPaise) return false;
    return true;
  });

  // Count active filters for badge
  const activeFilterCount =
    (catFilter ? 1 : 0) +
    (amountMin ? 1 : 0) +
    (amountMax ? 1 : 0);

  const openSheet = () => {
    setDraftCat(catFilter);
    setDraftAmountMin(amountMin);
    setDraftAmountMax(amountMax);
    setSheetVisible(true);
  };

  const applyFilters = () => {
    const cat = draftCat;
    const catName = cat ? DEFAULT_CATEGORIES.find(c => c.id === cat)?.name ?? null : null;
    setCatFilter(cat);
    setCatFilterName(catName);
    setAmountMin(draftAmountMin);
    setAmountMax(draftAmountMax);
    setSheetVisible(false);
  };

  const clearAllFilters = () => {
    setDraftCat(null);
    setDraftAmountMin('');
    setDraftAmountMax('');
    setCatFilter(null);
    setCatFilterName(null);
    setAmountMin('');
    setAmountMax('');
    setSheetVisible(false);
  };

  const handleExportCSV = async () => {
    if (filtered.length === 0) {
      Alert.alert('Nothing to export', 'No transactions match the current filters.');
      return;
    }
    const header = 'Date,Merchant,Type,Amount (₹),Bank,Note';
    const rows = filtered.map(tx => {
      const date     = new Date(tx.transactionDate).toLocaleDateString('en-IN');
      const merchant = (tx.merchantName || tx.personName || tx.bankName || '').replace(/,/g, ' ');
      const amount   = (tx.amount / 100).toFixed(2);
      const note     = (tx.note || '').replace(/,/g, ' ');
      return `${date},${merchant},${tx.type},${amount},${tx.bankName},${note}`;
    });
    const csv = [header, ...rows].join('\n');
    await Share.share({
      message: csv,
      title: `Transactions_${MONTHS[selectedMonth]}_${selectedYear}.csv`,
    });
  };

  const handleFilterChange = (f: FilterType) => setFilter(f);

  const handleLoadMore = () => {
    loadMoreTransactions(userId, buildOptions(selectedYear, selectedMonth, filter, selectedAccount, catFilter));
  };

  const handleDelete = (item: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Delete ${formatCurrency(item.amount)} at ${item.merchantName || item.bankName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(item.id) },
      ]
    );
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={styles.item}>
      <TouchableOpacity
        style={styles.itemMain}
        onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
      >
        <View style={[styles.typeBadge, item.type === 'credit' ? styles.creditBadge : styles.debitBadge]}>
          <Text style={styles.typeBadgeText}>{item.type === 'credit' ? '↓' : '↑'}</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemMerchant} numberOfLines={1}>
            {item.merchantName || item.personName || item.bankName}
          </Text>
          <Text style={styles.itemDate}>{formatDate(item.transactionDate)} · {item.bankName}</Text>
          {!item.categoryId && <Text style={styles.uncat}>Uncategorized</Text>}
        </View>
        <Text style={[styles.itemAmount, item.type === 'credit' ? styles.credit : styles.debit]}>
          {item.type === 'credit' ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (loadingMore) return <ActivityIndicator color="#8257E6" style={{ marginVertical: 20 }} />;
    if (!hasMore || transactions.length === 0) return null;
    return (
      <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search + Filter button */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search transactions..."
          placeholderTextColor="#4B4B4B"
        />
        <TouchableOpacity style={styles.filterBtn} onPress={handleExportCSV}>
          <MaterialIcons name="ios-share" size={18} color="#ABABAB" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn} onPress={openSheet}>
          <MaterialIcons name="tune" size={18} color={activeFilterCount > 0 ? '#8257E6' : '#ABABAB'} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Month picker */}
      <View style={styles.monthRow}>
        <TouchableOpacity style={styles.monthArrow} onPress={prevMonth}>
          <Text style={styles.monthArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS[selectedMonth]} {selectedYear}</Text>
        <TouchableOpacity
          style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
          onPress={nextMonth}
          disabled={isCurrentMonth}
        >
          <Text style={[styles.monthArrowText, isCurrentMonth && styles.monthArrowTextDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Account filter */}
      {accounts.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountFilterScroll} contentContainerStyle={{ alignItems: 'center' }}>
          <View style={styles.accountFilterRow}>
            <TouchableOpacity
              style={[styles.accountChip, !selectedAccount && styles.accountChipActive]}
              onPress={() => setSelectedAccount(null)}
            >
              <Text style={[styles.accountChipText, !selectedAccount && styles.accountChipTextActive]}>All</Text>
            </TouchableOpacity>
            {accounts.map(acct => {
              const key = `${acct.bankName}|${acct.accountLast4 ?? ''}`;
              const active = selectedAccount ? `${selectedAccount.bankName}|${selectedAccount.accountLast4 ?? ''}` === key : false;
              const label  = acct.accountLast4 ? `${acct.bankName} ••${acct.accountLast4}` : acct.bankName;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.accountChip, active && styles.accountChipActive]}
                  onPress={() => setSelectedAccount(active ? null : acct)}
                >
                  <Text style={[styles.accountChipText, active && styles.accountChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Type filter */}
      <View style={styles.typeRow}>
        {(['all', 'credit', 'debit'] as FilterType[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.typeBtn, filter === f && styles.typeBtnActive]}
            onPress={() => handleFilterChange(f)}
          >
            <Text style={[styles.typeText, filter === f && styles.typeTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Active filter chips */}
      {(catFilter || amountMin || amountMax) && (
        <View style={styles.activeChips}>
          {catFilter && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>{catFilterName ?? catFilter}</Text>
              <TouchableOpacity onPress={() => { setCatFilter(null); setCatFilterName(null); }}>
                <MaterialIcons name="close" size={12} color="#8257E6" />
              </TouchableOpacity>
            </View>
          )}
          {amountMin !== '' && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>Min ₹{amountMin}</Text>
              <TouchableOpacity onPress={() => setAmountMin('')}>
                <MaterialIcons name="close" size={12} color="#8257E6" />
              </TouchableOpacity>
            </View>
          )}
          {amountMax !== '' && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>Max ₹{amountMax}</Text>
              <TouchableOpacity onPress={() => setAmountMax('')}>
                <MaterialIcons name="close" size={12} color="#8257E6" />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={clearAllFilters}>
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && <ActivityIndicator color="#8257E6" style={{ marginVertical: 12 }} />}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          loading ? null : (
            <Text style={styles.empty}>No transactions for {MONTHS[selectedMonth]} {selectedYear}.</Text>
          )
        }
        ListFooterComponent={renderFooter}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddTransaction')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Filter bottom sheet ── */}
      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={() => setSheetVisible(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setSheetVisible(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
          <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <TouchableOpacity onPress={clearAllFilters}>
                <Text style={styles.clearText}>Clear all</Text>
              </TouchableOpacity>
            </View>

            {/* Category */}
            <Text style={styles.sheetSection}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
              <TouchableOpacity
                style={[styles.catChip, draftCat === null && styles.catChipActive]}
                onPress={() => setDraftCat(null)}
              >
                <Text style={[styles.catChipText, draftCat === null && styles.catChipTextActive]}>All</Text>
              </TouchableOpacity>
              {DEFAULT_CATEGORIES.filter(c => c.id !== 'cat_other').map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, draftCat === cat.id && styles.catChipActive, draftCat === cat.id && { borderColor: cat.color }]}
                  onPress={() => setDraftCat(draftCat === cat.id ? null : cat.id)}
                >
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.catChipText, draftCat === cat.id && styles.catChipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Amount range */}
            <Text style={styles.sheetSection}>Amount Range (₹)</Text>
            <View style={styles.amountRow}>
              <View style={styles.amountField}>
                <Text style={styles.amountLabel}>Minimum</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="e.g. 500"
                  placeholderTextColor="#4B4B4B"
                  value={draftAmountMin}
                  onChangeText={setDraftAmountMin}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.amountSep}>—</Text>
              <View style={styles.amountField}>
                <Text style={styles.amountLabel}>Maximum</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="e.g. 5000"
                  placeholderTextColor="#4B4B4B"
                  value={draftAmountMax}
                  onChangeText={setDraftAmountMax}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Apply */}
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:             { flex: 1, backgroundColor: '#0D0D0D' },

  // Search row
  searchRow:             { flexDirection: 'row', padding: 16, paddingBottom: 8, gap: 10, alignItems: 'center' },
  searchInput:           { flex: 1, backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#2C2C2C' },
  filterBtn:             { width: 44, height: 44, backgroundColor: '#1A1A1A', borderRadius: 10, borderWidth: 1, borderColor: '#2C2C2C', alignItems: 'center', justifyContent: 'center' },
  filterBadge:           { position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: 7, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center' },
  filterBadgeText:       { fontSize: 9, color: '#FFF', fontWeight: '700' },

  // Month
  monthRow:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 8, gap: 16 },
  monthArrow:            { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#1A1A1A' },
  monthArrowDisabled:    { backgroundColor: '#0D0D0D' },
  monthArrowText:        { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  monthArrowTextDisabled:{ color: '#2C2C2C' },
  monthLabel:            { fontSize: 16, fontWeight: '700', color: '#FFFFFF', minWidth: 100, textAlign: 'center' },

  // Type filter
  typeRow:               { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  typeBtn:               { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2C2C2C' },
  typeBtnActive:         { backgroundColor: '#8257E6', borderColor: '#8257E6' },
  typeText:              { color: '#ABABAB', fontSize: 14 },
  typeTextActive:        { color: '#FFF' },

  // Active filter chips
  activeChips:           { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  activeChip:            { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3D2A6E', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  activeChipText:        { fontSize: 12, color: '#C4B5FD' },
  clearAllText:          { fontSize: 12, color: '#FF4757', fontWeight: '600', marginLeft: 4 },

  // Account filter
  accountFilterScroll:   { marginBottom: 8, flexGrow: 0, flexShrink: 0 },
  accountFilterRow:      { flexDirection: 'row', gap: 8, paddingHorizontal: 16, alignItems: 'center' },
  accountChip:           { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  accountChipActive:     { backgroundColor: '#8257E6', borderColor: '#8257E6' },
  accountChipText:       { color: '#ABABAB', fontSize: 12 },
  accountChipTextActive: { color: '#FFF' },

  // List items
  item:                  { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  itemMain:              { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  typeBadge:             { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  creditBadge:           { backgroundColor: '#0D3320' },
  debitBadge:            { backgroundColor: '#3D0A0A' },
  typeBadgeText:         { fontSize: 18, fontWeight: '700', color: '#FFF' },
  itemInfo:              { flex: 1 },
  itemMerchant:          { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  itemDate:              { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  uncat:                 { fontSize: 11, color: '#FFA502', marginTop: 2 },
  itemAmount:            { fontSize: 15, fontWeight: '700' },
  credit:                { color: '#00C896' },
  debit:                 { color: '#FF4757' },
  deleteBtn:             { padding: 12, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText:         { color: '#FF4757', fontSize: 16, fontWeight: '700' },
  empty:                 { textAlign: 'center', color: '#4B4B4B', paddingTop: 60, fontSize: 15 },
  loadMoreBtn:           { marginHorizontal: 16, marginVertical: 16, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#8257E6', padding: 14, borderRadius: 12, alignItems: 'center' },
  loadMoreText:          { color: '#8257E6', fontSize: 15, fontWeight: '600' },
  fab:                   { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText:               { color: '#FFF', fontSize: 28, fontWeight: '700', lineHeight: 32 },

  // Filter sheet
  sheetOverlay:          { flex: 1, backgroundColor: '#00000080' },
  sheetWrap:             { backgroundColor: '#1A1A1A', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheet:                 { padding: 20, gap: 16, paddingBottom: 36 },
  sheetHandle:           { width: 36, height: 4, backgroundColor: '#3A3A3A', borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetHeader:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle:            { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  clearText:             { fontSize: 14, color: '#FF4757', fontWeight: '600' },
  sheetSection:          { fontSize: 12, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 },
  catChips:              { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  catChip:               { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#2C2C2C', backgroundColor: '#2C2C2C' },
  catChipActive:         { borderColor: '#8257E6', backgroundColor: '#3D2A6E' },
  catChipText:           { fontSize: 13, color: '#ABABAB' },
  catChipTextActive:     { color: '#FFF' },
  catDot:                { width: 8, height: 8, borderRadius: 4 },
  amountRow:             { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amountField:           { flex: 1, gap: 6 },
  amountLabel:           { fontSize: 12, color: '#6B6B6B' },
  amountInput:           { backgroundColor: '#2C2C2C', borderRadius: 10, padding: 12, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#3A3A3A' },
  amountSep:             { color: '#4B4B4B', fontSize: 18, marginTop: 18 },
  applyBtn:              { backgroundColor: '#8257E6', padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  applyBtnText:          { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
