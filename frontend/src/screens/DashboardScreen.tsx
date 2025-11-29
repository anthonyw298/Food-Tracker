import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFoodStore } from '../store/foodStore';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

interface MacroCardProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
}

const MacroCard: React.FC<MacroCardProps> = ({ label, current, goal, unit, color }) => {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  
  return (
    <View style={styles.macroCard}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {current.toFixed(0)} / {goal.toFixed(0)} {unit}
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${percentage}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={styles.macroPercentage}>{percentage.toFixed(0)}%</Text>
    </View>
  );
};

export default function DashboardScreen() {
  const { summary, entries, isLoading, fetchSummary, fetchEntries, setSelectedDate, selectedDate } =
    useFoodStore();

  useEffect(() => {
    fetchSummary();
    fetchEntries();
  }, []);

  const onRefresh = React.useCallback(() => {
    fetchSummary();
    fetchEntries();
  }, [fetchSummary, fetchEntries]);

  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDate = format(currentDate, 'yyyy-MM-dd');
    setSelectedDate(newDate);
  };

  const formattedDate = format(new Date(selectedDate), 'MMM dd, yyyy');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <View style={styles.dateSelector}>
            <TouchableOpacity onPress={() => changeDate(-1)}>
              <Ionicons name="chevron-back" size={24} color="#4CAF50" />
            </TouchableOpacity>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <TouchableOpacity onPress={() => changeDate(1)}>
              <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>

        {summary && (
          <>
            {/* Calories Card */}
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.caloriesCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.caloriesLabel}>Total Calories</Text>
              <Text style={styles.caloriesValue}>
                {summary.calories.toFixed(0)}
              </Text>
              <Text style={styles.caloriesGoal}>
                of {summary.calorie_goal.toFixed(0)} goal
              </Text>
              <View style={styles.caloriesProgress}>
                <View
                  style={[
                    styles.caloriesProgressFill,
                    {
                      width: `${Math.min(
                        (summary.calories / summary.calorie_goal) * 100,
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </LinearGradient>

            {/* Macro Cards */}
            <View style={styles.macrosContainer}>
              <MacroCard
                label="Protein"
                current={summary.protein}
                goal={summary.protein_goal}
                unit="g"
                color="#2196F3"
              />
              <MacroCard
                label="Carbs"
                current={summary.carbs}
                goal={summary.carb_goal}
                unit="g"
                color="#FF9800"
              />
              <MacroCard
                label="Fats"
                current={summary.fats}
                goal={summary.fat_goal}
                unit="g"
                color="#F44336"
              />
            </View>

            {/* Today's Entries */}
            <View style={styles.entriesSection}>
              <Text style={styles.sectionTitle}>Today's Entries ({entries.length})</Text>
              {entries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="restaurant-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No food entries yet</Text>
                  <Text style={styles.emptySubtext}>Add your first meal to get started!</Text>
                </View>
              ) : (
                entries.map((entry) => (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryName}>{entry.food_name}</Text>
                      {entry.serving_size && (
                        <Text style={styles.entryServing}>{entry.serving_size}</Text>
                      )}
                    </View>
                    <Text style={styles.entryCalories}>
                      {entry.calories.toFixed(0)} cal
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 120,
    textAlign: 'center',
  },
  caloriesCard: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  caloriesLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  caloriesGoal: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 12,
  },
  caloriesProgress: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  caloriesProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  macrosContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  macroCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  macroValue: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroPercentage: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  entriesSection: {
    padding: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
  entryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  entryServing: {
    fontSize: 14,
    color: '#666',
  },
  entryCalories: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});

