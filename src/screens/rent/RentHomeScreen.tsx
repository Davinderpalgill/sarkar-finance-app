import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RentStackParamList } from '../../navigation/types/navigation';
import { useRentStore } from '../../store/rentStore';
import { useUiStore } from '../../store/uiStore';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = { navigation: NativeStackNavigationProp<RentStackParamList, 'RentHome'> };

function formatRupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function RentHomeScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId);
  const { buildings, records, loading, loadBuildings, loadMonthlyRecords, ensureMonthlyRecords } = useRentStore();
  const month = currentMonth();

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      (async () => {
        try {
          await loadBuildings(userId);
          await ensureMonthlyRecords(userId, month);
          await loadMonthlyRecords(userId, month);
        } catch (e) {
          console.warn('RentHomeScreen load error', e);
        }
      })();
    }, [userId])
  );

  const totalCollected = records.filter(r => r.status === 'paid' || r.status === 'partial')
    .reduce((s, r) => s + r.amountPaid, 0);
  const totalPending = records.filter(r => r.status === 'pending' || r.status === 'overdue')
    .reduce((s, r) => s + r.amountDue, 0);
  const overdueCount = records.filter(r => r.status === 'overdue').length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Rent Collection</Text>
        <Text style={styles.monthLabel}>{new Date(month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: '#00C896' }]}>
            <MaterialIcons name="check-circle" size={22} color="#00C896" />
            <Text style={styles.summaryValue}>{formatRupees(totalCollected)}</Text>
            <Text style={styles.summaryLabel2}>Collected</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: '#FFA502' }]}>
            <MaterialIcons name="schedule" size={22} color="#FFA502" />
            <Text style={styles.summaryValue}>{formatRupees(totalPending)}</Text>
            <Text style={styles.summaryLabel2}>Pending</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: '#FF4757' }]}>
            <MaterialIcons name="warning" size={22} color="#FF4757" />
            <Text style={styles.summaryValue}>{overdueCount}</Text>
            <Text style={styles.summaryLabel2}>Overdue</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('RentCollection', {})}>
              <View style={[styles.actionIcon, { backgroundColor: '#8257E622' }]}>
                <MaterialIcons name="list-alt" size={20} color="#8257E6" />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Monthly Collection</Text>
                <Text style={styles.actionSub}>View & record payments</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#4B4B4B" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('BuildingList')}>
              <View style={[styles.actionIcon, { backgroundColor: '#F59E0B22' }]}>
                <MaterialIcons name="business" size={20} color="#F59E0B" />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Buildings & Units</Text>
                <Text style={styles.actionSub}>{buildings.length} building{buildings.length !== 1 ? 's' : ''}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#4B4B4B" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('RentSummary')}>
              <View style={[styles.actionIcon, { backgroundColor: '#00C89622' }]}>
                <MaterialIcons name="analytics" size={20} color="#00C896" />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Annual Summary</Text>
                <Text style={styles.actionSub}>Income, occupancy & alerts</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#4B4B4B" />
            </TouchableOpacity>
          </View>
        </View>

        {loading && <ActivityIndicator color="#8257E6" style={{ marginTop: 20 }} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0D0D0D' },
  content:       { padding: 20, gap: 20, paddingBottom: 40 },
  heading:       { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  monthLabel:    { fontSize: 14, color: '#6B6B6B', marginTop: -12 },
  summaryRow:    { flexDirection: 'row', gap: 10 },
  summaryCard:   { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1 },
  summaryValue:  { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  summaryLabel2: { fontSize: 11, color: '#6B6B6B' },
  section:       { gap: 8 },
  sectionTitle:  { fontSize: 12, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4 },
  actionsCard:   { backgroundColor: '#1A1A1A', borderRadius: 16 },
  actionRow:     { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  actionIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionText:    { flex: 1 },
  actionLabel:   { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  actionSub:     { fontSize: 12, color: '#6B6B6B', marginTop: 1 },
  divider:       { height: 1, backgroundColor: '#2C2C2C', marginHorizontal: 14 },
});
