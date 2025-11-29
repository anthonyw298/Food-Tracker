import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useFoodStore } from '../store/foodStore';
import api from '../config/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function FoodEntryScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const { addEntry, fetchEntries, fetchSummary } = useFoodStore();

  React.useEffect(() => {
    (async () => {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      setHasPermission(cameraStatus.status === 'granted');
      
      const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaStatus.status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant media library access');
      }
    })();
  }, []);

  const takePhoto = async () => {
    if (hasPermission === null) {
      return;
    }
    if (hasPermission === false) {
      Alert.alert('Permission needed', 'Please grant camera access in settings');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const processImage = async (uri: string) => {
    setIsProcessing(true);
    setImage(uri);

    try {
      // Create form data
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri,
        name: filename,
        type,
      } as any);

      // Call recognition API
      const response = await api.post('/food/recognize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const foodData = response.data;
      
      // Populate form with recognized data
      setFoodName(foodData.food_name || '');
      setCalories(foodData.calories?.toString() || '');
      setProtein(foodData.protein?.toString() || '');
      setCarbs(foodData.carbs?.toString() || '');
      setFats(foodData.fats?.toString() || '');
      setServingSize(foodData.serving_size || '1 serving');

      if (foodData.note) {
        Alert.alert('Recognition', foodData.note);
      }
    } catch (error: any) {
      console.error('Recognition error:', error);
      Alert.alert(
        'Recognition Failed',
        'Could not recognize food. Please fill in the details manually.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!foodName.trim()) {
      Alert.alert('Error', 'Please enter a food name');
      return;
    }

    try {
      await addEntry({
        food_name: foodName.trim(),
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fats: parseFloat(fats) || 0,
        serving_size: servingSize.trim() || undefined,
        image_url: image || undefined,
        entry_date: format(new Date(), 'yyyy-MM-dd'),
      });

      // Reset form
      setImage(null);
      setFoodName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFats('');
      setServingSize('');

      Alert.alert('Success', 'Food entry added!', [
        {
          text: 'OK',
          onPress: () => {
            fetchEntries();
            fetchSummary();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.message || 'Failed to save entry');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add Food Entry</Text>

        {/* Image Section */}
        <View style={styles.imageSection}>
          {image ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImage(null)}
              >
                <Ionicons name="close-circle" size={32} color="#F44336" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={64} color="#ccc" />
              <Text style={styles.imagePlaceholderText}>
                {isProcessing ? 'Processing...' : 'Add Photo'}
              </Text>
            </View>
          )}

          <View style={styles.imageButtons}>
            <TouchableOpacity
              style={[styles.imageButton, isProcessing && styles.disabledButton]}
              onPress={takePhoto}
              disabled={isProcessing}
            >
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.imageButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.imageButton, isProcessing && styles.disabledButton]}
              onPress={pickImage}
              disabled={isProcessing}
            >
              <Ionicons name="image" size={24} color="#fff" />
              <Text style={styles.imageButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {isProcessing && (
            <View style={styles.processingIndicator}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.processingText}>Recognizing food...</Text>
            </View>
          )}
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Food Name *</Text>
            <TextInput
              style={styles.input}
              value={foodName}
              onChangeText={setFoodName}
              placeholder="e.g., Grilled Chicken Breast"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroInput}>
              <Text style={styles.label}>Calories</Text>
              <TextInput
                style={styles.input}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.macroInput}>
              <Text style={styles.label}>Serving Size</Text>
              <TextInput
                style={styles.input}
                value={servingSize}
                onChangeText={setServingSize}
                placeholder="1 serving"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroInput}>
              <Text style={styles.label}>Protein (g)</Text>
              <TextInput
                style={styles.input}
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.macroInput}>
              <Text style={styles.label}>Carbs (g)</Text>
              <TextInput
                style={styles.input}
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.macroInput}>
              <Text style={styles.label}>Fats (g)</Text>
              <TextInput
                style={styles.input}
                value={fats}
                onChangeText={setFats}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Entry</Text>
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
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  imageSection: {
    marginBottom: 24,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
  },
  imagePlaceholder: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  imagePlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  processingIndicator: {
    alignItems: 'center',
    marginTop: 16,
  },
  processingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroInput: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

