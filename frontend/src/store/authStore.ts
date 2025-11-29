import { create } from 'zustand';
import api from '../config/api';
import { getStorage } from '../utils/storage';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user } = response.data;
      
      const storage = await getStorage();
      await storage.setItem('auth_token', access_token);
      
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  },

  register: async (email: string, password: string, name: string) => {
    try {
      const response = await api.post('/auth/register', { email, password, name });
      
      // After registration, try to automatically log in
      // Note: If email confirmation is required, this may fail
      try {
        await useAuthStore.getState().login(email, password);
      } catch (loginError: any) {
        // If auto-login fails, user might need to confirm email first
        // Still show success message
        throw new Error('Registration successful! Please check your email to confirm your account before logging in.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      // If it's already our custom message, throw it as-is
      if (error.message && error.message.includes('Registration successful')) {
        throw error;
      }
      throw new Error(error.response?.data?.detail || error.message || 'Registration failed');
    }
  },

  logout: async () => {
    const storage = await getStorage();
    await storage.deleteItem('auth_token');
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  checkAuth: async () => {
    try {
      const storage = await getStorage();
      const token = await storage.getItem('auth_token');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const response = await api.get('/auth/me');
      set({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Auth check error:', error);
      const storage = await getStorage();
      await storage.deleteItem('auth_token');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));

