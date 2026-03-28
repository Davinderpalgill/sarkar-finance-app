import { useState, useEffect } from 'react';
import { DEFAULT_CATEGORIES } from '../config/categories';
import { getCustomCategories } from '../utils/customCategories';

export interface CatInfo {
  name: string;
  color: string;
  icon: string;
}

const BASE_MAP = new Map<string, CatInfo>(
  DEFAULT_CATEGORIES.map(c => [c.id, { name: c.name, color: c.color, icon: c.icon }])
);

/**
 * Returns a map of categoryId → { name, color, icon } that includes
 * both predefined and user-created custom categories.
 */
export function useCategoryMap(): Map<string, CatInfo> {
  const [catMap, setCatMap] = useState<Map<string, CatInfo>>(BASE_MAP);

  useEffect(() => {
    getCustomCategories().then(customs => {
      if (customs.length === 0) return;
      const merged = new Map(BASE_MAP);
      customs.forEach(c => merged.set(c.id, { name: c.name, color: c.color, icon: 'label' }));
      setCatMap(merged);
    });
  }, []);

  return catMap;
}
