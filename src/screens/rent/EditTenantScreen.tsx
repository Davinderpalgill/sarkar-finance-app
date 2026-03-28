import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RentStackParamList } from '../../navigation/types/navigation';
import { useRentStore } from '../../store/rentStore';
import { RentRepository } from '../../storage/repositories/RentRepository';
import { RentTenant } from '../../models/RentTenant';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<RentStackParamList, 'EditTenant'>;
  route: RouteProp<RentStackParamList, 'EditTenant'>;
};

function tsToDateStr(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function dateStrToTs(str: string): number | null {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.getTime();
}

export default function EditTenantScreen({ navigation, route }: Props) {
  const { tenantId } = route.params;
  const { updateTenant } = useRentStore();

  const [tenant, setTenant] = useState<RentTenant | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [escalationRate, setEscalationRate] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');

  useEffect(() => {
    RentRepository.getTenantById(tenantId)
      .then(t => {
        if (!t) return;
        setTenant(t);
        setName(t.name);
        setPhone(t.phone);
        setWhatsapp(t.whatsappNumber ?? '');
        setMonthlyRent(String(t.monthlyRent / 100));
        setDueDay(String(t.dueDay));
        setEscalationRate(String(t.escalationRate ?? 0));
        setLeaseStart(tsToDateStr(t.leaseStart));
        setLeaseEnd(t.leaseEnd ? tsToDateStr(t.leaseEnd) : '');
      })
      .catch(e => console.warn('EditTenantScreen load error', e));
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenant) return;
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    if (!phone.trim()) { Alert.alert('Error', 'Phone is required'); return; }
    const rent = Math.round(parseFloat(monthlyRent || '0') * 100);
    if (rent <= 0) { Alert.alert('Error', 'Enter a valid rent amount'); return; }
    const due = parseInt(dueDay, 10);
    if (isNaN(due) || due < 1 || due > 31) { Alert.alert('Error', 'Due day must be 1–31'); return; }
    const escRate = parseFloat(escalationRate || '0');
    const leaseStartTs = dateStrToTs(leaseStart);
    if (!leaseStartTs) { Alert.alert('Error', 'Enter a valid lease start date (YYYY-MM-DD)'); return; }
    const leaseEndTs = leaseEnd.trim() ? dateStrToTs(leaseEnd) : null;
    if (leaseEnd.trim() && !leaseEndTs) { Alert.alert('Error', 'Enter a valid lease end date (YYYY-MM-DD) or leave blank'); return; }

    try {
      await updateTenant(tenantId, {
        name: name.trim(),
        phone: phone.trim(),
        whatsappNumber: whatsapp.trim() || null,
        monthlyRent: rent,
        dueDay: due,
        escalationRate: escRate,
        leaseStart: leaseStartTs,
        leaseEnd: leaseEndTs,
        status: tenant.status,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save');
    }
  };

  if (!tenant) return null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Tenant</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveBtn}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Field label="Full Name *">
            <TextInput style={styles.input} value={name} onChangeText={setName}
              placeholder="Tenant name" placeholderTextColor="#4B4B4B" />
          </Field>

          <Field label="Phone *">
            <TextInput style={styles.input} value={phone} onChangeText={setPhone}
              keyboardType="phone-pad" placeholder="Phone number" placeholderTextColor="#4B4B4B" />
          </Field>

          <Field label="WhatsApp Number (if different)">
            <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp}
              keyboardType="phone-pad" placeholder="Leave blank to use phone" placeholderTextColor="#4B4B4B" />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Monthly Rent (₹) *">
                <TextInput style={styles.input} value={monthlyRent} onChangeText={setMonthlyRent}
                  keyboardType="numeric" placeholder="e.g. 8000" placeholderTextColor="#4B4B4B" />
              </Field>
            </View>
            <View style={{ width: 90 }}>
              <Field label="Due Day">
                <TextInput style={styles.input} value={dueDay} onChangeText={setDueDay}
                  keyboardType="numeric" placeholder="5" placeholderTextColor="#4B4B4B" />
              </Field>
            </View>
          </View>

          <Field label="Annual Escalation Rate (%)">
            <TextInput style={styles.input} value={escalationRate} onChangeText={setEscalationRate}
              keyboardType="numeric" placeholder="e.g. 5 for 5%" placeholderTextColor="#4B4B4B" />
            <Text style={styles.hint}>Reminder for annual rent increase</Text>
          </Field>

          <Field label="Lease Start (YYYY-MM-DD)">
            <TextInput style={styles.input} value={leaseStart} onChangeText={setLeaseStart}
              placeholder="e.g. 2024-01-01" placeholderTextColor="#4B4B4B" />
          </Field>

          <Field label="Lease End (YYYY-MM-DD, optional)">
            <TextInput style={styles.input} value={leaseEnd} onChangeText={setLeaseEnd}
              placeholder="Leave blank if open-ended" placeholderTextColor="#4B4B4B" />
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
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title:     { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  saveBtn:   { fontSize: 16, fontWeight: '700', color: '#8257E6' },
  content:   { padding: 16, gap: 18, paddingBottom: 60 },
  input:     { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2C2C2C' },
  hint:      { fontSize: 11, color: '#4B4B4B' },
  row:       { flexDirection: 'row', gap: 12 },
});
