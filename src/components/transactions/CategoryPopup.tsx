import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, TextInput, Alert
} from 'react-native';
import { DEFAULT_CATEGORIES } from '../../config/categories';
import { useTransactionStore } from '../../store/transactionStore';
import { saveCustomCategory, getCustomCategories, CustomCategory } from '../../utils/customCategories';

interface Props {
  visible: boolean;
  transactionId: string | null;
  currentCategoryId?: string | null;
  onDismiss: () => void;
  onCategoryChanged?: (categoryId: string) => void;
}

export default function CategoryPopup({ visible, transactionId, currentCategoryId, onDismiss, onCategoryChanged }: Props) {
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [savedCustomCats, setSavedCustomCats] = useState<CustomCategory[]>([]);
  const { assignCategory } = useTransactionStore();

  useEffect(() => {
    if (visible) {
      getCustomCategories().then(setSavedCustomCats);
    }
  }, [visible]);

  const handleSelect = async (categoryId: string) => {
    if (!transactionId) return;
    try {
      await assignCategory(transactionId, categoryId, 1.0);
      onCategoryChanged?.(categoryId);
      onDismiss();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleCustom = async () => {
    if (!customCategory.trim()) {
      Alert.alert('Enter category name');
      return;
    }
    const saved = await saveCustomCategory(customCategory);
    setSavedCustomCats(await getCustomCategories());
    await handleSelect(saved.id);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>What was this transaction for?</Text>
          <Text style={styles.subtitle}>
            {currentCategoryId ? 'Change the category' : 'Select the best matching category'}
          </Text>

          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {DEFAULT_CATEGORIES.filter(c => c.id !== 'cat_other').map(cat => {
              const isSelected = cat.id === currentCategoryId;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catBtn, { borderColor: cat.color }, isSelected && { backgroundColor: cat.color + '33' }]}
                  onPress={() => handleSelect(cat.id)}
                >
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.catName, isSelected && { color: '#FFFFFF', fontWeight: '700' }]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
            {savedCustomCats.map(cat => {
              const isSelected = cat.id === currentCategoryId;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catBtn, { borderColor: cat.color }, isSelected && { backgroundColor: cat.color + '33' }]}
                  onPress={() => handleSelect(cat.id)}
                >
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.catName, isSelected && { color: '#FFFFFF', fontWeight: '700' }]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Always-visible custom category section */}
          <View style={styles.divider} />
          {showCustomInput ? (
            <View style={styles.customRow}>
              <TextInput
                style={styles.customInput}
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder="e.g. Gym, Rent, Petrol..."
                placeholderTextColor="#4B4B4B"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCustom}
              />
              <TouchableOpacity style={styles.customSave} onPress={handleCustom}>
                <Text style={styles.customSaveText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.customCancel} onPress={() => { setShowCustomInput(false); setCustomCategory(''); }}>
                <Text style={styles.customCancelText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addCustomBtn} onPress={() => setShowCustomInput(true)}>
              <Text style={styles.addCustomIcon}>＋</Text>
              <Text style={styles.addCustomText}>Add a category not listed above</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.skipBtn} onPress={onDismiss}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet:         { backgroundColor: '#1A1A1A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  handle:        { width: 40, height: 4, backgroundColor: '#4B4B4B', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:         { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  subtitle:      { fontSize: 14, color: '#ABABAB', marginBottom: 20 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 16 },
  catBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#2C2C2C', backgroundColor: '#0D0D0D' },
  catDot:        { width: 8, height: 8, borderRadius: 4 },
  catName:       { fontSize: 13, color: '#ABABAB', fontWeight: '500' },
  otherBtn:         { borderColor: '#8257E6' },
  divider:          { height: 1, backgroundColor: '#2C2C2C', marginVertical: 16 },
  addCustomBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#8257E6', borderRadius: 12, borderStyle: 'dashed', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 4 },
  addCustomIcon:    { fontSize: 18, color: '#8257E6', fontWeight: '700' },
  addCustomText:    { fontSize: 14, color: '#8257E6', fontWeight: '600' },
  customRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  customInput:      { flex: 1, backgroundColor: '#0D0D0D', color: '#FFFFFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#8257E6', fontSize: 14 },
  customSave:       { backgroundColor: '#8257E6', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, justifyContent: 'center' },
  customSaveText:   { color: '#FFF', fontWeight: '700', fontSize: 14 },
  customCancel:     { padding: 10 },
  customCancelText: { color: '#6B6B6B', fontSize: 16 },
  skipBtn:          { alignItems: 'center', paddingVertical: 12 },
  skipText:         { color: '#6B6B6B', fontSize: 14 },
});
