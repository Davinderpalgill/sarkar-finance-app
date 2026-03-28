import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTransactionStore } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { useEmiStore } from '../../store/emiStore';
import { formatCurrency, formatCurrencyCompact } from '../../utils/currencyUtils';
import { currentMonthRange, formatDate } from '../../utils/dateUtils';
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'EMIBurden'>;
};

export default function EMIBurdenScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getSummary } = useTransactionStore();
  const { emis, loadEmis } = useEmiStore();
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState(0);

  const load = useCallback(async () => {
    const { from, to } = currentMonthRange();
    const [summary] = await Promise.all([
      getSummary(userId, from, to),
      loadEmis(userId),
    ]);
    setMonthlyIncome(summary.totalCredit);
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const activeEmis = emis.filter(e => e.status === 'active');
  const totalEmiMonthly = activeEmis.reduce((s, e) => s + e.emiAmount, 0);
  const burdenPct = monthlyIncome > 0 ? Math.round((totalEmiMonthly / monthlyIncome) * 100) : 0;
  const totalOutstanding = activeEmis.reduce((s, e) => {
    const remaining = e.totalInstallments - e.paidInstallments;
    return s + remaining * e.emiAmount;
  }, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8257E6" />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>EMI Burden</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Monthly EMI vs Income</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total EMIs/mo</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalEmiMonthly)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Monthly Income</Text>
              <Text style={[styles.summaryAmount, { color: '#00C896' }]}>{formatCurrency(monthlyIncome)}</Text>
            </View>
          </View>

          {/* Burden bar */}
          <View style={styles.burdenRow}>
            <Text style={styles.burdenLabel}>EMI Burden</Text>
            <Text style={[styles.burdenPct, {
              color: burdenPct > 50 ? '#FF4757' : burdenPct > 30 ? '#FFA502' : '#00C896'
            }]}>{burdenPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: `${Math.min(burdenPct, 100)}%` as any,
              backgroundColor: burdenPct > 50 ? '#FF4757' : burdenPct > 30 ? '#FFA502' : '#00C896',
            }]} />
          </View>
          {burdenPct > 40 && (
            <View style={styles.warningBadge}>
              <MaterialIcons name="warning" size={14} color="#FFA502" />
              <Text style={styles.warningText}>High EMI burden — consider prepaying</Text>
            </View>
          )}
        </View>

        {/* Outstanding */}
        <View style={styles.outstandingCard}>
          <Text style={styles.outLabel}>Total Outstanding</Text>
          <Text style={styles.outAmount}>{formatCurrency(totalOutstanding)}</Text>
          <Text style={styles.outSub}>across {activeEmis.length} active EMI{activeEmis.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* EMI list */}
        {activeEmis.length === 0 ? (
          <Text style={styles.empty}>No active EMIs found.</Text>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active EMIs</Text>
            {activeEmis.map(emi => {
              const remaining = emi.totalInstallments - emi.paidInstallments;
              const outstanding = remaining * emi.emiAmount;
              const pct = Math.round((emi.paidInstallments / emi.totalInstallments) * 100);
              return (
                <View key={emi.id} style={styles.emiCard}>
                  <View style={styles.emiHeader}>
                    <Text style={styles.emiName}>{emi.name}</Text>
                    <Text style={styles.emiAmount}>{formatCurrencyCompact(emi.emiAmount)}/mo</Text>
                  </View>
                  <Text style={styles.emiLender}>{emi.lenderName}</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: '#8257E6' }]} />
                  </View>
                  <View style={styles.emiFooter}>
                    <Text style={styles.emiMeta}>{emi.paidInstallments}/{emi.totalInstallments} paid</Text>
                    <Text style={styles.emiOutstanding}>Outstanding: {formatCurrencyCompact(outstanding)}</Text>
                  </View>
                  <Text style={styles.emiDue}>Next due: {formatDate(emi.nextDueDate)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0D0D0D' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 },
  headerTitle:    { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  summaryCard:    { marginHorizontal: 20, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, marginBottom: 12 },
  summaryTitle:   { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 14 },
  summaryRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryLabel:   { fontSize: 11, color: '#6B6B6B', marginBottom: 4 },
  summaryAmount:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#2C2C2C' },
  burdenRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  burdenLabel:    { fontSize: 13, color: '#ABABAB' },
  burdenPct:      { fontSize: 20, fontWeight: '700' },
  progressTrack:  { height: 8, backgroundColor: '#2C2C2C', borderRadius: 4, marginBottom: 8 },
  progressFill:   { height: 8, borderRadius: 4 },
  warningBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFA50222', borderRadius: 8, padding: 8 },
  warningText:    { fontSize: 12, color: '#FFA502' },
  outstandingCard:{ marginHorizontal: 20, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 20 },
  outLabel:       { fontSize: 11, color: '#6B6B6B', marginBottom: 4 },
  outAmount:      { fontSize: 28, fontWeight: '700', color: '#FF4757' },
  outSub:         { fontSize: 11, color: '#4B4B4B', marginTop: 2 },
  section:        { paddingHorizontal: 20, paddingBottom: 30 },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  emiCard:        { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, marginBottom: 10 },
  emiHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  emiName:        { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  emiAmount:      { fontSize: 15, fontWeight: '700', color: '#8257E6' },
  emiLender:      { fontSize: 11, color: '#6B6B6B', marginBottom: 10 },
  emiFooter:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  emiMeta:        { fontSize: 11, color: '#6B6B6B' },
  emiOutstanding: { fontSize: 11, color: '#FF4757' },
  emiDue:         { fontSize: 11, color: '#FFA502', marginTop: 4 },
  empty:          { color: '#4B4B4B', textAlign: 'center', paddingTop: 80, fontSize: 15 },
});
