import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ScrollView
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { GroupStackParamList } from '../../navigation/types/navigation';
import { useGroupStore } from '../../store/groupStore';
import { Split } from '../../models/Split';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDate } from '../../utils/dateUtils';

type Props = {
  navigation: NativeStackNavigationProp<GroupStackParamList, 'GroupDetail'>;
  route:      RouteProp<GroupStackParamList, 'GroupDetail'>;
};

export default function GroupDetailScreen({ navigation, route }: Props) {
  const { groups, splits, balances, loadSplits } = useGroupStore();
  const group = groups.find(g => g.id === route.params.id);
  const groupSplits  = splits[route.params.id]  ?? [];
  const groupBalances = balances[route.params.id] ?? [];

  useEffect(() => {
    loadSplits(route.params.id);
  }, [route.params.id]);

  if (!group) return null;

  const memberName = (id: string) =>
    group.members.find(m => m.userId === id || m.name === id)?.name ?? id;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.hero}>
          <Text style={styles.heroName}>{group.name}</Text>
          <Text style={styles.heroMembers}>{group.members.map(m => m.name).join(', ')}</Text>
          <Text style={styles.heroTotal}>Total: {formatCurrency(group.totalExpenses)}</Text>
        </View>

        {/* Who owes whom */}
        {groupBalances.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Balances</Text>
            {groupBalances.map(b => (
              <View key={b.id} style={styles.balRow}>
                <Text style={styles.balFrom}>{memberName(b.fromMemberId)}</Text>
                <Text style={styles.balArrow}> owes </Text>
                <Text style={styles.balTo}>{memberName(b.toMemberId)}</Text>
                <Text style={styles.balAmount}>{formatCurrency(b.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Add expense button */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddExpense', { groupId: group.id })}
        >
          <Text style={styles.addBtnText}>+ Add Expense</Text>
        </TouchableOpacity>

        {/* Expense list */}
        <Text style={styles.cardTitle}>Expenses</Text>
        {groupSplits.map(split => (
          <View key={split.id} style={styles.splitRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.splitDesc}>{split.description}</Text>
              <Text style={styles.splitDate}>{formatDate(split.date)} · Paid by {memberName(split.paidBy)}</Text>
            </View>
            <Text style={styles.splitAmount}>{formatCurrency(split.totalAmount)}</Text>
          </View>
        ))}
        {groupSplits.length === 0 && (
          <Text style={styles.empty}>No expenses yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0D0D0D' },
  content:     { padding: 16, gap: 16 },
  hero:        { backgroundColor: '#1A1A1A', borderRadius: 20, padding: 24, gap: 6 },
  heroName:    { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  heroMembers: { fontSize: 13, color: '#6B6B6B' },
  heroTotal:   { fontSize: 18, fontWeight: '700', color: '#8257E6', marginTop: 4 },
  card:        { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, gap: 10 },
  cardTitle:   { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  balRow:      { flexDirection: 'row', alignItems: 'center' },
  balFrom:     { color: '#FF4757', fontWeight: '600' },
  balArrow:    { color: '#ABABAB' },
  balTo:       { color: '#00C896', fontWeight: '600', flex: 1 },
  balAmount:   { color: '#FFFFFF', fontWeight: '700' },
  addBtn:      { backgroundColor: '#8257E6', padding: 16, borderRadius: 14, alignItems: 'center' },
  addBtnText:  { color: '#FFF', fontSize: 16, fontWeight: '700' },
  splitRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14 },
  splitDesc:   { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  splitDate:   { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  splitAmount: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  empty:       { color: '#4B4B4B', textAlign: 'center', paddingVertical: 24, fontSize: 14 },
});
