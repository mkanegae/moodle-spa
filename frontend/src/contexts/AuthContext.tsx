import React, { createContext, useContext, useState, ReactNode } from 'react';
import { bffClient } from '../services/bffClient';

const USER_STORAGE_KEY = 'webcoach_user';

interface User {
  userid: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// localStorageからユーザー情報を取得
const loadUserFromStorage = (): User | null => {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load user from storage:', e);
  }
  return null;
};

// localStorageにユーザー情報を保存
const saveUserToStorage = (user: User) => {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save user to storage:', e);
  }
};

// localStorageからユーザー情報を削除
const clearUserFromStorage = () => {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear user from storage:', e);
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 初期値としてlocalStorageから復元
  const [user, setUser] = useState<User | null>(() => loadUserFromStorage());
  const loading = false; // localStorageから同期的に復元するため常にfalse

  const refreshUser = async () => {
    // localStorageから復元済みのため、特に処理は不要
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await bffClient.login({ username, password });
      if (response.userId) {
        const newUser = {
          userid: response.userId,
          username: username,
        };
        setUser(newUser);
        saveUserToStorage(newUser);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await bffClient.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      clearUserFromStorage();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
