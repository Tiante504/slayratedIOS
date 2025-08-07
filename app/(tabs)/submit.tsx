// ✅ Full Updated submit.tsx
import { auth, db, storage } from '@/firebase/firebaseConfig';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
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
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [serviceType, setServiceType] = useState('');
  const [rating, setRating] = useState(1);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission to access media is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
      videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality,
      selectionLimit: 5,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const newMedia: any[] = [];
      for (const asset of result.assets) {
        if (asset.type === 'video' && asset.duration > 120) {
          Alert.alert('Each video must be under 2 minutes.');
          continue;
        }
        if (asset.type === 'image' && newMedia.filter(item => item.type === 'image').length >= 5) {
          Alert.alert('Limit of 5 photos per review.');
          continue;
        }
        newMedia.push(asset);
      }
      setMediaAssets(prev => [...prev, ...newMedia]);
    }
  };

  const handleSubmit = async () => {
    if (!businessName || !caption || mediaAssets.length === 0 || !serviceType || !cityState) {
      Alert.alert('Please fill in all fields and upload media.');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('You must be logged in to post a review.');
      return;
    }

    const userId = currentUser.uid;
    let username = 'anonymous';

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        username = userDoc.data().username;
      }
    } catch (error) {
      console.warn('Could not fetch username:', error);
    }

    try {
      const uploadedMedia = [];
      for (const asset of mediaAssets) {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const ext = asset.type === 'video' ? 'mp4' : 'jpg';
        const fileName = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const storageRef = ref(storage, `reviewMedia/${fileName}`);

        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        uploadedMedia.push({ url: downloadURL, type: asset.type });
      }

      await addDoc(collection(db, 'reviews'), {
        userId,
        username,
        businessName,
        cityState,
        caption,
        media: uploadedMedia,
        serviceType,
        rating: Number(rating),
        createdAt: new Date().toISOString(),
      });

      Alert.alert('✅ Review submitted!');
      setBusinessName('');
      setCityState('');
      setMediaAssets([]);
      setServiceType('');
      setCaption('');
      setRating(1);
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
        <Text style={styles.imageButtonText}>📸 Upload Photo or Video</Text>
      </TouchableOpacity>

      {mediaAssets.map((asset, index) => (
        <Image
          key={index}
          source={{ uri: asset.uri }}
          style={styles.previewImage}
        />
      ))}

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

