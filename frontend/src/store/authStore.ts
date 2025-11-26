import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        // BFF handles token management via session
        set({ token: authToken, isAuthenticated: true });
      },
      logout: () => {
        set({ token: null, isAuthenticated: false });
        localStorage.removeItem('moodle_token');
      },
      setToken: (token: string) => {
        // BFF handles token management via session
        set({ token, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        // BFF handles token management via session
        // No need to set token here
      },
    }
  )
);
