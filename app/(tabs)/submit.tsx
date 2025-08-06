// app/(tabs)/submit.tsx
import { db } from '@/firebase/firebaseConfig';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SubmitReviewScreen() {
  const [businessName, setBusinessName] = useState('');
  const [cityState, setCityState] = useState('');
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState('');
  const [rating, setRating] = useState(0);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!businessName || !caption || !image || !serviceType || rating === 0 || !cityState) {
      Alert.alert('Please fill in all fields and upload an image.');
      return;
    }

    Alert.alert(`Review for ${businessName} submitted!`);
    // Save data to backend later
    // todo
    /// save image to firebase storage 
    // fetch the url of firebase storage and  store it firestore

    try {
      await addDoc(collection(db, 'reviews'), {
        businessName,
        cityState,
        caption,
        image,
        serviceType,
        rating: Number(rating),
        createdAt: new Date().toISOString(),
      });

      Alert.alert('✅ Review submitted!');

      // Clear form
      setBusinessName('');
      setCityState('');
      setImage(null);
      setServiceType('');
      setCaption('');
      setRating('');
    } catch (error) {
      console.error('Firebase submission error:', error);
      Alert.alert('❌ Submission failed.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Post a Review ✨</Text>

      <TextInput
        style={styles.input}
        placeholder="Business Name or @handle"
        placeholderTextColor="#aaa"
        value={businessName}
        onChangeText={setBusinessName}
      />

      <TextInput
        style={styles.input}
        placeholder="City and State (e.g. Houston, TX)"
        placeholderTextColor="#aaa"
        value={cityState}
        onChangeText={setCityState}
      />


      {/* Service Type Dropdown */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Service Type</Text>
        <View style={styles.pickerWrapper}>

          <Picker
            selectedValue={serviceType}
            onValueChange={(itemValue) => setServiceType(itemValue)}
            dropdownIconColor="#e6007e"
          >
            <Picker.Item label="Select a service" value="" />
            <Picker.Item label="Nails" value="nails" />
            <Picker.Item label="Hair" value="hair" />
            <Picker.Item label="Lashes" value="lashes" />
            <Picker.Item label="Wax" value="wax" />
            <Picker.Item label="Brow Service" value="brow" />
          </Picker>
        </View>
      </View>

      {/* Star Rating */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Your Rating</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Text style={styles.star}>{star <= rating ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Write your review caption..."
        placeholderTextColor="#aaa"
        value={caption}
        onChangeText={setCaption}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity onPress={pickImage} style={styles.imageButton}>
        <Text style={styles.imageButtonText}>📸 Upload Photo</Text>
      </TouchableOpacity>

      {image && <Image source={{ uri: image }} style={styles.previewImage} />}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit Review</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 100,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#e6007e',
  },
  input: {
    width: '100%',
    borderColor: '#e6007e',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fdfdfd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#e6007e',
    marginBottom: 6,
    fontWeight: '600',
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6007e',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#000',
    paddingHorizontal: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  star: {
    fontSize: 32,
    marginHorizontal: 4,
    color: '#e6007e',
  },
  imageButton: {
    backgroundColor: '#e6007e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginBottom: 20,
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  previewImage: {
    width: Dimensions.get('window').width * 0.8,
    height: 250,
    borderRadius: 12,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e6007e',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});






