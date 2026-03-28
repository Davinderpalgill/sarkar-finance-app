import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { TaskStackParamList } from '../../navigation/types/navigation';
import { useTaskStore } from '../../store/taskStore';
import { Task } from '../../models/Task';

type Props = {
  navigation: NativeStackNavigationProp<TaskStackParamList, 'TaskDetail'>;
  route: RouteProp<TaskStackParamList, 'TaskDetail'>;
};

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  high:   '#FF4757',
  medium: '#F59E0B',
  low:    '#4ADE80',
};

const STATUS_COLOR: Record<Task['status'], string> = {
  pending:     '#F59E0B',
  in_progress: '#0EA5E9',
  completed:   '#4ADE80',
  closed:      '#8257E6',
};

const STATUS_LABEL: Record<Task['status'], string> = {
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Completed',
  closed:      'Closed',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function TaskDetailScreen({ navigation, route }: Props) {
  const { tasks, toggleComplete, deleteTask, closeTask } = useTaskStore();
  const task = tasks.find(t => t.id === route.params.id);

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isTerminal = task.status === 'completed' || task.status === 'closed';
  const isClosed   = task.status === 'closed';
  const statusColor = STATUS_COLOR[task.status];

  const handleDelete = () => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(task.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleEdit = () => {
    navigation.navigate('AddTask', {
      prefill: {
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        voiceTranscript: task.voiceTranscript,
        sourceLanguage: task.sourceLanguage,
      },
    });
  };

  const handleClose = () => {
    Alert.alert('Close Task', 'Mark this task as closed (cancelled/archived)?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close Task',
        style: 'destructive',
        onPress: () => closeTask(task.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.heading}>Task Detail</Text>
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="delete-outline" size={24} color="#FF4757" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title & complete toggle */}
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={[styles.checkbox, isTerminal && styles.checkboxDone]}
            onPress={() => toggleComplete(task.id)}
          >
            {isTerminal && <MaterialIcons name="check" size={16} color="#fff" />}
          </TouchableOpacity>
          <Text style={[styles.title, isTerminal && styles.titleDone]}>{task.title}</Text>
        </View>

        {/* Priority & status badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: PRIORITY_COLOR[task.priority] + '22', borderColor: PRIORITY_COLOR[task.priority] + '55' }]}>
            <View style={[styles.badgeDot, { backgroundColor: PRIORITY_COLOR[task.priority] }]} />
            <Text style={[styles.badgeText, { color: PRIORITY_COLOR[task.priority] }]}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{STATUS_LABEL[task.status]}</Text>
          </View>
        </View>

        {/* Info rows */}
        {task.dueDate && (
          <View style={styles.infoRow}>
            <MaterialIcons name="schedule" size={18} color="#6B6B6B" />
            <View>
              <Text style={styles.infoLabel}>Due Date</Text>
              <Text style={styles.infoValue}>{formatDate(task.dueDate)}</Text>
            </View>
          </View>
        )}

        {task.completedAt && (
          <View style={styles.infoRow}>
            <MaterialIcons name="check-circle" size={18} color="#4ADE80" />
            <View>
              <Text style={styles.infoLabel}>Completed</Text>
              <Text style={styles.infoValue}>{formatDate(task.completedAt)}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoRow}>
          <MaterialIcons name="add-circle-outline" size={18} color="#6B6B6B" />
          <View>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>{formatDate(task.createdAt)}</Text>
          </View>
        </View>

        {/* Description */}
        {task.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <View style={styles.descCard}>
              <Text style={styles.descText}>{task.description}</Text>
            </View>
          </View>
        ) : null}

        {/* Voice transcript */}
        {task.voiceTranscript ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Voice Input</Text>
            <View style={styles.transcriptCard}>
              <MaterialIcons name="mic" size={14} color="#8257E6" />
              <Text style={styles.transcriptText}>{task.voiceTranscript}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* 3-button action bar */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary, { flex: 0.7 }]}
          onPress={handleEdit}
        >
          <MaterialIcons name="edit" size={18} color="#8257E6" />
          <Text style={styles.actionBtnTextSecondary}>Edit</Text>
        </TouchableOpacity>

        {!isClosed && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnClose]}
            onPress={handleClose}
          >
            <MaterialIcons name="block" size={18} color="#8257E6" />
            <Text style={styles.actionBtnTextSecondary}>Close</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, isTerminal ? styles.actionBtnSecondary : styles.actionBtnPrimary]}
          onPress={() => toggleComplete(task.id)}
        >
          <MaterialIcons
            name={isTerminal ? 'replay' : 'check'}
            size={18}
            color={isTerminal ? '#6B6B6B' : '#fff'}
          />
          <Text style={[styles.actionBtnText, isTerminal && { color: '#6B6B6B' }]}>
            {isTerminal ? 'Mark Pending' : 'Mark Complete'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0D0D0D' },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 12 },
  heading:    { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF' },

  content:    { padding: 20, gap: 20, paddingBottom: 120 },

  titleRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox:   { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#4B4B4B', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  checkboxDone: { backgroundColor: '#8257E6', borderColor: '#8257E6' },
  title:      { flex: 1, fontSize: 22, fontWeight: '700', color: '#FFFFFF', lineHeight: 28 },
  titleDone:  { color: '#4B4B4B', textDecorationLine: 'line-through' },

  badgeRow:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  badgeDot:   { width: 6, height: 6, borderRadius: 3 },
  badgeText:  { fontSize: 12, fontWeight: '600', color: '#ABABAB' },

  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2C2C2C' },
  infoLabel:  { fontSize: 11, color: '#6B6B6B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue:  { fontSize: 14, color: '#FFFFFF', fontWeight: '500', marginTop: 2 },

  section:    { gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.8 },
  descCard:   { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2C2C2C' },
  descText:   { fontSize: 15, color: '#CCCCCC', lineHeight: 22 },

  transcriptCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#1D1328', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#3D2A6E' },
  transcriptText: { flex: 1, fontSize: 13, color: '#A78BFA', lineHeight: 18 },

  actions:    { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36, flexDirection: 'row', gap: 8, backgroundColor: '#0D0D0D', borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  actionBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14 },
  actionBtnPrimary: { backgroundColor: '#8257E6' },
  actionBtnSecondary: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  actionBtnClose: { backgroundColor: '#1D1328', borderWidth: 1, borderColor: '#3D2A6E' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  actionBtnTextSecondary: { fontSize: 14, fontWeight: '700', color: '#8257E6' },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:  { fontSize: 16, color: '#4B4B4B' },
});
