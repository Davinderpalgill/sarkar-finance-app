import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RentStackParamList } from '../../navigation/types/navigation';
import { useRentStore } from '../../store/rentStore';
import { RentUnit } from '../../models/RentUnit';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<RentStackParamList, 'BuildingDetail'>;
  route: RouteProp<RentStackParamList, 'BuildingDetail'>;
};

function formatRupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

export default function BuildingDetailScreen({ navigation, route }: Props) {
  const { buildingId } = route.params;
  const { buildings, units, loadUnits } = useRentStore();
  const building = buildings.find(b => b.id === buildingId);

  useEffect(() => {
    loadUnits(buildingId);
  }, [buildingId]);

  const occupied = units.filter(u => u.status === 'occupied').length;
  const vacant   = units.filter(u => u.status === 'vacant').length;

  const renderUnit = ({ item }: { item: RentUnit }) => (
    <TouchableOpacity
      style={styles.unitCard}
      onPress={() => {
        if (item.status === 'occupied') {
          navigation.navigate('UnitTenants', { buildingId, unitId: item.id });
        } else {
          navigation.navigate('AddTenant', { buildingId, unitId: item.id });
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.unitLeft}>
        <View style={[styles.unitBadge, item.status === 'occupied' ? styles.occupied : styles.vacant]}>
          <Text style={styles.unitBadgeText}>{item.unitNumber}</Text>
        </View>
        <View>
          <Text style={styles.unitLabel}>Unit {item.unitNumber}</Text>
          <Text style={styles.unitRent}>{formatRupees(item.monthlyRent)}/mo</Text>
        </View>
      </View>
      <View style={styles.unitRight}>
        {item.status === 'occupied' ? (
          <View style={[styles.statusBadge, styles.occupiedBadge]}>
            <Text style={styles.statusText}>occupied</Text>
          </View>
        ) : (
          <View style={styles.addTenantBtn}>
            <MaterialIcons name="person-add" size={14} color="#8257E6" />
            <Text style={styles.addTenantText}>Add Tenant</Text>
          </View>
        )}
        <MaterialIcons name="chevron-right" size={18} color="#4B4B4B" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{building?.name ?? 'Building'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <TouchableOpacity onPress={() => navigation.popToTop()}>
            <MaterialIcons name="home" size={22} color="#4B4B4B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AddBuilding', { buildingId })}>
            <MaterialIcons name="edit" size={22} color="#8257E6" />
          </TouchableOpacity>
        </View>
      </View>

      {building?.address ? (
        <Text style={styles.address}>{building.address}</Text>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{units.length}</Text>
          <Text style={styles.statLabel}>Total Units</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#00C896' }]}>{occupied}</Text>
          <Text style={styles.statLabel}>Occupied</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#6B6B6B' }]}>{vacant}</Text>
          <Text style={styles.statLabel}>Vacant</Text>
        </View>
      </View>

      <FlatList
        data={units}
        keyExtractor={u => u.id}
        renderItem={renderUnit}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>No units yet. Edit building to add units.</Text>}
      />

      <TouchableOpacity
        style={styles.maintBtn}
        onPress={() => navigation.navigate('MaintenanceLogs', { buildingId })}
      >
        <MaterialIcons name="handyman" size={18} color="#FF4757" />
        <Text style={styles.maintBtnText}>Maintenance</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddBuilding', { buildingId })}
      >
        <MaterialIcons name="edit" size={24} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0D0D0D' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title:         { fontSize: 18, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  address:       { fontSize: 13, color: '#6B6B6B', textAlign: 'center', marginTop: -8, marginBottom: 8, paddingHorizontal: 20 },
  statsRow:      { flexDirection: 'row', backgroundColor: '#1A1A1A', marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 8 },
  statItem:      { flex: 1, alignItems: 'center' },
  statValue:     { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  statLabel:     { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  statDivider:   { width: 1, backgroundColor: '#2C2C2C' },
  unitCard:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14 },
  unitLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unitBadge:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  occupied:      { backgroundColor: '#00C89622' },
  vacant:        { backgroundColor: '#2C2C2C' },
  unitBadgeText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  unitLabel:     { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  unitRent:      { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  unitRight:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  occupiedBadge: { backgroundColor: '#00C89622' },
  vacantBadge:   { backgroundColor: '#2C2C2C' },
  statusText:    { fontSize: 11, color: '#ABABAB', textTransform: 'capitalize', fontWeight: '600' },
  addTenantBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8257E622', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#8257E644' },
  addTenantText: { fontSize: 12, color: '#8257E6', fontWeight: '700' },
  empty:         { textAlign: 'center', color: '#4B4B4B', paddingTop: 60, fontSize: 14 },
  maintBtn:      { position: 'absolute', left: 20, bottom: 32, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF475722', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#FF475744' },
  maintBtnText:  { fontSize: 14, fontWeight: '700', color: '#FF4757' },
  fab:           { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
