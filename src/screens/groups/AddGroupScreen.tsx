import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TextInput, TouchableOpacity, Alert
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GroupStackParamList } from '../../navigation/types/navigation';
import { Group, GroupMember } from '../../models/Group';
import { useGroupStore } from '../../store/groupStore';
import { useUiStore } from '../../store/uiStore';
import { generateId } from '../../utils/generateId';

type Props = {
  navigation: NativeStackNavigationProp<GroupStackParamList, 'AddGroup'>;
};

export default function AddGroupScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { createGroup } = useGroupStore();

  const [groupName, setGroupName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [saving, setSaving] = useState(false);

  const addMember = () => {
    const n = memberName.trim();
    if (!n) return;
    const m: GroupMember = { userId: null, name: n, phone: null, isAppUser: false };
    setMembers(prev => [...prev, m]);
    setMemberName('');
  };

  const removeMember = (idx: number) =>
    setMembers(prev => prev.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    if (!groupName.trim()) { Alert.alert('Enter group name'); return; }
    if (members.length === 0) { Alert.alert('Add at least one member'); return; }

    setSaving(true);
    const now = Date.now();
    const group: Group = {
      id: generateId(),
      createdBy: userId,
      name: groupName.trim(),
      members: [
        { userId, name: 'You', phone: null, isAppUser: true },
        ...members,
      ],
      totalExpenses: 0,
      currency: 'INR',
      syncedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await createGroup(group);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="e.g. Goa Trip"
          placeholderTextColor="#4B4B4B"
        />

        <Text style={styles.label}>Add Members</Text>
        <View style={styles.addMemberRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={memberName}
            onChangeText={setMemberName}
            placeholder="Member name"
            placeholderTextColor="#4B4B4B"
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={addMember}
          />
          <TouchableOpacity style={styles.addMemberBtn} onPress={addMember}>
            <Text style={styles.addMemberBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {members.map((m, i) => (
          <View key={i} style={styles.memberChip}>
            <Text style={styles.memberChipText}>{m.name}</Text>
            <TouchableOpacity onPress={() => removeMember(i)}>
              <Text style={styles.removeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabled]}
          onPress={handleCreate}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Creating...' : 'Create Group'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0D0D0D' },
  content:         { padding: 24, gap: 10 },
  label:           { fontSize: 14, color: '#ABABAB', marginTop: 12, marginBottom: 4 },
  input:           { backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  addMemberRow:    { flexDirection: 'row', gap: 10 },
  addMemberBtn:    { backgroundColor: '#8257E6', paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' },
  addMemberBtnText:{ color: '#FFF', fontWeight: '700' },
  memberChip:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A1A', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  memberChipText:  { color: '#FFFFFF', fontSize: 15 },
  removeBtn:       { color: '#FF4757', fontSize: 16, fontWeight: '700' },
  saveBtn:         { backgroundColor: '#8257E6', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  disabled:        { opacity: 0.6 },
  saveBtnText:     { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
