import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GroupStackParamList } from '../../navigation/types/navigation';
import { useGroups } from '../../hooks/useGroups';
import { Group } from '../../models/Group';
import { formatCurrency } from '../../utils/currencyUtils';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<GroupStackParamList, 'GroupList'>;
};

export default function GroupListScreen({ navigation }: Props) {
  const { groups } = useGroups();

  const renderItem = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('GroupDetail', { id: item.id })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.members}>{item.members.length} members</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{formatCurrency(item.totalExpenses)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={g => g.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="group" size={48} color="#2C2C2C" />
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyDesc}>
              Create a group to split bills, trips, and shared expenses with friends and family.
            </Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddGroup')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0D0D0D' },
  card:        { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16 },
  avatar:      { width: 48, height: 48, borderRadius: 24, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#FFF', fontSize: 20, fontWeight: '800' },
  groupName:   { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  members:     { fontSize: 13, color: '#6B6B6B', marginTop: 2 },
  totalLabel:  { fontSize: 12, color: '#6B6B6B' },
  totalAmount: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  emptyContainer:{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 12 },
  emptyTitle:    { fontSize: 17, fontWeight: '700', color: '#4B4B4B', textAlign: 'center' },
  emptyDesc:     { fontSize: 14, color: '#2C2C2C', textAlign: 'center', lineHeight: 20 },
  fab:         { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText:     { color: '#FFF', fontSize: 28, fontWeight: '700', lineHeight: 32 },
});
