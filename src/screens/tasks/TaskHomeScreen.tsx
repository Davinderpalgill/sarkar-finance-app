import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
} from 'date-fns';
import { TaskStackParamList } from '../../navigation/types/navigation';
import { useTaskStore } from '../../store/taskStore';
import { useHabitStore } from '../../store/habitStore';
import { useUiStore } from '../../store/uiStore';
import { Task } from '../../models/Task';
import { Habit } from '../../models/Habit';
import VoiceRecorderSheet from '../../components/VoiceRecorderSheet';

type Props = { navigation: NativeStackNavigationProp<TaskStackParamList, 'TaskHome'> };

type Mode         = 'Tasks' | 'Habits';
type TimePeriod   = 'All' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
type StatusFilter = 'All' | 'Pending' | 'Done' | 'Closed';

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  high:   '#FF4757',
  medium: '#F59E0B',
  low:    '#4ADE80',
};

function formatDueDate(ts: number | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getDateRange(period: TimePeriod): { from: number; to: number } | null {
  const now = new Date();
  if (period === 'Daily')   return { from: startOfDay(now).getTime(),  to: endOfDay(now).getTime() };
  if (period === 'Weekly')  return { from: startOfWeek(now, { weekStartsOn: 1 }).getTime(), to: endOfWeek(now, { weekStartsOn: 1 }).getTime() };
  if (period === 'Monthly') return { from: startOfMonth(now).getTime(), to: endOfMonth(now).getTime() };
  if (period === 'Yearly')  return { from: startOfYear(now).getTime(),  to: endOfYear(now).getTime() };
  return null;
}

export default function TaskHomeScreen({ navigation }: Props) {
  const { tasks, loading: tasksLoading, loadTasks, loadTasksInRange, toggleComplete } = useTaskStore();
  const { habits, todayLogs, loading: habitsLoading, loadHabits, loadTodayLogs, toggleToday } = useHabitStore();
  const userId = useUiStore(s => s.userId);

  const [mode, setMode]               = useState<Mode>('Tasks');
  const [timePeriod, setTimePeriod]   = useState<TimePeriod>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [voiceOpen, setVoiceOpen]     = useState(false);

  const loadForPeriod = useCallback((period: TimePeriod) => {
    if (!userId) return;
    const range = getDateRange(period);
    if (range) loadTasksInRange(userId, range.from, range.to);
    else loadTasks(userId);
  }, [userId]);

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    loadForPeriod(timePeriod);
    loadHabits(userId);
    loadTodayLogs(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, timePeriod]));

  // ── Task list logic ──────────────────────────────────────────────────────

  const filtered = tasks.filter(t => {
    if (statusFilter === 'Pending') return t.status !== 'completed' && t.status !== 'closed';
    if (statusFilter === 'Done')    return t.status === 'completed';
    if (statusFilter === 'Closed')  return t.status === 'closed';
    return true;
  });

  const highPriority = filtered.filter(t => t.priority === 'high' && t.status !== 'completed' && t.status !== 'closed');
  const other = filtered.filter(t => !(t.priority === 'high' && t.status !== 'completed' && t.status !== 'closed'));

  const allItems: (Task | { sectionTitle: string })[] = [];
  if (highPriority.length > 0) { allItems.push({ sectionTitle: 'HIGH PRIORITY' }); allItems.push(...highPriority); }
  if (other.length > 0)        { allItems.push({ sectionTitle: 'OTHER' });          allItems.push(...other); }

  const renderTask = ({ item }: { item: Task | { sectionTitle: string } }) => {
    if ('sectionTitle' in item) {
      return <Text style={styles.sectionHeader}>{item.sectionTitle}</Text>;
    }
    const task = item as Task;
    const isCompleted = task.status === 'completed';
    const isClosed    = task.status === 'closed';
    const isTerminal  = isCompleted || isClosed;
    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => navigation.navigate('TaskDetail', { id: task.id })}
        activeOpacity={0.8}
      >
        <TouchableOpacity
          style={[styles.checkbox, isTerminal && styles.checkboxDone]}
          onPress={() => toggleComplete(task.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isTerminal && <MaterialIcons name="check" size={14} color="#fff" />}
        </TouchableOpacity>

        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, isTerminal && styles.taskTitleDone]} numberOfLines={1}>
            {task.title}
          </Text>
          <View style={styles.taskMeta}>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[task.priority] }]} />
            <Text style={[styles.priorityLabel, { color: PRIORITY_COLOR[task.priority] }]}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Text>
            {isClosed && (
              <>
                <Text style={styles.metaSep}>·</Text>
                <View style={styles.closedBadge}>
                  <Text style={styles.closedBadgeText}>Closed</Text>
                </View>
              </>
            )}
            {task.dueDate && !isClosed && (
              <>
                <Text style={styles.metaSep}>·</Text>
                <MaterialIcons name="schedule" size={12} color="#6B6B6B" />
                <Text style={styles.dueDateLabel}>{formatDueDate(task.dueDate)}</Text>
              </>
            )}
          </View>
        </View>

        <MaterialIcons name="chevron-right" size={18} color="#4B4B4B" />
      </TouchableOpacity>
    );
  };

  // ── Habit list logic ─────────────────────────────────────────────────────

  const doneCount  = habits.filter(h => todayLogs.some(l => l.habitId === h.id)).length;
  const totalHabits = habits.length;

  const renderHabit = ({ item }: { item: Habit }) => {
    const isDone = todayLogs.some(l => l.habitId === item.id);
    return (
      <TouchableOpacity
        style={styles.habitCard}
        onPress={() => navigation.navigate('HabitDetail', { id: item.id })}
        activeOpacity={0.8}
      >
        <View style={[styles.habitIconCircle, { backgroundColor: item.color + '22' }]}>
          <MaterialIcons name={item.icon as any} size={22} color={item.color} />
        </View>
        <View style={styles.habitContent}>
          <Text style={[styles.habitTitle, isDone && styles.habitTitleDone]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.reminderTime ? (
            <View style={styles.habitMeta}>
              <MaterialIcons name="alarm" size={11} color="#6B6B6B" />
              <Text style={styles.habitMetaText}>
                {(() => {
                  const [h, m] = item.reminderTime!.split(':').map(Number);
                  const d = new Date(); d.setHours(h, m);
                  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                })()}
              </Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.habitCheck, isDone && { backgroundColor: item.color, borderColor: item.color }]}
          onPress={() => userId && toggleToday(item.id, userId)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isDone && <MaterialIcons name="check" size={14} color="#fff" />}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>{mode === 'Tasks' ? 'Tasks' : 'Habits'}</Text>
        {mode === 'Tasks' && (
          <TouchableOpacity
            onPress={() => navigation.navigate('TaskAnalytics')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="bar-chart" size={24} color="#8257E6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        {(['Tasks', 'Habits'] as Mode[]).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.modeTab, mode === m && styles.modeTabActive]}
            onPress={() => setMode(m)}
          >
            <MaterialIcons
              name={m === 'Tasks' ? 'task-alt' : 'local-fire-department'}
              size={14}
              color={mode === m ? '#FFFFFF' : '#6B6B6B'}
            />
            <Text style={[styles.modeLabel, mode === m && styles.modeLabelActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tasks mode filter rows */}
      {mode === 'Tasks' && (
        <>
          <View style={styles.timePeriodRow}>
            {(['All', 'Daily', 'Weekly', 'Monthly', 'Yearly'] as TimePeriod[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.filterTab, timePeriod === p && styles.filterTabActive]}
                onPress={() => setTimePeriod(p)}
              >
                <Text style={[styles.filterLabel, timePeriod === p && styles.filterLabelActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.statusRow}>
            {(['All', 'Pending', 'Done', 'Closed'] as StatusFilter[]).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.statusTab, statusFilter === f && styles.statusTabActive]}
                onPress={() => setStatusFilter(f)}
              >
                <Text style={[styles.statusLabel, statusFilter === f && styles.statusLabelActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Habits mode — today summary */}
      {mode === 'Habits' && totalHabits > 0 && (
        <View style={styles.habitSummary}>
          <Text style={styles.habitSummaryText}>
            <Text style={{ color: '#4ADE80', fontWeight: '700' }}>{doneCount}</Text>
            <Text style={{ color: '#6B6B6B' }}> / {totalHabits} done today</Text>
          </Text>
          <View style={styles.habitProgressBar}>
            <View
              style={[
                styles.habitProgressFill,
                { width: totalHabits > 0 ? `${Math.round((doneCount / totalHabits) * 100)}%` : '0%' as any },
              ]}
            />
          </View>
        </View>
      )}

      {/* Content */}
      {mode === 'Tasks' ? (
        tasksLoading ? (
          <ActivityIndicator color="#8257E6" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="task-alt" size={48} color="#2C2C2C" />
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptyText}>Tap the mic to add a task by voice</Text>
          </View>
        ) : (
          <FlatList
            data={allItems}
            keyExtractor={(item, idx) => ('sectionTitle' in item ? `sec-${idx}` : (item as Task).id)}
            renderItem={renderTask}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        habitsLoading ? (
          <ActivityIndicator color="#8257E6" style={{ marginTop: 40 }} />
        ) : habits.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="local-fire-department" size={48} color="#2C2C2C" />
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptyText}>Tap the mic or + to add a daily habit</Text>
          </View>
        ) : (
          <FlatList
            data={habits}
            keyExtractor={h => h.id}
            renderItem={renderHabit}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {/* Mic FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setVoiceOpen(true)} activeOpacity={0.85}>
        <MaterialIcons name="mic" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Manual add button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          if (mode === 'Tasks') navigation.navigate('AddTask', undefined);
          else navigation.navigate('AddHabit', undefined);
        }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={22} color="#8257E6" />
      </TouchableOpacity>

      <VoiceRecorderSheet
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onConfirm={(prefill) => {
          setVoiceOpen(false);
          if (mode === 'Tasks') {
            navigation.navigate('AddTask', { prefill });
          } else {
            navigation.navigate('AddHabit', { prefillTitle: prefill.title });
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0D0D0D' },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  heading:     { flex: 1, fontSize: 24, fontWeight: '800', color: '#FFFFFF' },

  modeRow:     { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  modeTab:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  modeTabActive: { backgroundColor: '#3D2A6E', borderColor: '#8257E6' },
  modeLabel:   { fontSize: 13, fontWeight: '700', color: '#6B6B6B' },
  modeLabelActive: { color: '#FFFFFF' },

  timePeriodRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginBottom: 6 },
  filterTab:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  filterTabActive: { backgroundColor: '#3D2A6E', borderColor: '#8257E6' },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#6B6B6B' },
  filterLabelActive: { color: '#FFFFFF' },

  statusRow:   { flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginBottom: 8 },
  statusTab:   { flex: 1, alignItems: 'center', paddingVertical: 5, borderRadius: 8, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  statusTabActive: { backgroundColor: '#3D2A6E', borderColor: '#8257E6' },
  statusLabel: { fontSize: 12, fontWeight: '600', color: '#6B6B6B' },
  statusLabelActive: { color: '#FFFFFF' },

  habitSummary:    { paddingHorizontal: 20, marginBottom: 10 },
  habitSummaryText: { fontSize: 13, marginBottom: 6 },
  habitProgressBar: { height: 4, borderRadius: 2, backgroundColor: '#2C2C2C', overflow: 'hidden' },
  habitProgressFill: { height: 4, borderRadius: 2, backgroundColor: '#4ADE80' },

  list:        { paddingHorizontal: 20, paddingBottom: 100 },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: '#4B4B4B', letterSpacing: 1, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },

  taskCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2C2C2C', gap: 12 },
  checkbox:    { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#4B4B4B', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxDone: { backgroundColor: '#8257E6', borderColor: '#8257E6' },
  taskContent: { flex: 1 },
  taskTitle:   { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  taskTitleDone: { color: '#4B4B4B', textDecorationLine: 'line-through' },
  taskMeta:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityLabel: { fontSize: 12, fontWeight: '600' },
  metaSep:     { fontSize: 12, color: '#4B4B4B' },
  dueDateLabel: { fontSize: 12, color: '#6B6B6B' },
  closedBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#3D2A6E' },
  closedBadgeText: { fontSize: 10, fontWeight: '700', color: '#8257E6' },

  habitCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2C2C2C', gap: 12 },
  habitIconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  habitContent:    { flex: 1 },
  habitTitle:      { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  habitTitleDone:  { color: '#4B4B4B' },
  habitMeta:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  habitMetaText:   { fontSize: 11, color: '#6B6B6B' },
  habitCheck:      { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#4B4B4B', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: '#4B4B4B' },
  emptyText:   { fontSize: 14, color: '#3C3C3C' },

  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#8257E6',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#8257E6', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  addBtn: {
    position: 'absolute', bottom: 96, right: 28,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2C2C2C',
  },
});
