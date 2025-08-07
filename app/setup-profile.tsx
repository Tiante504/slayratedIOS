// ✅ setup-profile.tsx
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../firebase/firebaseConfig';

export default function SetupProfileScreen() {
    const [bio, setBio] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const router = useRouter();

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (!result.canceled && result.assets?.[0]) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            let avatarUrl = '';

            if (imageUri) {
                setUploading(true);
                const response = await fetch(imageUri);
                const blob = await response.blob();
                const storage = getStorage();
                const imageRef = ref(storage, `avatars/${user.uid}.jpg`);
                await uploadBytes(imageRef, blob);
                avatarUrl = await getDownloadURL(imageRef);
            }

            await updateDoc(doc(db, 'users', user.uid), {
                bio,
                avatar: avatarUrl || '',
            });

            Alert.alert('Profile Updated');
            router.replace('/(tabs)/home');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Set Up Your Profile</Text>
            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.avatar} />
                ) : (
                    <Text style={styles.imagePickerText}>Upload Profile Picture</Text>
                )}
            </TouchableOpacity>

            <TextInput
                style={styles.input}
                placeholder="Write a short bio"
                value={bio}
                onChangeText={setBio}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={uploading}>
                <Text style={styles.saveButtonText}>{uploading ? 'Saving...' : 'Save & Continue'}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 80,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    imagePicker: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 120,
        width: 120,
        borderRadius: 60,
        backgroundColor: '#f0f0f0',
        alignSelf: 'center',
        marginBottom: 20,
        overflow: 'hidden',
    },
    avatar: {
        width: 120,
        height: 120,
    },
    imagePickerText: {
        color: '#888',
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    input: {
        backgroundColor: '#f9f9f9',
        padding: 14,
        borderRadius: 8,
        fontSize: 16,
        marginBottom: 20,
        borderColor: '#ccc',
        borderWidth: 1,
    },
    saveButton: {
        backgroundColor: '#e6007e',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});

