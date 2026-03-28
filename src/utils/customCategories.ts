import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@custom_categories';

export interface CustomCategory {
  id: string;
  name: string;
  color: string;
}

export async function getCustomCategories(): Promise<CustomCategory[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomCategory(name: string): Promise<CustomCategory> {
  const id = `custom_${name.trim().toLowerCase().replace(/\s+/g, '_')}`;
  const color = '#8257E6';
  const existing = await getCustomCategories();
  if (!existing.find(c => c.id === id)) {
    await AsyncStorage.setItem(KEY, JSON.stringify([...existing, { id, name: name.trim(), color }]));
  }
  return { id, name: name.trim(), color };
}
