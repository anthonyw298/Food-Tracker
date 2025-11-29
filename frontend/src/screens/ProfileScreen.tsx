import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import api from '../config/api';
import { Ionicons } from '@expo/vector-icons';

interface MacroGoals {
  calorie_goal: number;
  protein_goal: number;
  carb_goal: number;
  fat_goal: number;
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [goals, setGoals] = useState<MacroGoals>({
    calorie_goal: 2000,
    protein_goal: 150,
    carb_goal: 200,
    fat_goal: 65,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoals, setTempGoals] = useState<MacroGoals>(goals);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await api.get('/macro-goals');
      if (response.data) {
        setGoals(response.data);
        setTempGoals(response.data);
      }
    } catch (error) {
      console.error('Fetch goals error:', error);
    }
  };

  const handleSaveGoals = async () => {
    try {
      await api.post('/macro-goals', tempGoals);
      setGoals(tempGoals);
      setIsEditing(false);
      Alert.alert('Success', 'Macro goals updated!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update goals');
    }
  };

  const handleCancel = () => {
    setTempGoals(goals);
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const GoalInput = ({
    label,
    value,
    onChange,
    unit,
    editable,
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    unit: string;
    editable: boolean;
  }) => (
    <View style={styles.goalRow}>
      <Text style={styles.goalLabel}>{label}</Text>
      {editable ? (
        <TextInput
          style={styles.goalInput}
          value={value.toString()}
          onChangeText={(text) => onChange(parseFloat(text) || 0)}
          keyboardType="numeric"
          placeholder="0"
        />
      ) : (
        <Text style={styles.goalValue}>
          {value.toFixed(0)} {unit}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Macro Goals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Macro Goals</Text>
            {!isEditing ? (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={24} color="#4CAF50" />
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity onPress={handleCancel}>
                  <Ionicons name="close" size={24} color="#F44336" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveGoals} style={{ marginLeft: 12 }}>
                  <Ionicons name="checkmark" size={24} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.goalsContainer}>
            <GoalInput
              label="Calories"
              value={isEditing ? tempGoals.calorie_goal : goals.calorie_goal}
              onChange={(value) => setTempGoals({ ...tempGoals, calorie_goal: value })}
              unit="cal"
              editable={isEditing}
            />
            <GoalInput
              label="Protein"
              value={isEditing ? tempGoals.protein_goal : goals.protein_goal}
              onChange={(value) => setTempGoals({ ...tempGoals, protein_goal: value })}
              unit="g"
              editable={isEditing}
            />
            <GoalInput
              label="Carbs"
              value={isEditing ? tempGoals.carb_goal : goals.carb_goal}
              onChange={(value) => setTempGoals({ ...tempGoals, carb_goal: value })}
              unit="g"
              editable={isEditing}
            />
            <GoalInput
              label="Fats"
              value={isEditing ? tempGoals.fat_goal : goals.fat_goal}
              onChange={(value) => setTempGoals({ ...tempGoals, fat_goal: value })}
              unit="g"
              editable={isEditing}
            />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#F44336" />
            <Text style={[styles.settingText, { color: '#F44336' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
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
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalsContainer: {
    gap: 12,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  goalLabel: {
    fontSize: 16,
    color: '#333',
  },
  goalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  goalInput: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
    minWidth: 80,
    textAlign: 'right',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
});

