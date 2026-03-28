import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RentStackParamList } from '../../navigation/types/navigation';
import { useRentStore } from '../../store/rentStore';
import { useUiStore } from '../../store/uiStore';
import { RentUnit } from '../../models/RentUnit';
import { generateId } from '../../utils/generateId';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<RentStackParamList, 'AddBuilding'>;
  route: RouteProp<RentStackParamList, 'AddBuilding'>;
};

interface UnitDraft {
  id: string;
  unitNumber: string;
  monthlyRent: string;
  securityDeposit: string;
  existing: boolean;
}

export default function AddBuildingScreen({ navigation, route }: Props) {
  const { buildingId } = route.params ?? {};
  const userId = useUiStore(s => s.userId);
  const { buildings, units: existingUnits, addBuilding, updateBuilding, addUnit, updateUnit, deleteUnit, loadUnits } = useRentStore();

  const building = buildings.find(b => b.id === buildingId);
  const isEdit = !!buildingId;

  const [name, setName] = useState(building?.name ?? '');
  const [address, setAddress] = useState(building?.address ?? '');
  const [unitDrafts, setUnitDrafts] = useState<UnitDraft[]>([]);

  useEffect(() => {
    if (buildingId) {
      loadUnits(buildingId).then(() => {});
    }
  }, [buildingId]);

  useEffect(() => {
    if (isEdit && existingUnits.length > 0) {
      setUnitDrafts(existingUnits.map(u => ({
        id: u.id,
        unitNumber: u.unitNumber,
        monthlyRent: String(u.monthlyRent / 100),
        securityDeposit: String(u.securityDeposit / 100),
        existing: true,
      })));
    }
  }, [existingUnits]);

  const addUnitDraft = () => {
    setUnitDrafts(prev => [...prev, {
      id: generateId(), unitNumber: '', monthlyRent: '', securityDeposit: '', existing: false,
    }]);
  };

  const updateDraft = (id: string, key: keyof UnitDraft, value: string) => {
    setUnitDrafts(prev => prev.map(u => u.id === id ? { ...u, [key]: value } : u));
  };

  const removeDraft = (id: string) => {
    setUnitDrafts(prev => prev.filter(u => u.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Building name is required.'); return; }
    if (!userId) return;

    try {
      let bId = buildingId;
      if (!isEdit) {
        const b = await addBuilding(userId, name.trim(), address.trim());
        bId = b.id;
      } else {
        await updateBuilding(buildingId!, name.trim(), address.trim());
      }

      // Handle units
      for (const draft of unitDrafts) {
        if (!draft.unitNumber.trim()) continue;
        const rentPaise    = Math.round(parseFloat(draft.monthlyRent || '0') * 100);
        const depositPaise = Math.round(parseFloat(draft.securityDeposit || '0') * 100);

        if (draft.existing) {
          const existing = existingUnits.find(u => u.id === draft.id);
          if (existing) {
            await updateUnit(draft.id, draft.unitNumber.trim(), rentPaise, depositPaise);
          }
        } else {
          await addUnit(bId!, userId, draft.unitNumber.trim(), rentPaise, depositPaise);
        }
      }

      // Delete removed existing units (those in existingUnits but not in drafts)
      const draftIds = new Set(unitDrafts.filter(d => d.existing).map(d => d.id));
      for (const u of existingUnits) {
        if (!draftIds.has(u.id) && u.status === 'vacant') {
          await deleteUnit(u.id);
        }
      }

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save building.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{isEdit ? 'Edit Building' : 'Add Building'}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveBtn}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Building Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Gill Apartments"
              placeholderTextColor="#4B4B4B"
            />
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={address}
              onChangeText={setAddress}
              placeholder="Street, City"
              placeholderTextColor="#4B4B4B"
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Units</Text>
              <TouchableOpacity onPress={addUnitDraft} style={styles.addUnitBtn}>
                <MaterialIcons name="add" size={16} color="#8257E6" />
                <Text style={styles.addUnitText}>Add Unit</Text>
              </TouchableOpacity>
            </View>

            {unitDrafts.map((draft, idx) => (
              <View key={draft.id} style={styles.unitCard}>
                <View style={styles.unitCardHeader}>
                  <Text style={styles.unitCardTitle}>Unit {idx + 1}</Text>
                  <TouchableOpacity onPress={() => removeDraft(draft.id)}>
                    <MaterialIcons name="close" size={18} color="#FF4757" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  value={draft.unitNumber}
                  onChangeText={v => updateDraft(draft.id, 'unitNumber', v)}
                  placeholder="Unit number (e.g. 101)"
                  placeholderTextColor="#4B4B4B"
                />
                <TextInput
                  style={styles.input}
                  value={draft.monthlyRent}
                  onChangeText={v => updateDraft(draft.id, 'monthlyRent', v)}
                  placeholder="Monthly rent (₹)"
                  placeholderTextColor="#4B4B4B"
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={draft.securityDeposit}
                  onChangeText={v => updateDraft(draft.id, 'securityDeposit', v)}
                  placeholder="Security deposit (₹)"
                  placeholderTextColor="#4B4B4B"
                  keyboardType="numeric"
                />
              </View>
            ))}

            {unitDrafts.length === 0 && (
              <TouchableOpacity style={styles.addUnitCard} onPress={addUnitDraft}>
                <MaterialIcons name="add-circle-outline" size={28} color="#4B4B4B" />
                <Text style={styles.addUnitCardText}>Tap to add units</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0D0D0D' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title:          { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  saveBtn:        { fontSize: 16, fontWeight: '700', color: '#8257E6' },
  content:        { padding: 16, gap: 20, paddingBottom: 60 },
  section:        { gap: 10 },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  addUnitBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addUnitText:    { fontSize: 14, color: '#8257E6', fontWeight: '600' },
  label:          { fontSize: 13, color: '#6B6B6B', fontWeight: '600' },
  input:          { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2C2C2C' },
  multiline:      { minHeight: 64, textAlignVertical: 'top' },
  unitCard:       { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: '#2C2C2C' },
  unitCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unitCardTitle:  { fontSize: 14, fontWeight: '700', color: '#ABABAB' },
  addUnitCard:    { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#2C2C2C' },
  addUnitCardText:{ fontSize: 14, color: '#4B4B4B' },
});
