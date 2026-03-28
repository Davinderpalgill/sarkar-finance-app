import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Linking, Alert, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RentStackParamList } from '../../navigation/types/navigation';
import { useRentStore } from '../../store/rentStore';
import { useUiStore } from '../../store/uiStore';
import { RentRepository } from '../../storage/repositories/RentRepository';
import { RentRecord } from '../../models/RentRecord';
import { RentTenant } from '../../models/RentTenant';
import { RentUnit } from '../../models/RentUnit';
import { Building } from '../../models/Building';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<RentStackParamList, 'RentCollection'>;
  route: RouteProp<RentStackParamList, 'RentCollection'>;
};

function formatRupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

const STATUS_COLOR: Record<string, string> = {
  paid: '#00C896', partial: '#FFA502', pending: '#6B6B6B', overdue: '#FF4757',
};

export default function RentCollectionScreen({ navigation, route }: Props) {
  const userId = useUiStore(s => s.userId);
  const { records, loading, loadMonthlyRecords, ensureMonthlyRecords } = useRentStore();
  const [tenantMap, setTenantMap] = useState<Record<string, RentTenant>>({});
  const [unitMap, setUnitMap] = useState<Record<string, RentUnit>>({});
  const [buildingMap, setBuildingMap] = useState<Record<string, Building>>({});
  const [allBuildings, setAllBuildings] = useState<Building[]>([]);
  const [historyRecords, setHistoryRecords] = useState<RentRecord[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(
    route.params?.month ?? new Date().toISOString().slice(0, 7)
  );

  useEffect(() => {
    if (!userId) return;
    (async () => {
      await ensureMonthlyRecords(userId, selectedMonth);
      await loadMonthlyRecords(userId, selectedMonth);
      const history = await RentRepository.getHistoryMonthlyCollection(userId, selectedMonth);
      setHistoryRecords(history);
      const tenants = await RentRepository.getAllTenants(userId);
      const tMap: Record<string, RentTenant> = {};
      tenants.forEach(t => { tMap[t.id] = t; });
      setTenantMap(tMap);
      const units = await RentRepository.getAllUnitsForUser(userId);
      const uMap: Record<string, RentUnit> = {};
      units.forEach(u => { uMap[u.id] = u; });
      setUnitMap(uMap);
      // Load ALL buildings (active + archived) for filter chips
      const buildings = await RentRepository.getAllBuildings(userId);
      setAllBuildings(buildings);
      const bMap: Record<string, Building> = {};
      buildings.forEach(b => { bMap[b.id] = b; });
      setBuildingMap(bMap);
    })();
  }, [userId, selectedMonth]);

  // Apply building filter
  const activeRecords = selectedBuildingId
    ? records.filter(r => r.buildingId === selectedBuildingId)
    : records;
  const filteredHistory = selectedBuildingId
    ? historyRecords.filter(r => r.buildingId === selectedBuildingId)
    : historyRecords;

  const pending = activeRecords.filter(r => r.status === 'pending' || r.status === 'overdue');
  const totalDue = activeRecords.reduce((s, r) => s + r.amountDue, 0);
  const totalCollected = activeRecords.reduce((s, r) => s + r.amountPaid, 0);

  const changeMonth = (delta: number) => {
    const d = new Date(selectedMonth + '-01');
    d.setMonth(d.getMonth() + delta);
    setSelectedMonth(d.toISOString().slice(0, 7));
  };

  const sendBulkWhatsApp = () => {
    if (pending.length === 0) { Alert.alert('All paid!', 'No pending tenants to remind.'); return; }
    Alert.alert(
      'Send Reminders',
      `Send WhatsApp reminders to ${pending.length} pending tenant(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send', onPress: () => {
            pending.forEach(r => {
              const t = tenantMap[r.tenantId];
              if (!t) return;
              const phone = t.whatsappNumber || t.phone;
              const monthLabel = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });
              const msg = `Hi ${t.name}, your rent of ${formatRupees(r.amountDue)} for ${monthLabel} is due. Please pay by ${t.dueDay}th. Thank you.`;
              Linking.openURL(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`).catch(() => {});
            });
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: RentRecord }) => {
    const tenant = tenantMap[item.tenantId];
    const unit = unitMap[item.unitId];
    const building = buildingMap[item.buildingId];
    const locationLabel = [
      building?.name,
      unit ? `Unit ${unit.unitNumber}` : null,
    ].filter(Boolean).join(' · ');
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RecordRent', { recordId: item.id, tenantId: item.tenantId })}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(tenant?.name ?? '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tenantName}>{tenant?.name ?? 'Unknown'}</Text>
            {locationLabel ? <Text style={styles.unitLabel}>{locationLabel}</Text> : null}
            <Text style={styles.amountDue}>Due: {formatRupees(item.amountDue)}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
          </View>
          {item.amountPaid > 0 && (
            <Text style={styles.paidText}>Paid {formatRupees(item.amountPaid)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Monthly Collection</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <TouchableOpacity onPress={() => navigation.popToTop()}>
            <MaterialIcons name="home" size={22} color="#4B4B4B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={sendBulkWhatsApp}>
            <MaterialIcons name="send" size={22} color="#25D366" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}>
          <MaterialIcons name="chevron-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
          <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Building Filter */}
      {allBuildings.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedBuildingId === null && styles.filterChipActive]}
            onPress={() => setSelectedBuildingId(null)}
          >
            <Text style={[styles.filterChipText, selectedBuildingId === null && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {allBuildings.map(b => (
            <TouchableOpacity
              key={b.id}
              style={[
                styles.filterChip,
                selectedBuildingId === b.id && styles.filterChipActive,
                b.status === 'archived' && styles.filterChipArchived,
              ]}
              onPress={() => setSelectedBuildingId(b.id === selectedBuildingId ? null : b.id)}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.filterChipText,
                  selectedBuildingId === b.id && styles.filterChipTextActive,
                  b.status === 'archived' && styles.filterChipTextArchived,
                ]}
              >
                {b.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatRupees(totalCollected)}</Text>
          <Text style={styles.summaryLabel}>Collected</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#FF4757' }]}>{formatRupees(totalDue - totalCollected)}</Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{activeRecords.length}</Text>
          <Text style={styles.summaryLabel}>Tenants</Text>
        </View>
      </View>

      <FlatList
        data={activeRecords}
        keyExtractor={r => r.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.empty}>No records for this month.</Text>}
        ListFooterComponent={
          filteredHistory.length > 0 ? (
            <View style={{ marginTop: 20, gap: 10 }}>
              <View style={styles.historyHeader}>
                <MaterialIcons name="history" size={14} color="#6B6B6B" />
                <Text style={styles.historyLabel}>Past Tenants</Text>
              </View>
              {filteredHistory.map(item => {
                const tenant = tenantMap[item.tenantId];
                const unit = unitMap[item.unitId];
                const building = buildingMap[item.buildingId];
                const locationLabel = [
                  building?.name,
                  unit ? `Unit ${unit.unitNumber}` : null,
                ].filter(Boolean).join(' · ');
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.card, styles.historyCard]}
                    onPress={() => navigation.navigate('RecordRent', { recordId: item.id, tenantId: item.tenantId })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardLeft}>
                      <View style={[styles.avatar, styles.historyAvatar]}>
                        <Text style={styles.avatarText}>{(tenant?.name ?? '?').charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.tenantName, { color: '#6B6B6B' }]}>{tenant?.name ?? 'Removed Tenant'}</Text>
                        {locationLabel ? <Text style={styles.unitLabel}>{locationLabel}</Text> : null}
                        <Text style={styles.amountDue}>Due: {formatRupees(item.amountDue)}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
                        <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
                      </View>
                      {item.amountPaid > 0 && (
                        <Text style={styles.paidText}>Paid {formatRupees(item.amountPaid)}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0D0D0D' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title:          { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  monthSelector:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  monthArrow:     { padding: 8 },
  monthText:      { fontSize: 16, fontWeight: '700', color: '#FFFFFF', minWidth: 180, textAlign: 'center' },
  summaryRow:     { flexDirection: 'row', backgroundColor: '#1A1A1A', marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 8 },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryValue:   { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  summaryLabel:   { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: '#2C2C2C' },
  card:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14 },
  cardLeft:       { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar:         { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center' },
  avatarText:     { color: '#FFF', fontSize: 18, fontWeight: '700' },
  tenantName:     { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  unitLabel:      { fontSize: 11, color: '#8257E6', marginTop: 1 },
  amountDue:      { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  statusBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText:     { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  paidText:       { fontSize: 11, color: '#00C896' },
  empty:          { textAlign: 'center', color: '#4B4B4B', paddingTop: 60, fontSize: 14 },
  historyHeader:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginBottom: 2 },
  historyLabel:        { fontSize: 11, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 1 },
  historyCard:         { opacity: 0.7, borderWidth: 1, borderColor: '#2C2C2C' },
  historyAvatar:       { backgroundColor: '#2C2C2C' },
  filterRow:              { paddingHorizontal: 16, paddingBottom: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip:             { height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C', maxWidth: 140, alignItems: 'center', justifyContent: 'center' },
  filterChipActive:       { backgroundColor: '#8257E6', borderColor: '#8257E6' },
  filterChipArchived:     { borderColor: '#4B4B4B' },
  filterChipText:         { fontSize: 12, fontWeight: '600', color: '#6B6B6B', lineHeight: 16 },
  filterChipTextActive:   { color: '#FFFFFF' },
  filterChipTextArchived: { color: '#4B4B4B' },
});
