import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { EmiStackParamList } from '../../navigation/types/navigation';
import { EMI, EmiInstallment } from '../../models/EMI';
import { useEmiStore } from '../../store/emiStore';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDate, daysUntil } from '../../utils/dateUtils';

type Props = {
  navigation: NativeStackNavigationProp<EmiStackParamList, 'EMIDetail'>;
  route:      RouteProp<EmiStackParamList, 'EMIDetail'>;
};

export default function EMIDetailScreen({ route }: Props) {
  const { getInstallments, markInstallmentPaid, emis } = useEmiStore();
  const [installments, setInstallments] = useState<EmiInstallment[]>([]);
  const [loading, setLoading] = useState(true);

  const emi = emis.find(e => e.id === route.params.id);

  useEffect(() => {
    if (emi) {
      getInstallments(emi.id).then(inst => {
        setInstallments(inst);
        setLoading(false);
      });
    }
  }, [emi?.id]);

  if (!emi) return null;

  const handleMarkPaid = async (inst: EmiInstallment) => {
    Alert.alert(
      'Mark as Paid',
      `Mark installment #${inst.installmentNumber} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            await markInstallmentPaid(emi.id, inst.id, null);
            const updated = await getInstallments(emi.id);
            setInstallments(updated);
          },
        },
      ]
    );
  };

  const progress = emi.totalInstallments > 0 ? emi.paidInstallments / emi.totalInstallments : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.hero}>
          <Text style={styles.heroName}>{emi.name}</Text>
          <Text style={styles.heroLender}>{emi.lenderName}</Text>
          <Text style={styles.heroAmount}>{formatCurrency(emi.emiAmount)}/month</Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{emi.paidInstallments}/{emi.totalInstallments} paid · {Math.round(progress * 100)}%</Text>
        </View>

        {/* Info */}
        <View style={styles.card}>
          {[
            ['Principal', formatCurrency(emi.principalAmount)],
            ['Start Date', formatDate(emi.startDate)],
            ['Next Due', formatDate(emi.nextDueDate)],
            ['End Date', formatDate(emi.endDate)],
            ['Reminder', `${emi.reminderDaysBefore} days before`],
            ...(emi.interestRate ? [['Interest Rate', `${emi.interestRate}%`]] : []),
            ...(emi.loanAccountNumber ? [['Loan A/C', emi.loanAccountNumber]] : []),
          ].map(([label, value]) => (
            <View key={label as string} style={styles.field}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <Text style={styles.fieldValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Installments Timeline */}
        <Text style={styles.sectionTitle}>Installment Timeline</Text>
        {loading
          ? <ActivityIndicator color="#8257E6" />
          : installments.map(inst => (
            <View key={inst.id} style={[styles.instRow, inst.paid && styles.instPaid]}>
              <View style={[styles.instDot, inst.paid ? styles.dotPaid : styles.dotUnpaid]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.instNum}>#{inst.installmentNumber}</Text>
                <Text style={styles.instDate}>{formatDate(inst.dueDate)}</Text>
              </View>
              <Text style={styles.instAmount}>{formatCurrency(inst.amount)}</Text>
              {!inst.paid && (
                <TouchableOpacity style={styles.payBtn} onPress={() => handleMarkPaid(inst)}>
                  <Text style={styles.payBtnText}>Mark Paid</Text>
                </TouchableOpacity>
              )}
              {inst.paid && <Text style={styles.paidLabel}>✓ Paid</Text>}
            </View>
          ))
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0D0D0D' },
  content:      { padding: 16, gap: 16 },
  hero:         { backgroundColor: '#1A1A1A', borderRadius: 20, padding: 24, gap: 8, alignItems: 'center' },
  heroName:     { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  heroLender:   { fontSize: 14, color: '#6B6B6B' },
  heroAmount:   { fontSize: 28, fontWeight: '700', color: '#8257E6', marginTop: 4 },
  progressBg:   { height: 8, backgroundColor: '#0D0D0D', borderRadius: 4, width: '100%', marginTop: 8 },
  progressFill: { height: 8, backgroundColor: '#8257E6', borderRadius: 4 },
  progressLabel:{ fontSize: 12, color: '#ABABAB' },
  card:         { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, gap: 12 },
  field:        { flexDirection: 'row', justifyContent: 'space-between' },
  fieldLabel:   { fontSize: 14, color: '#6B6B6B' },
  fieldValue:   { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  instRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14 },
  instPaid:     { opacity: 0.6 },
  instDot:      { width: 12, height: 12, borderRadius: 6 },
  dotPaid:      { backgroundColor: '#00C896' },
  dotUnpaid:    { backgroundColor: '#FF4757' },
  instNum:      { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  instDate:     { fontSize: 12, color: '#6B6B6B' },
  instAmount:   { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  payBtn:       { backgroundColor: '#8257E6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  payBtnText:   { color: '#FFF', fontSize: 12, fontWeight: '600' },
  paidLabel:    { fontSize: 12, color: '#00C896', fontWeight: '600' },
});
