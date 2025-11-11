import { create } from 'zustand';
import { CourseCategory } from '../types/content';
import { moodleAPI } from '../services/api';

interface CategoryState {
  categories: CourseCategory[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: false,
  error: null,
  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const categoriesData = await moodleAPI.getCategories();
      set({ categories: categoriesData, loading: false });
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      set({ error: error.message || 'カテゴリの取得に失敗しました', loading: false });
    }
  },
}));
