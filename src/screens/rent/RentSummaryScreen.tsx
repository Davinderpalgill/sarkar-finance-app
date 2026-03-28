import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RentStackParamList } from '../../navigation/types/navigation';
import { useUiStore } from '../../store/uiStore';
import { RentRepository } from '../../storage/repositories/RentRepository';
import { RentTenant } from '../../models/RentTenant';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = { navigation: NativeStackNavigationProp<RentStackParamList, 'RentSummary'> };

function formatRupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function RentSummaryScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId);
  const year = new Date().getFullYear().toString();

  const [loading, setLoading] = useState(true);
  const [annualData, setAnnualData] = useState<{ month: string; collected: number; due: number }[]>([]);
  const [occupancy, setOccupancy] = useState({ total: 0, occupied: 0, vacant: 0 });
  const [expiringLeases, setExpiringLeases] = useState<RentTenant[]>([]);
  const [overdueItems, setOverdueItems] = useState<{ tenant: RentTenant; overdueMonths: string[] }[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [annual, occ, expiring, overdue] = await Promise.all([
          RentRepository.getAnnualSummary(userId, year),
          RentRepository.getOccupancyStats(userId),
          RentRepository.getExpiringLeases(userId, 45),
          RentRepository.getMultiMonthOverdue(userId),
        ]);
        setAnnualData(annual);
        setOccupancy(occ);
        setExpiringLeases(expiring);
        setOverdueItems(overdue);
      } catch (e) {
        console.warn('RentSummaryScreen load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const totalCollected = annualData.reduce((s, d) => s + d.collected, 0);
  const totalDue = annualData.reduce((s, d) => s + d.due, 0);
  const maxCollected = Math.max(...annualData.map(d => d.collected), 1);
  const occupancyPct = occupancy.total > 0
    ? Math.round((occupancy.occupied / occupancy.total) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Rent Summary {year}</Text>
        <TouchableOpacity onPress={() => navigation.popToTop()}>
          <MaterialIcons name="home" size={22} color="#4B4B4B" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#8257E6" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Annual Income */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Annual Income</Text>
            <View style={styles.card}>
              <View style={styles.incomeRow}>
                <View style={styles.incomeItem}>
                  <Text style={styles.incomeValue}>{formatRupees(totalCollected)}</Text>
                  <Text style={styles.incomeLabel}>Collected</Text>
                </View>
                <View style={styles.incomeDivider} />
                <View style={styles.incomeItem}>
                  <Text style={[styles.incomeValue, { color: '#FF4757' }]}>
                    {formatRupees(Math.max(0, totalDue - totalCollected))}
                  </Text>
                  <Text style={styles.incomeLabel}>Outstanding</Text>
                </View>
              </View>

              {/* Bar chart */}
              <View style={styles.barChart}>
                {Array.from({ length: 12 }, (_, i) => {
                  const m = `${year}-${String(i + 1).padStart(2, '0')}`;
                  const d = annualData.find(x => x.month === m);
                  const h = d ? (d.collected / maxCollected) * 80 : 0;
                  return (
                    <View key={m} style={styles.barCol}>
                      <View style={styles.barBg}>
                        <View style={[styles.barFill, { height: h }]} />
                      </View>
                      <Text style={styles.barLabel}>{MONTH_NAMES[i]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Occupancy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Occupancy Rate</Text>
            <View style={styles.card}>
              <View style={styles.occupancyRow}>
                <View style={styles.occupancyCircle}>
                  <Text style={styles.occupancyPct}>{occupancyPct}%</Text>
                  <Text style={styles.occupancyLabel}>Occupied</Text>
                </View>
                <View style={styles.occupancyStats}>
                  <View style={styles.occStatRow}>
                    <View style={[styles.occDot, { backgroundColor: '#00C896' }]} />
                    <Text style={styles.occStatLabel}>Occupied</Text>
                    <Text style={styles.occStatValue}>{occupancy.occupied}</Text>
                  </View>
                  <View style={styles.occStatRow}>
                    <View style={[styles.occDot, { backgroundColor: '#2C2C2C' }]} />
                    <Text style={styles.occStatLabel}>Vacant</Text>
                    <Text style={styles.occStatValue}>{occupancy.vacant}</Text>
                  </View>
                  <View style={styles.occStatRow}>
                    <View style={[styles.occDot, { backgroundColor: '#8257E6' }]} />
                    <Text style={styles.occStatLabel}>Total Units</Text>
                    <Text style={styles.occStatValue}>{occupancy.total}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Expiring Leases */}
          {expiringLeases.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Leases Expiring (45 days)</Text>
              <View style={styles.card}>
                {expiringLeases.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.alertRow}
                    onPress={() => navigation.navigate('TenantDetail', { tenantId: t.id })}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="event-busy" size={18} color="#FFA502" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alertName}>{t.name}</Text>
                      <Text style={styles.alertSub}>Expires: {formatDate(t.leaseEnd!)}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={18} color="#4B4B4B" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Multi-month Overdue */}
          {overdueItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Multi-month Overdue</Text>
              <View style={styles.card}>
                {overdueItems.map(({ tenant, overdueMonths }) => (
                  <TouchableOpacity
                    key={tenant.id}
                    style={styles.alertRow}
                    onPress={() => navigation.navigate('TenantDetail', { tenantId: tenant.id })}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="warning" size={18} color="#FF4757" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alertName}>{tenant.name}</Text>
                      <Text style={styles.alertSub}>{overdueMonths.length} months overdue: {overdueMonths.join(', ')}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={18} color="#4B4B4B" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {annualData.length === 0 && expiringLeases.length === 0 && overdueItems.length === 0 && (
            <View style={styles.emptyBox}>
              <MaterialIcons name="analytics" size={48} color="#2C2C2C" />
              <Text style={styles.emptyText}>No data yet for {year}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0D0D0D' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title:          { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  content:        { padding: 16, gap: 16, paddingBottom: 40 },
  section:        { gap: 8 },
  sectionTitle:   { fontSize: 12, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4 },
  card:           { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, gap: 12 },
  incomeRow:      { flexDirection: 'row' },
  incomeItem:     { flex: 1, alignItems: 'center', gap: 2 },
  incomeValue:    { fontSize: 18, fontWeight: '800', color: '#00C896' },
  incomeLabel:    { fontSize: 12, color: '#6B6B6B' },
  incomeDivider:  { width: 1, backgroundColor: '#2C2C2C' },
  barChart:       { flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingTop: 8 },
  barCol:         { flex: 1, alignItems: 'center', gap: 4 },
  barBg:          { width: '100%', height: 80, backgroundColor: '#2C2C2C', borderRadius: 4, justifyContent: 'flex-end' },
  barFill:        { width: '100%', backgroundColor: '#8257E6', borderRadius: 4, minHeight: 2 },
  barLabel:       { fontSize: 8, color: '#6B6B6B' },
  occupancyRow:   { flexDirection: 'row', alignItems: 'center', gap: 20 },
  occupancyCircle:{ width: 90, height: 90, borderRadius: 45, borderWidth: 6, borderColor: '#8257E6', alignItems: 'center', justifyContent: 'center' },
  occupancyPct:   { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  occupancyLabel: { fontSize: 10, color: '#6B6B6B' },
  occupancyStats: { flex: 1, gap: 8 },
  occStatRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  occDot:         { width: 10, height: 10, borderRadius: 5 },
  occStatLabel:   { flex: 1, fontSize: 13, color: '#6B6B6B' },
  occStatValue:   { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  alertRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  alertName:      { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  alertSub:       { fontSize: 12, color: '#6B6B6B', marginTop: 1 },
  emptyBox:       { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:      { fontSize: 15, color: '#4B4B4B' },
});
