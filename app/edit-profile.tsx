// ✅ edit-profile.tsx
import { db } from '@/firebase/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function EditProfileScreen() {
    const router = useRouter();
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [newAvatar, setNewAvatar] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchUserProfile = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            setBio(data.bio || '');
            setAvatarUrl(data.avatar || null);
        }
    };

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (!result.canceled && result.assets?.[0]) {
            setNewAvatar(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            let finalAvatarUrl = avatarUrl;

            if (newAvatar) {
                const response = await fetch(newAvatar);
                const blob = await response.blob();
                const storage = getStorage();
                const storageRef = ref(storage, `avatars/${user.uid}.jpg`);
                await uploadBytes(storageRef, blob);
                finalAvatarUrl = await getDownloadURL(storageRef);
            }

            await updateDoc(doc(db, 'users', user.uid), {
                bio,
                avatar: finalAvatarUrl,
            });

            Alert.alert('Success', 'Profile updated!');
            router.replace('/(tabs)/profile');
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Error', 'Failed to save changes.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Edit Profile</Text>

            <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                {newAvatar || avatarUrl ? (
                    <Image source={{ uri: newAvatar || avatarUrl }} style={styles.avatar} />
                ) : (
                    <Text style={styles.avatarPlaceholder}>Upload Avatar</Text>
                )}
            </TouchableOpacity>

            <TextInput
                style={styles.input}
                placeholder="Your bio"
                value={bio}
                onChangeText={setBio}
                multiline
            />

            <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={loading}
            >
                <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    avatarWrapper: {
        alignSelf: 'center',
        marginBottom: 20,
        borderRadius: 60,
        width: 120,
        height: 120,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    avatarPlaceholder: {
        color: '#aaa',
    },
    input: {
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
        marginBottom: 20,
    },
    saveButton: {
        backgroundColor: '#e6007e',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
