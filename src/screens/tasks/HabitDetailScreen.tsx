import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, subMonths, isSameDay, isToday,
} from 'date-fns';
import { TaskStackParamList } from '../../navigation/types/navigation';
import { useHabitStore } from '../../store/habitStore';
import { useUiStore } from '../../store/uiStore';
import { HabitRepository } from '../../storage/repositories/HabitRepository';
import { HabitLog } from '../../models/Habit';

type Props = {
  navigation: NativeStackNavigationProp<TaskStackParamList, 'HabitDetail'>;
  route: RouteProp<TaskStackParamList, 'HabitDetail'>;
};

const { width } = Dimensions.get('window');
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CELL_SIZE = Math.floor((width - 40 - 32 - 6 * 6) / 7); // screen - padding - card padding - gaps

function buildMonthGrid(month: Date, completedDates: Set<string>) {
  const start = startOfMonth(month);
  const end   = endOfMonth(month);
  const days  = eachDayOfInterval({ start, end });

  // getDay returns 0=Sun..6=Sat; we want Mon=0..Sun=6
  const startPad = (getDay(start) + 6) % 7;
  const grid: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...days,
  ];
  // Pad to full weeks
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

export default function HabitDetailScreen({ navigation, route }: Props) {
  const { habits, toggleToday } = useHabitStore();
  const userId = useUiStore(s => s.userId);
  const { deleteHabit } = useHabitStore();

  const habit = habits.find(h => h.id === route.params.id);

  const [logs, setLogs]     = useState<HabitLog[]>([]);
  const [streak, setStreak] = useState({ current: 0, best: 0, total: 0 });

  useFocusEffect(useCallback(() => {
    if (!habit) return;
    HabitRepository.getLogsForHabit(habit.id).then(setLogs);
    HabitRepository.getStreak(habit.id).then(setStreak);
  }, [habit?.id]));

  if (!habit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Habit not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const completedDates = new Set(logs.map(l => l.date));
  const today = format(new Date(), 'yyyy-MM-dd');
  const isDoneToday = completedDates.has(today);

  const handleDelete = () => {
    Alert.alert('Delete Habit', 'This will delete the habit and all its history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteHabit(habit.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleToggleToday = async () => {
    if (!userId) return;
    await toggleToday(habit.id, userId);
    // Refresh logs & streak
    const [newLogs, newStreak] = await Promise.all([
      HabitRepository.getLogsForHabit(habit.id),
      HabitRepository.getStreak(habit.id),
    ]);
    setLogs(newLogs);
    setStreak(newStreak);
  };

  // Build calendar for this month and previous month
  const thisMonth = new Date();
  const prevMonth = subMonths(thisMonth, 1);
  const months    = [prevMonth, thisMonth];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.heading}>Habit Detail</Text>
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="delete-outline" size={24} color="#FF4757" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Habit identity */}
        <View style={[styles.identityCard, { borderColor: habit.color + '44' }]}>
          <View style={[styles.iconCircle, { backgroundColor: habit.color + '22' }]}>
            <MaterialIcons name={habit.icon as any} size={32} color={habit.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.habitTitle}>{habit.title}</Text>
            {habit.description ? (
              <Text style={styles.habitDesc} numberOfLines={2}>{habit.description}</Text>
            ) : null}
            {habit.reminderTime ? (
              <View style={styles.reminderBadge}>
                <MaterialIcons name="alarm" size={12} color="#6B6B6B" />
                <Text style={styles.reminderText}>Daily at {
                  (() => {
                    const [h, m] = habit.reminderTime.split(':').map(Number);
                    const d = new Date(); d.setHours(h, m);
                    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  })()
                }</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Streak cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: habit.color + '44' }]}>
            <Text style={[styles.statValue, { color: habit.color }]}>{streak.current}</Text>
            <Text style={styles.statLabel}>🔥 Current</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#F59E0B44' }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{streak.best}</Text>
            <Text style={styles.statLabel}>⭐ Best</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#4ADE8044' }]}>
            <Text style={[styles.statValue, { color: '#4ADE80' }]}>{streak.total}</Text>
            <Text style={styles.statLabel}>✓ Total</Text>
          </View>
        </View>

        {/* Calendar */}
        {months.map((month) => {
          const grid = buildMonthGrid(month, completedDates);
          return (
            <View key={format(month, 'yyyy-MM')} style={styles.calCard}>
              <Text style={styles.calMonthLabel}>{format(month, 'MMMM yyyy')}</Text>
              {/* Day headers */}
              <View style={styles.calRow}>
                {DAY_LABELS.map(d => (
                  <View key={d} style={[styles.calCell, { width: CELL_SIZE }]}>
                    <Text style={styles.calDayHeader}>{d[0]}</Text>
                  </View>
                ))}
              </View>
              {/* Day cells */}
              {Array.from({ length: grid.length / 7 }, (_, row) => (
                <View key={row} style={styles.calRow}>
                  {grid.slice(row * 7, row * 7 + 7).map((day, col) => {
                    if (!day) return <View key={col} style={[styles.calCell, { width: CELL_SIZE }]} />;
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const done    = completedDates.has(dateStr);
                    const todayCell = isToday(day);
                    return (
                      <View
                        key={col}
                        style={[
                          styles.calCell,
                          { width: CELL_SIZE, height: CELL_SIZE },
                          done && { backgroundColor: habit.color, borderRadius: CELL_SIZE / 2 },
                          todayCell && !done && { borderWidth: 1, borderColor: habit.color, borderRadius: CELL_SIZE / 2 },
                        ]}
                      >
                        <Text style={[
                          styles.calDayNum,
                          done && { color: '#FFFFFF', fontWeight: '700' },
                          todayCell && !done && { color: habit.color },
                        ]}>
                          {format(day, 'd')}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Today toggle */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.todayBtn,
            { backgroundColor: isDoneToday ? '#1A1A1A' : habit.color },
            isDoneToday && { borderWidth: 1, borderColor: habit.color },
          ]}
          onPress={handleToggleToday}
        >
          <MaterialIcons
            name={isDoneToday ? 'check-circle' : 'radio-button-unchecked'}
            size={20}
            color={isDoneToday ? habit.color : '#fff'}
          />
          <Text style={[styles.todayBtnText, isDoneToday && { color: habit.color }]}>
            {isDoneToday ? 'Done today!' : "Mark today's habit"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 12 },
  heading:   { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF' },

  content:   { padding: 20, gap: 16 },

  identityCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, borderWidth: 1 },
  iconCircle:   { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  habitTitle:   { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  habitDesc:    { fontSize: 13, color: '#6B6B6B', lineHeight: 18 },
  reminderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  reminderText:  { fontSize: 12, color: '#6B6B6B' },

  statsRow:  { flexDirection: 'row', gap: 10 },
  statCard:  { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, gap: 4 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#6B6B6B', fontWeight: '600' },

  calCard:       { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  calMonthLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  calRow:        { flexDirection: 'row', gap: 6, marginBottom: 6, justifyContent: 'space-between' },
  calCell:       { alignItems: 'center', justifyContent: 'center' },
  calDayHeader:  { fontSize: 10, fontWeight: '700', color: '#4B4B4B' },
  calDayNum:     { fontSize: 12, color: '#6B6B6B' },

  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#4B4B4B' },

  footer:      { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36, backgroundColor: '#0D0D0D', borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  todayBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16 },
  todayBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
