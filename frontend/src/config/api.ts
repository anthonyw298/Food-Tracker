import axios from 'axios';
import { Platform } from 'react-native';
import { getStorage } from '../utils/storage';

// Change this to your backend API URL
const API_BASE_URL = __DEV__
  ? Platform.OS === 'web' 
    ? 'http://localhost:8000'  // Use localhost for web
    : 'http://192.168.4.23:8000'  // Use IP for mobile
  : 'https://your-api-url.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout (increased for debugging)
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const storage = await getStorage();
    const token = await storage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      const storage = await getStorage();
      await storage.deleteItem('auth_token');
      // Redirect to login handled by auth store
    }
    return Promise.reject(error);
  }
);

export default api;

