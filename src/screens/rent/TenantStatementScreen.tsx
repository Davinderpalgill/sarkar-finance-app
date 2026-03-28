import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RentStackParamList } from '../../navigation/types/navigation';
import { RentRepository } from '../../storage/repositories/RentRepository';
import { RentRecord } from '../../models/RentRecord';
import { RentTenant } from '../../models/RentTenant';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<RentStackParamList, 'TenantStatement'>;
  route: RouteProp<RentStackParamList, 'TenantStatement'>;
};

function formatRupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_COLOR: Record<string, string> = {
  paid: '#00C896', partial: '#FFA502', pending: '#6B6B6B', overdue: '#FF4757',
};

export default function TenantStatementScreen({ navigation, route }: Props) {
  const { tenantId } = route.params;
  const [tenant, setTenant] = useState<RentTenant | null>(null);
  const [records, setRecords] = useState<RentRecord[]>([]);

  useEffect(() => {
    RentRepository.getTenantById(tenantId).then(setTenant).catch(e => console.warn('getTenantById error', e));
    RentRepository.getRentRecords(tenantId).then(setRecords).catch(e => console.warn('getRentRecords error', e));
  }, [tenantId]);

  const extraChargesTotal = (r: RentRecord) => (r.extraCharges ?? []).reduce((s, c) => s + c.amount, 0);
  const totalDue = records.reduce((s, r) => s + r.amountDue + (r.lateFee ?? 0) + extraChargesTotal(r), 0);
  const totalPaid = records.reduce((s, r) => s + r.amountPaid, 0);
  const outstanding = totalDue - totalPaid;

  const renderItem = ({ item }: { item: RentRecord }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('RecordRent', { recordId: item.id, tenantId: item.tenantId })}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.month}>{item.month}</Text>
        <Text style={styles.due}>
          Rent: {formatRupees(item.amountDue)}
          {item.lateFee ? `  ·  Late: ${formatRupees(item.lateFee)}` : ''}
          {(item.extraCharges ?? []).map(c => `  ·  ${c.label}: ${formatRupees(c.amount)}`).join('')}
        </Text>
        {item.paymentDate && (
          <Text style={styles.date}>Paid on {formatDate(item.paymentDate)}</Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
        </View>
        {item.amountPaid > 0 && (
          <Text style={styles.paid}>{formatRupees(item.amountPaid)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Statement</Text>
        <TouchableOpacity onPress={() => navigation.popToTop()}>
          <MaterialIcons name="home" size={22} color="#4B4B4B" />
        </TouchableOpacity>
      </View>

      {tenant && (
        <View style={styles.tenantCard}>
          <Text style={styles.tenantName}>{tenant.name}</Text>
          <Text style={styles.tenantSub}>Monthly Rent: {formatRupees(tenant.monthlyRent)}</Text>
        </View>
      )}

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatRupees(totalDue)}</Text>
          <Text style={styles.summaryLabel}>Total Billed</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#00C896' }]}>{formatRupees(totalPaid)}</Text>
          <Text style={styles.summaryLabel}>Total Paid</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: outstanding > 0 ? '#FF4757' : '#00C896' }]}>
            {formatRupees(outstanding)}
          </Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
        </View>
      </View>

      <FlatList
        data={records}
        keyExtractor={r => r.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        ListEmptyComponent={<Text style={styles.empty}>No records yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0D0D0D' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title:         { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  tenantCard:    { backgroundColor: '#1A1A1A', marginHorizontal: 16, borderRadius: 14, padding: 14, marginBottom: 12, alignItems: 'center' },
  tenantName:    { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  tenantSub:     { fontSize: 13, color: '#6B6B6B', marginTop: 2 },
  summaryRow:    { flexDirection: 'row', backgroundColor: '#1A1A1A', marginHorizontal: 16, borderRadius: 14, padding: 14, marginBottom: 8 },
  summaryItem:   { flex: 1, alignItems: 'center' },
  summaryValue:  { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  summaryLabel:  { fontSize: 11, color: '#6B6B6B', marginTop: 2 },
  summaryDivider:{ width: 1, backgroundColor: '#2C2C2C' },
  row:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14 },
  month:         { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  due:           { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  date:          { fontSize: 11, color: '#4B4B4B', marginTop: 2 },
  badge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText:     { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  paid:          { fontSize: 13, fontWeight: '700', color: '#00C896' },
  empty:         { textAlign: 'center', color: '#4B4B4B', paddingTop: 40, fontSize: 14 },
});
