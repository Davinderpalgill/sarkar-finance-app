import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RentStackParamList } from '../../navigation/types/navigation';
import { useRentStore } from '../../store/rentStore';
import { useUiStore } from '../../store/uiStore';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<RentStackParamList, 'AddTenant'>;
  route: RouteProp<RentStackParamList, 'AddTenant'>;
};

export default function AddTenantScreen({ navigation, route }: Props) {
  const { buildingId, unitId } = route.params;
  const userId = useUiStore(s => s.userId);
  const { units, addTenant } = useRentStore();
  const unit = units.find(u => u.id === unitId);

  const [name, setName]            = useState('');
  const [phone, setPhone]          = useState('');
  const [whatsapp, setWhatsapp]    = useState('');
  const [rent, setRent]            = useState(unit ? String(unit.monthlyRent / 100) : '');
  const [dueDay, setDueDay]        = useState('5');
  const [leaseStart, setLeaseStart] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const handleSave = async () => {
    if (!name.trim())  { Alert.alert('Error', 'Tenant name is required.'); return; }
    if (!phone.trim()) { Alert.alert('Error', 'Phone number is required.'); return; }
    if (!userId) return;

    const rentPaise = Math.round(parseFloat(rent || '0') * 100);
    const due = parseInt(dueDay, 10);
    if (isNaN(due) || due < 1 || due > 28) {
      Alert.alert('Error', 'Due day must be between 1 and 28.');
      return;
    }

    try {
      await addTenant({
        unitId,
        buildingId,
        userId,
        name: name.trim(),
        phone: phone.trim(),
        whatsappNumber: whatsapp.trim() || null,
        leaseStart: new Date(leaseStart).getTime(),
        leaseEnd: null,
        monthlyRent: rentPaise,
        dueDay: due,
        status: 'active',
        documents: [],
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to add tenant.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Tenant</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveBtn}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {unit && (
            <View style={styles.unitBanner}>
              <MaterialIcons name="home" size={16} color="#8257E6" />
              <Text style={styles.unitBannerText}>Unit {unit.unitNumber}</Text>
            </View>
          )}

          <Field label="Full Name *">
            <TextInput style={styles.input} value={name} onChangeText={setName}
              placeholder="Tenant name" placeholderTextColor="#4B4B4B" />
          </Field>
          <Field label="Phone *">
            <TextInput style={styles.input} value={phone} onChangeText={setPhone}
              placeholder="10-digit number" placeholderTextColor="#4B4B4B" keyboardType="phone-pad" />
          </Field>
          <Field label="WhatsApp Number (if different)">
            <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp}
              placeholder="Leave blank to use phone" placeholderTextColor="#4B4B4B" keyboardType="phone-pad" />
          </Field>
          <Field label="Monthly Rent (₹) *">
            <TextInput style={styles.input} value={rent} onChangeText={setRent}
              placeholder="e.g. 8000" placeholderTextColor="#4B4B4B" keyboardType="numeric" />
          </Field>
          <Field label="Due Day (1–28)">
            <TextInput style={styles.input} value={dueDay} onChangeText={setDueDay}
              placeholder="5" placeholderTextColor="#4B4B4B" keyboardType="numeric" />
          </Field>
          <Field label="Lease Start Date">
            <TextInput style={styles.input} value={leaseStart} onChangeText={setLeaseStart}
              placeholder="YYYY-MM-DD" placeholderTextColor="#4B4B4B" />
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, color: '#6B6B6B', fontWeight: '600' }}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0D0D0D' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title:          { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  saveBtn:        { fontSize: 16, fontWeight: '700', color: '#8257E6' },
  content:        { padding: 16, gap: 16, paddingBottom: 60 },
  unitBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8257E622', borderRadius: 10, padding: 10 },
  unitBannerText: { fontSize: 14, color: '#8257E6', fontWeight: '600' },
  input:          { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2C2C2C' },
});
