import { create } from 'zustand';
import api from '../config/api';
import { format } from 'date-fns';
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

interface FoodEntry {
  id: number;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  serving_size?: string;
  image_url?: string;
  entry_date: string;
  created_at: string;
}

interface MacroSummary {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  calorie_goal: number;
  protein_goal: number;
  carb_goal: number;
  fat_goal: number;
}

interface FoodState {
  entries: FoodEntry[];
  summary: MacroSummary | null;
  isLoading: boolean;
  selectedDate: string;
  
  // Actions
  fetchEntries: (date?: string) => Promise<void>;
  fetchSummary: (date?: string) => Promise<void>;
  addEntry: (entry: Omit<FoodEntry, 'id' | 'created_at'>) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  setSelectedDate: (date: string) => void;
  
  // Offline sync
  syncOfflineEntries: () => Promise<void>;
  cacheEntry: (entry: Omit<FoodEntry, 'id' | 'created_at'>) => Promise<void>;
}

// Database - only on mobile, use localStorage on web
let db: any = null;
const isWeb = Platform.OS === 'web';

if (!isWeb && SQLite.openDatabase) {
  db = SQLite.openDatabase('foodtracker.db');
  
  // Initialize database
  db.execAsync([
    { sql: 'PRAGMA foreign_keys = ON;', args: [] },
    { sql: `
      CREATE TABLE IF NOT EXISTS food_entries_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food_name TEXT NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fats REAL NOT NULL,
        serving_size TEXT,
        image_url TEXT,
        entry_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `, args: [] },
  ], false);
}

// Web storage helpers using localStorage
const getWebCache = (): FoodEntry[] => {
  if (isWeb) {
    const cached = localStorage.getItem('food_entries_cache');
    return cached ? JSON.parse(cached) : [];
  }
  return [];
};

const saveWebCache = (entries: FoodEntry[]) => {
  if (isWeb) {
    localStorage.setItem('food_entries_cache', JSON.stringify(entries));
  }
};

// Helper functions for local caching
const cacheEntryLocally = async (entry: FoodEntry) => {
  if (isWeb) {
    // Use localStorage on web
    const entries = getWebCache();
    const index = entries.findIndex((e) => e.id === entry.id);
    if (index >= 0) {
      entries[index] = entry;
    } else {
      entries.push(entry);
    }
    saveWebCache(entries);
    return;
  }
  
  // Use SQLite on mobile
  if (db) {
    await db.runAsync(
      `INSERT OR REPLACE INTO food_entries_cache (id, food_name, calories, protein, carbs, fats, serving_size, image_url, entry_date, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        entry.id,
        entry.food_name,
        entry.calories,
        entry.protein,
        entry.carbs,
        entry.fats,
        entry.serving_size || null,
        entry.image_url || null,
        entry.entry_date,
        entry.created_at,
      ]
    );
  }
};

const getCachedEntries = async (date: string): Promise<FoodEntry[]> => {
  if (isWeb) {
    // Use localStorage on web
    const entries = getWebCache();
    return entries.filter((e) => e.entry_date === date).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
  
  // Use SQLite on mobile
  if (db) {
    const cached = await db.getAllAsync<FoodEntry>(
      'SELECT * FROM food_entries_cache WHERE entry_date = ? ORDER BY created_at DESC',
      [date]
    );
    return cached;
  }
  
  return [];
};

export const useFoodStore = create<FoodState>((set, get) => ({
  entries: [],
  summary: null,
  isLoading: false,
  selectedDate: format(new Date(), 'yyyy-MM-dd'),

  fetchEntries: async (date?: string) => {
    const targetDate = date || get().selectedDate;
    set({ isLoading: true });
    
    try {
      const response = await api.get(`/food/entries?date=${targetDate}`);
      set({
        entries: response.data,
        isLoading: false,
      });
      
      // Cache entries locally
      for (const entry of response.data) {
        await cacheEntryLocally(entry);
      }
    } catch (error: any) {
      console.error('Fetch entries error:', error);
      
      // Try to load from local cache if online fetch fails
      const cachedEntries = await getCachedEntries(targetDate);
      set({
        entries: cachedEntries,
        isLoading: false,
      });
    }
  },

  fetchSummary: async (date?: string) => {
    const targetDate = date || get().selectedDate;
    
    try {
      const response = await api.get(`/dashboard/summary?date=${targetDate}`);
      set({ summary: response.data });
    } catch (error: any) {
      console.error('Fetch summary error:', error);
      // Calculate from local entries if API fails
      const entries = get().entries;
      const totals = entries.reduce(
        (acc, entry) => ({
          calories: acc.calories + entry.calories,
          protein: acc.protein + entry.protein,
          carbs: acc.carbs + entry.carbs,
          fats: acc.fats + entry.fats,
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );
      
      set({
        summary: {
          date: targetDate,
          ...totals,
          calorie_goal: 2000,
          protein_goal: 150,
          carb_goal: 200,
          fat_goal: 65,
        },
      });
    }
  },

  addEntry: async (entry: Omit<FoodEntry, 'id' | 'created_at'>) => {
    try {
      const response = await api.post('/food/entries', entry);
      const newEntry = response.data;
      
      set((state) => ({
        entries: [newEntry, ...state.entries],
      }));
      
      // Refresh summary
      await get().fetchSummary();
      
      // Cache entry locally
      await cacheEntryLocally(newEntry);
    } catch (error: any) {
      console.error('Add entry error:', error);
      // Cache offline for later sync
      await get().cacheEntry(entry);
      throw error;
    }
  },

  deleteEntry: async (id: number) => {
    try {
      await api.delete(`/food/entries/${id}`);
      
      set((state) => ({
        entries: state.entries.filter((entry) => entry.id !== id),
      }));
      
      // Refresh summary
      await get().fetchSummary();
    } catch (error: any) {
      console.error('Delete entry error:', error);
      throw error;
    }
  },

  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
    get().fetchEntries(date);
    get().fetchSummary(date);
  },

  cacheEntry: async (entry: Omit<FoodEntry, 'id' | 'created_at'>) => {
    const now = new Date().toISOString();
    const entryToCache: FoodEntry = {
      id: Date.now(), // Temporary ID for web
      ...entry,
      created_at: now,
    };
    
    if (isWeb) {
      // Use localStorage on web
      const entries = getWebCache();
      entries.push(entryToCache);
      saveWebCache(entries);
      return;
    }
    
    // Use SQLite on mobile
    if (db) {
      await db.runAsync(
        `INSERT INTO food_entries_cache (food_name, calories, protein, carbs, fats, serving_size, image_url, entry_date, created_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          entryToCache.food_name,
          entryToCache.calories,
          entryToCache.protein,
          entryToCache.carbs,
          entryToCache.fats,
          entryToCache.serving_size || null,
          entryToCache.image_url || null,
          entryToCache.entry_date,
          entryToCache.created_at,
        ]
      );
    }
  },

  syncOfflineEntries: async () => {
    try {
      let unsynced: FoodEntry[] = [];
      
      if (isWeb) {
        // On web, all cached entries are considered unsynced (no sync flag in localStorage)
        const allEntries = getWebCache();
        unsynced = allEntries.filter((e) => !e.id || e.id < 1000000000000); // Temp IDs
      } else if (db) {
        // Use SQLite on mobile
        unsynced = await db.getAllAsync<FoodEntry>(
          'SELECT * FROM food_entries_cache WHERE synced = 0'
        );
      }
      
      for (const entry of unsynced) {
        try {
          const response = await api.post('/food/entries', {
            food_name: entry.food_name,
            calories: entry.calories,
            protein: entry.protein,
            carbs: entry.carbs,
            fats: entry.fats,
            serving_size: entry.serving_size,
            image_url: entry.image_url,
            entry_date: entry.entry_date,
          });
          
          // Replace temp entry with real one from server
          if (isWeb) {
            const entries = getWebCache();
            const index = entries.findIndex((e) => e.id === entry.id);
            if (index >= 0) {
              entries[index] = response.data;
            }
            saveWebCache(entries);
          } else if (db) {
            // Mark as synced on mobile
            await db.runAsync(
              'UPDATE food_entries_cache SET synced = 1 WHERE id = ?',
              [entry.id]
            );
          }
        } catch (error) {
          console.error('Sync entry error:', error);
        }
      }
      
      // Refresh after sync
      await get().fetchEntries();
      await get().fetchSummary();
    } catch (error) {
      console.error('Sync offline entries error:', error);
    }
  },
}));

