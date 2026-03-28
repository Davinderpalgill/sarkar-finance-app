import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RentStackParamList } from '../../navigation/types/navigation';
import { RentRepository } from '../../storage/repositories/RentRepository';
import { MaintenanceLog, MaintenanceCategory } from '../../models/MaintenanceLog';
import { useUiStore } from '../../store/uiStore';
import { generateId } from '../../utils/generateId';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<RentStackParamList, 'AddMaintenance'>;
  route: RouteProp<RentStackParamList, 'AddMaintenance'>;
};

const CATEGORIES: MaintenanceCategory[] = [
  'repair', 'cleaning', 'electrical', 'plumbing', 'painting', 'general', 'other',
];

export default function AddMaintenanceScreen({ navigation, route }: Props) {
  const { buildingId, logId } = route.params;
  const userId = useUiStore(s => s.userId);
  const isEdit = !!logId;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('general');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (logId) {
      RentRepository.getMaintenanceLogs(buildingId)
        .then(logs => {
          const log = logs.find(l => l.id === logId);
          if (log) {
            setTitle(log.title);
            setAmount(String(log.amount / 100));
            setCategory(log.category);
            setDescription(log.description ?? '');
            setDate(new Date(log.date).toISOString().slice(0, 10));
          }
        })
        .catch(e => console.warn('getMaintenanceLogs error', e));
    }
  }, [logId]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    const amountPaise = Math.round(parseFloat(amount || '0') * 100);
    if (amountPaise < 0) { Alert.alert('Error', 'Amount cannot be negative'); return; }
    const dateTs = new Date(date).getTime();
    if (isNaN(dateTs)) { Alert.alert('Error', 'Enter a valid date (YYYY-MM-DD)'); return; }

    try {
      const now = Date.now();
      if (isEdit && logId) {
        await RentRepository.updateMaintenanceLog({
          id: logId,
          title: title.trim(),
          amount: amountPaise,
          category,
          description: description.trim() || null,
          date: dateTs,
        });
      } else {
        const log: MaintenanceLog = {
          id: generateId(),
          buildingId,
          unitId: null,
          userId: userId ?? '',
          title: title.trim(),
          amount: amountPaise,
          category,
          description: description.trim() || null,
          date: dateTs,
          createdAt: now,
          updatedAt: now,
        };
        await RentRepository.insertMaintenanceLog(log);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{isEdit ? 'Edit Log' : 'Add Maintenance'}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveBtn}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle}
              placeholder="e.g. Plumber visit, AC repair" placeholderTextColor="#4B4B4B" />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount}
              keyboardType="numeric" placeholder="0" placeholderTextColor="#4B4B4B" />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={date} onChangeText={setDate}
              placeholder="e.g. 2025-03-15" placeholderTextColor="#4B4B4B" />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catBtn, category === c && styles.catBtnActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.catBtnText, category === c && styles.catBtnTextActive]}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Details about the maintenance work"
              placeholderTextColor="#4B4B4B"
              multiline
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0D0D0D' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title:           { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  saveBtn:         { fontSize: 16, fontWeight: '700', color: '#8257E6' },
  content:         { padding: 16, gap: 18, paddingBottom: 60 },
  fieldGroup:      { gap: 6 },
  label:           { fontSize: 13, color: '#6B6B6B', fontWeight: '600' },
  input:           { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2C2C2C' },
  catGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  catBtnActive:    { backgroundColor: '#8257E6', borderColor: '#8257E6' },
  catBtnText:      { fontSize: 13, color: '#6B6B6B', fontWeight: '600' },
  catBtnTextActive:{ color: '#FFFFFF' },
});
