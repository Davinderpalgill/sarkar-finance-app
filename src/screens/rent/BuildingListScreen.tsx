import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RentStackParamList } from '../../navigation/types/navigation';
import { useRentStore } from '../../store/rentStore';
import { useUiStore } from '../../store/uiStore';
import { Building } from '../../models/Building';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = { navigation: NativeStackNavigationProp<RentStackParamList, 'BuildingList'> };

export default function BuildingListScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId);
  const { buildings, loadBuildings, deleteBuilding } = useRentStore();

  useEffect(() => {
    if (userId) loadBuildings(userId);
  }, [userId]);

  const handleDelete = (building: Building) => {
    Alert.alert(
      'Remove Building',
      `Remove "${building.name}"? All tenants will be marked inactive. Rent history is preserved and visible in Monthly Collection under "Past Tenants".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await deleteBuilding(building.id);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Building }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('BuildingDetail', { buildingId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardIcon}>
        <MaterialIcons name="business" size={22} color="#F59E0B" />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardName}>{item.name}</Text>
        {item.address ? <Text style={styles.cardSub} numberOfLines={1}>{item.address}</Text> : null}
      </View>
      <View style={styles.cardRight}>
        <TouchableOpacity onPress={() => navigation.navigate('AddBuilding', { buildingId: item.id })} style={styles.editBtn}>
          <MaterialIcons name="edit" size={16} color="#8257E6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.editBtn}>
          <MaterialIcons name="delete-outline" size={16} color="#FF4757" />
        </TouchableOpacity>
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
        <Text style={styles.title}>Buildings</Text>
        <TouchableOpacity onPress={() => navigation.popToTop()}>
          <MaterialIcons name="home" size={22} color="#4B4B4B" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={buildings}
        keyExtractor={b => b.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>No buildings yet. Add one below.</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddBuilding', {})}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0D0D0D' },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title:      { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, gap: 12 },
  cardIcon:   { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F59E0B22', alignItems: 'center', justifyContent: 'center' },
  cardText:   { flex: 1 },
  cardName:   { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  cardSub:    { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  cardRight:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtn:    { padding: 6 },
  empty:      { textAlign: 'center', color: '#4B4B4B', paddingTop: 60, fontSize: 14 },
  fab:        { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText:    { color: '#FFF', fontSize: 28, fontWeight: '700', lineHeight: 32 },
});
