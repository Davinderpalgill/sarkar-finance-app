import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { TaskStackParamList } from '../../navigation/types/navigation';
import { useHabitStore } from '../../store/habitStore';
import { useUiStore } from '../../store/uiStore';
import { HABIT_COLORS, HABIT_ICONS } from '../../models/Habit';
import VoiceRecorderSheet from '../../components/VoiceRecorderSheet';

type Props = {
  navigation: NativeStackNavigationProp<TaskStackParamList, 'AddHabit'>;
  route: RouteProp<TaskStackParamList, 'AddHabit'>;
};

const REMINDER_PRESETS = [
  { label: '6 AM',  value: '06:00' },
  { label: '7 AM',  value: '07:00' },
  { label: '8 AM',  value: '08:00' },
  { label: '9 AM',  value: '09:00' },
  { label: '12 PM', value: '12:00' },
  { label: '6 PM',  value: '18:00' },
  { label: '8 PM',  value: '20:00' },
  { label: '9 PM',  value: '21:00' },
];

export default function AddHabitScreen({ navigation, route }: Props) {
  const { addHabit } = useHabitStore();
  const userId = useUiStore(s => s.userId);

  const [title, setTitle]               = useState(route.params?.prefillTitle ?? '');
  const [description, setDescription]   = useState('');
  const [color, setColor]               = useState(HABIT_COLORS[0]);
  const [icon, setIcon]                 = useState(HABIT_ICONS[0].name);
  const [reminderEnabled, setReminder]  = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [voiceOpen, setVoiceOpen]       = useState(false);
  const [saving, setSaving]             = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a habit name.');
      return;
    }
    if (!userId) return;
    setSaving(true);
    try {
      await addHabit({
        userId,
        title: title.trim(),
        description: description.trim(),
        color,
        icon,
        reminderTime: reminderEnabled ? reminderTime : null,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save habit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.heading}>New Habit</Text>
        <TouchableOpacity
          onPress={() => setVoiceOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="mic" size={24} color="#8257E6" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Habit Name</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Read for 20 minutes"
            placeholderTextColor="#4B4B4B"
            maxLength={80}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={description}
            onChangeText={setDescription}
            placeholder="Why does this habit matter?"
            placeholderTextColor="#4B4B4B"
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Color picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {HABIT_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchSelected]}
              >
                {color === c && <MaterialIcons name="check" size={16} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Icon picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Icon</Text>
          <View style={styles.iconGrid}>
            {HABIT_ICONS.map(ic => (
              <TouchableOpacity
                key={ic.name}
                onPress={() => setIcon(ic.name)}
                style={[styles.iconCell, icon === ic.name && { backgroundColor: color + '33', borderColor: color }]}
              >
                <MaterialIcons name={ic.name as any} size={22} color={icon === ic.name ? color : '#6B6B6B'} />
                <Text style={[styles.iconLabel, icon === ic.name && { color }]}>{ic.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reminder */}
        <View style={styles.field}>
          <View style={styles.reminderHeader}>
            <Text style={styles.label}>Daily Reminder</Text>
            <TouchableOpacity
              onPress={() => setReminder(v => !v)}
              style={[styles.toggle, reminderEnabled && { backgroundColor: color }]}
            >
              <View style={[styles.toggleThumb, reminderEnabled && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>

          {reminderEnabled && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
              <View style={styles.presetRow}>
                {REMINDER_PRESETS.map(p => (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => setReminderTime(p.value)}
                    style={[
                      styles.presetChip,
                      reminderTime === p.value && { backgroundColor: color + '33', borderColor: color },
                    ]}
                  >
                    <Text style={[styles.presetLabel, reminderTime === p.value && { color }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: color }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <MaterialIcons name="add-task" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>Save Habit</Text>
        </TouchableOpacity>
      </View>

      <VoiceRecorderSheet
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onConfirm={(prefill) => {
          setVoiceOpen(false);
          if (prefill.title) setTitle(prefill.title);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 12 },
  heading:   { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF' },

  content:   { padding: 20, gap: 24, paddingBottom: 120 },

  field:     { gap: 10 },
  label:     { fontSize: 12, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.8 },

  input:     { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, fontSize: 15, color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2C' },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  colorRow:  { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorSwatchSelected: { borderWidth: 3, borderColor: '#FFFFFF' },

  iconGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCell:  { width: 68, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  iconLabel: { fontSize: 10, fontWeight: '600', color: '#6B6B6B' },

  reminderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggle:    { width: 44, height: 24, borderRadius: 12, backgroundColor: '#2C2C2C', padding: 2, justifyContent: 'center' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#6B6B6B' },
  toggleThumbOn: { backgroundColor: '#FFFFFF', alignSelf: 'flex-end' },

  presetScroll: { marginTop: 4 },
  presetRow:   { flexDirection: 'row', gap: 8, paddingRight: 20 },
  presetChip:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  presetLabel: { fontSize: 13, fontWeight: '600', color: '#6B6B6B' },

  footer:    { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36, backgroundColor: '#0D0D0D', borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  saveBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
