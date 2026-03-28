import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LedgerStackParamList } from '../../navigation/types/navigation';
import { useLedger } from '../../hooks/useLedger';
import { LedgerEntry } from '../../models/LedgerEntry';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDate } from '../../utils/dateUtils';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<LedgerStackParamList, 'LedgerHome'>;
};

export default function LedgerScreen({ navigation }: Props) {
  const { lentEntries, borrowedEntries } = useLedger();
  const [tab, setTab] = useState<'lent' | 'borrowed'>('lent');
  const entries = tab === 'lent' ? lentEntries : borrowedEntries;

  const renderEntry = ({ item }: { item: LedgerEntry }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('LedgerDetail', { id: item.id })}
    >
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.personName.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.personName}>{item.personName}</Text>
          <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>
          {item.dueDate && (
            <Text style={styles.dueDate}>Due {formatDate(item.dueDate)}</Text>
          )}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.amount, tab === 'lent' ? styles.lentColor : styles.borrowColor]}>
          {formatCurrency(item.outstandingAmount)}
        </Text>
        <View style={[styles.statusBadge, item.status === 'settled' ? styles.settled : styles.open]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const totalLent     = lentEntries.reduce((s, e) => s + e.outstandingAmount, 0);
  const totalBorrowed = borrowedEntries.reduce((s, e) => s + e.outstandingAmount, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Summary header */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>You lent</Text>
          <Text style={[styles.summaryAmount, styles.lentColor]}>{formatCurrency(totalLent)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>You borrowed</Text>
          <Text style={[styles.summaryAmount, styles.borrowColor]}>{formatCurrency(totalBorrowed)}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['lent', 'borrowed'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'lent' ? 'You Lent' : 'You Borrowed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={entries}
        keyExtractor={i => i.id}
        renderItem={renderEntry}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name={tab === 'lent' ? 'call-made' : 'call-received'}
              size={48}
              color="#2C2C2C"
            />
            <Text style={styles.emptyTitle}>
              {tab === 'lent' ? 'No money lent yet' : 'No money borrowed yet'}
            </Text>
            <Text style={styles.emptyDesc}>
              {tab === 'lent'
                ? 'Track money you lend to friends and family. Tap + to add an entry.'
                : 'Track money you borrow from others. Tap + to add an entry.'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddLend')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0D0D0D' },
  summaryRow:    { flexDirection: 'row', backgroundColor: '#1A1A1A', margin: 16, borderRadius: 16, padding: 20 },
  summaryItem:   { flex: 1, alignItems: 'center' },
  summaryLabel:  { fontSize: 13, color: '#6B6B6B' },
  summaryAmount: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  divider:       { width: 1, backgroundColor: '#2C2C2C', marginHorizontal: 8 },
  lentColor:     { color: '#00C896' },
  borrowColor:   { color: '#FF4757' },
  tabs:          { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 4 },
  tab:           { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive:     { backgroundColor: '#8257E6' },
  tabText:       { color: '#6B6B6B', fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  card:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16 },
  cardLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar:        { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center' },
  avatarText:    { color: '#FFF', fontSize: 18, fontWeight: '700' },
  personName:    { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  desc:          { fontSize: 13, color: '#6B6B6B', marginTop: 2, maxWidth: 140 },
  dueDate:       { fontSize: 12, color: '#FFA502', marginTop: 2 },
  amount:        { fontSize: 18, fontWeight: '800' },
  statusBadge:   { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  settled:       { backgroundColor: '#0D332022' },
  open:          { backgroundColor: '#45081022' },
  statusText:    { fontSize: 11, color: '#ABABAB', textTransform: 'capitalize' },
  emptyContainer:{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 12 },
  emptyTitle:    { fontSize: 17, fontWeight: '700', color: '#4B4B4B', textAlign: 'center' },
  emptyDesc:     { fontSize: 14, color: '#2C2C2C', textAlign: 'center', lineHeight: 20 },
  fab:           { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText:       { color: '#FFF', fontSize: 28, fontWeight: '700', lineHeight: 32 },
});
