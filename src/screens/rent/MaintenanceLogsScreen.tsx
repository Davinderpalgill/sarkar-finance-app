import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { RentStackParamList } from '../../navigation/types/navigation';
import { RentRepository } from '../../storage/repositories/RentRepository';
import { MaintenanceLog, MaintenanceCategory } from '../../models/MaintenanceLog';
import { useRentStore } from '../../store/rentStore';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<RentStackParamList, 'MaintenanceLogs'>;
  route: RouteProp<RentStackParamList, 'MaintenanceLogs'>;
};

function formatRupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const CAT_ICONS: Record<MaintenanceCategory, string> = {
  repair: 'build', cleaning: 'cleaning-services', electrical: 'electrical-services',
  plumbing: 'water-damage', painting: 'format-paint', general: 'handyman', other: 'more-horiz',
};

const CAT_COLORS: Record<MaintenanceCategory, string> = {
  repair: '#FFA502', cleaning: '#00C896', electrical: '#F59E0B',
  plumbing: '#3B82F6', painting: '#EC4899', general: '#8257E6', other: '#6B6B6B',
};

export default function MaintenanceLogsScreen({ navigation, route }: Props) {
  const { buildingId } = route.params;
  const { buildings } = useRentStore();
  const building = buildings.find(b => b.id === buildingId);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await RentRepository.getMaintenanceLogs(buildingId);
      setLogs(data);
    } catch (e) {
      console.warn('MaintenanceLogsScreen load error', e);
    }
  }, [buildingId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (log: MaintenanceLog) => {
    Alert.alert('Delete Log', `Delete "${log.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await RentRepository.deleteMaintenanceLog(log.id);
            setLogs(prev => prev.filter(l => l.id !== log.id));
          } catch (e) {
            console.warn('deleteMaintenanceLog error', e);
          }
        },
      },
    ]);
  };

  const totalSpent = logs.reduce((s, l) => s + l.amount, 0);

  const renderItem = ({ item }: { item: MaintenanceLog }) => {
    const color = CAT_COLORS[item.category];
    const icon = CAT_ICONS[item.category];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AddMaintenance', { buildingId, logId: item.id })}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.catIcon, { backgroundColor: color + '22' }]}>
          <MaterialIcons name={icon as any} size={20} color={color} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.logTitle}>{item.title}</Text>
          <Text style={styles.logMeta}>{item.category} · {formatDate(item.date)}</Text>
          {item.description ? <Text style={styles.logDesc} numberOfLines={1}>{item.description}</Text> : null}
        </View>
        <Text style={styles.logAmount}>{formatRupees(item.amount)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {building?.name ?? 'Maintenance'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <TouchableOpacity onPress={() => navigation.popToTop()}>
            <MaterialIcons name="home" size={22} color="#4B4B4B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AddMaintenance', { buildingId })}>
            <MaterialIcons name="add" size={24} color="#8257E6" />
          </TouchableOpacity>
        </View>
      </View>

      {logs.length > 0 && (
        <View style={styles.totalBanner}>
          <Text style={styles.totalLabel}>Total Spent</Text>
          <Text style={styles.totalValue}>{formatRupees(totalSpent)}</Text>
        </View>
      )}

      <FlatList
        data={logs}
        keyExtractor={l => l.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <MaterialIcons name="handyman" size={40} color="#2C2C2C" />
            <Text style={styles.empty}>No maintenance logs yet.</Text>
            <Text style={styles.emptySub}>Tap + to add a log.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddMaintenance', { buildingId })}
      >
        <MaterialIcons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0D0D0D' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title:       { fontSize: 18, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  totalBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FF475722', marginHorizontal: 16, borderRadius: 12, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: '#FF475744' },
  totalLabel:  { fontSize: 13, color: '#FF4757', fontWeight: '600' },
  totalValue:  { fontSize: 18, fontWeight: '800', color: '#FF4757' },
  card:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14 },
  catIcon:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logTitle:    { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  logMeta:     { fontSize: 12, color: '#6B6B6B', textTransform: 'capitalize' },
  logDesc:     { fontSize: 12, color: '#4B4B4B' },
  logAmount:   { fontSize: 16, fontWeight: '800', color: '#FF4757' },
  emptyBox:    { alignItems: 'center', paddingTop: 60, gap: 8 },
  empty:       { textAlign: 'center', color: '#4B4B4B', fontSize: 15, fontWeight: '600' },
  emptySub:    { textAlign: 'center', color: '#4B4B4B', fontSize: 13 },
  fab:         { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
