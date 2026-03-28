import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { RentStackParamList } from '../../navigation/types/navigation';
import { useRentStore } from '../../store/rentStore';
import { RentTenant } from '../../models/RentTenant';
import { RentRepository } from '../../storage/repositories/RentRepository';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<RentStackParamList, 'UnitTenants'>;
  route: RouteProp<RentStackParamList, 'UnitTenants'>;
};

function formatRupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

export default function UnitTenantsScreen({ navigation, route }: Props) {
  const { buildingId, unitId } = route.params;
  const { units, updateUnitNote } = useRentStore();
  const unit = units.find(u => u.id === unitId);

  const [tenants, setTenants] = useState<RentTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState(unit?.note ?? '');
  const [editingNote, setEditingNote] = useState(false);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const result = await RentRepository.getUnitTenants(unitId);
      setTenants(result);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useFocusEffect(
    useCallback(() => {
      loadTenants();
      setNoteText(unit?.note ?? '');
    }, [loadTenants, unit?.note])
  );

  const saveNote = async () => {
    try {
      await updateUnitNote(unitId, noteText.trim() || null);
      setEditingNote(false);
    } catch (e) {
      console.warn('updateUnitNote error', e);
      setEditingNote(false);
    }
  };

  const activeTenants   = tenants.filter(t => t.status === 'active');
  const inactiveTenants = tenants.filter(t => t.status === 'inactive');

  const renderTenant = ({ item }: { item: RentTenant }) => (
    <TouchableOpacity
      style={styles.tenantCard}
      onPress={() => navigation.navigate('TenantDetail', { tenantId: item.id })}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, item.status === 'inactive' && styles.avatarInactive]}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.tenantInfo}>
        <Text style={styles.tenantName}>{item.name}</Text>
        <Text style={styles.tenantRent}>{formatRupees(item.monthlyRent)}/mo · Due {item.dueDay}th</Text>
        <Text style={styles.tenantPhone}>{item.phone}</Text>
      </View>
      <View style={styles.tenantRight}>
        <View style={[styles.statusBadge, item.status === 'active' ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, { color: item.status === 'active' ? '#00C896' : '#6B6B6B' }]}>
            {item.status}
          </Text>
        </View>
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
        <Text style={styles.title}>
          {unit ? `Unit ${unit.unitNumber}` : 'Unit Tenants'}
        </Text>
        <TouchableOpacity onPress={() => navigation.popToTop()}>
          <MaterialIcons name="home" size={22} color="#4B4B4B" />
        </TouchableOpacity>
      </View>

      {unit && (
        <View style={styles.unitBanner}>
          <MaterialIcons name="home" size={16} color="#8257E6" />
          <Text style={styles.unitBannerText}>{formatRupees(unit.monthlyRent)}/mo</Text>
          <TouchableOpacity
            style={styles.addTenantBannerBtn}
            onPress={() => navigation.navigate('AddTenant', { buildingId, unitId })}
          >
            <MaterialIcons name="person-add" size={14} color="#8257E6" />
            <Text style={styles.addTenantBannerText}>Add Tenant</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Unit Note */}
      <View style={styles.noteSection}>
        {editingNote ? (
          <View style={styles.noteEditRow}>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Add a note for this unit..."
              placeholderTextColor="#4B4B4B"
              multiline
              autoFocus
            />
            <TouchableOpacity style={styles.noteSaveBtn} onPress={saveNote}>
              <Text style={styles.noteSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.noteDisplay} onPress={() => setEditingNote(true)} activeOpacity={0.7}>
            <MaterialIcons name="sticky-note-2" size={14} color="#6B6B6B" />
            <Text style={[styles.noteText, !unit?.note && styles.notePlaceholder]} numberOfLines={2}>
              {unit?.note || 'Tap to add a unit note...'}
            </Text>
            <MaterialIcons name="edit" size={14} color="#4B4B4B" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#8257E6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={t => t.id}
          renderItem={renderTenant}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ListHeaderComponent={
            activeTenants.length > 0 && inactiveTenants.length > 0 ? (
              <Text style={styles.sectionLabel}>Active Tenants</Text>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No tenants for this unit yet.</Text>
          }
          ItemSeparatorComponent={() => null}
          stickyHeaderIndices={[]}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTenant', { buildingId, unitId })}
      >
        <MaterialIcons name="person-add" size={24} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0D0D0D' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title:           { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  unitBanner:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8257E622', borderRadius: 10, marginHorizontal: 16, marginBottom: 8, padding: 10 },
  unitBannerText:     { fontSize: 14, color: '#8257E6', fontWeight: '600', flex: 1 },
  addTenantBannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8257E6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  addTenantBannerText:{ fontSize: 12, color: '#FFF', fontWeight: '700' },
  sectionLabel:    { fontSize: 11, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  tenantCard:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14 },
  avatar:          { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center' },
  avatarInactive:  { backgroundColor: '#2C2C2C' },
  avatarText:      { fontSize: 18, fontWeight: '800', color: '#FFF' },
  tenantInfo:      { flex: 1, gap: 2 },
  tenantName:      { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  tenantRent:      { fontSize: 12, color: '#6B6B6B' },
  tenantPhone:     { fontSize: 12, color: '#4B4B4B' },
  tenantRight:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeBadge:     { backgroundColor: '#00C89622' },
  inactiveBadge:   { backgroundColor: '#2C2C2C' },
  statusText:      { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  noteSection:     { marginHorizontal: 16, marginBottom: 4 },
  noteDisplay:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1A1A1A', borderRadius: 10, padding: 10 },
  noteText:        { flex: 1, fontSize: 13, color: '#ABABAB' },
  notePlaceholder: { color: '#4B4B4B' },
  noteEditRow:     { gap: 8 },
  noteInput:       { backgroundColor: '#1A1A1A', borderRadius: 10, padding: 10, color: '#FFFFFF', fontSize: 13, borderWidth: 1, borderColor: '#2C2C2C', minHeight: 60, textAlignVertical: 'top' },
  noteSaveBtn:     { backgroundColor: '#8257E6', borderRadius: 10, padding: 10, alignItems: 'center' },
  noteSaveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  empty:           { textAlign: 'center', color: '#4B4B4B', paddingTop: 60, fontSize: 14 },
  fab:             { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
