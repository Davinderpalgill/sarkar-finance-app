import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, Alert, Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { TaskStackParamList } from '../../navigation/types/navigation';
import { useTaskStore } from '../../store/taskStore';
import { useUiStore } from '../../store/uiStore';
import { Task } from '../../models/Task';

type Props = {
  navigation: NativeStackNavigationProp<TaskStackParamList, 'AddTask'>;
  route: RouteProp<TaskStackParamList, 'AddTask'>;
};

const PRIORITIES: Task['priority'][] = ['high', 'medium', 'low'];

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  high:   '#FF4757',
  medium: '#F59E0B',
  low:    '#4ADE80',
};

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  high: 'High', medium: 'Medium', low: 'Low',
};

// Build an array of upcoming dates (today + 30 days) for the date picker
function buildDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function AddTaskScreen({ navigation, route }: Props) {
  const prefill = route.params?.prefill;
  const { addTask } = useTaskStore();
  const userId = useUiStore(s => s.userId);

  const [title, setTitle] = useState(prefill?.title ?? '');
  const [description, setDescription] = useState(prefill?.description ?? '');
  const [priority, setPriority] = useState<Task['priority']>(prefill?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState<Date | null>(
    prefill?.dueDate ? new Date(prefill.dueDate) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const dates = buildDates();

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a task title.');
      return;
    }
    if (!userId) return;
    setSaving(true);
    try {
      await addTask({
        userId,
        title: title.trim(),
        description: description.trim(),
        priority,
        status: 'pending',
        dueDate: dueDate ? dueDate.getTime() : null,
        voiceTranscript: prefill?.voiceTranscript ?? '',
        sourceLanguage: prefill?.sourceLanguage ?? 'en-US',
      });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.heading}>New Task</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          <Text style={[styles.saveBtnText, saving && { opacity: 0.5 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Voice transcript banner */}
        {prefill?.voiceTranscript ? (
          <View style={styles.transcriptBanner}>
            <MaterialIcons name="mic" size={16} color="#8257E6" />
            <Text style={styles.transcriptText} numberOfLines={2}>{prefill.voiceTranscript}</Text>
          </View>
        ) : null}

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor="#4B4B4B"
            autoFocus={!prefill?.title}
            returnKeyType="next"
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Additional details..."
            placeholderTextColor="#4B4B4B"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Priority */}
        <View style={styles.field}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map(p => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityChip,
                  priority === p && { backgroundColor: PRIORITY_COLOR[p] + '33', borderColor: PRIORITY_COLOR[p] },
                ]}
                onPress={() => setPriority(p)}
              >
                <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[p] }]} />
                <Text style={[styles.priorityChipText, priority === p && { color: PRIORITY_COLOR[p] }]}>
                  {PRIORITY_LABEL[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Due Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Due Date</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialIcons name="calendar-today" size={18} color={dueDate ? '#8257E6' : '#4B4B4B'} />
            <Text style={[styles.dateBtnText, dueDate && { color: '#FFFFFF' }]}>
              {dueDate ? formatDate(dueDate) : 'Set due date'}
            </Text>
            {dueDate && (
              <TouchableOpacity
                onPress={() => setDueDate(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={16} color="#6B6B6B" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date picker modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowDatePicker(false)} activeOpacity={1}>
          <View style={styles.datePicker}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Choose Due Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <MaterialIcons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {dates.map((d, idx) => {
                const selected = dueDate?.toDateString() === d.toDateString();
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.dateOption, selected && styles.dateOptionSelected]}
                    onPress={() => { setDueDate(d); setShowDatePicker(false); }}
                  >
                    <Text style={[styles.dateOptionText, selected && styles.dateOptionTextSelected]}>
                      {idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : formatDate(d)}
                    </Text>
                    {selected && <MaterialIcons name="check" size={16} color="#8257E6" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 12 },
  heading:   { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  saveBtn:   { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#8257E6', borderRadius: 20 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  content:   { padding: 20, gap: 20 },

  transcriptBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#1D1328', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#3D2A6E' },
  transcriptText: { flex: 1, fontSize: 13, color: '#A78BFA', lineHeight: 18 },

  field:     { gap: 8 },
  label:     { fontSize: 12, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.8 },
  input:     { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, fontSize: 15, color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2C' },
  inputMultiline: { minHeight: 90, paddingTop: 14 },

  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  priorityChipText: { fontSize: 13, fontWeight: '600', color: '#6B6B6B' },

  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2C2C2C' },
  dateBtnText: { flex: 1, fontSize: 15, color: '#4B4B4B' },

  modalBackdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  datePicker:      { backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: 400 },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  datePickerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  dateOption:      { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#2C2C2C', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateOptionSelected: { backgroundColor: '#1D1328', borderRadius: 8 },
  dateOptionText:  { fontSize: 15, color: '#FFFFFF' },
  dateOptionTextSelected: { color: '#8257E6', fontWeight: '700' },
});
