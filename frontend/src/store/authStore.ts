import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { moodleAPI } from '../services/api';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  login: (authToken: string) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,
      login: (authToken: string) => {
        moodleAPI.setToken(authToken);
        set({ token: authToken, isAuthenticated: true });
      },
      logout: () => {
        set({ token: null, isAuthenticated: false });
        localStorage.removeItem('moodle_token');
      },
      setToken: (token: string) => {
        moodleAPI.setToken(token);
        set({ token, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        // ページリロード時にlocalStorageから復元されたトークンをMoodleAPIに設定
        if (state?.token) {
          moodleAPI.setToken(state.token);
        }
      },
    }
  )
);
