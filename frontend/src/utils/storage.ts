import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Storage helper that works on both mobile and web
export const getStorage = async () => {
  if (Platform.OS === 'web') {
    // Use localStorage on web
    return {
      getItem: async (key: string) => localStorage.getItem(key),
      setItem: async (key: string, value: string) => localStorage.setItem(key, value),
      deleteItem: async (key: string) => localStorage.removeItem(key),
    };
  } else {
    // Use SecureStore on mobile
    return SecureStore;
  }
};

