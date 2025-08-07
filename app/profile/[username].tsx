import { db } from '@/firebase/firebaseConfig';
import { useLocalSearchParams } from 'expo-router';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';



const screenWidth = Dimensions.get('window').width;

export default function UserProfileScreen() {
    const { username } = useLocalSearchParams();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const q = query(
                    collection(db, 'reviews'),
                    where('username', '==', username),
                    orderBy('timestamp', 'desc')
                );
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setReviews(data);
            } catch (error) {
                console.error('Error fetching user reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [username]);

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Image
                    source={require('../../assets/images/profile-avatar.jpg')}
                    style={styles.avatar}
                />
                <View style={styles.headerInfo}>
                    <Text style={styles.username}>@{username}</Text>
                    <Text style={styles.bio}>Certified nail addict 💅 | Houston, TX</Text>
                    <Text style={styles.location}>📍 Houston, TX</Text>

                    <View style={styles.stats}>
                        <Text style={styles.stat}>
                            <Text style={styles.bold}>{reviews.length}</Text> Reviews
                        </Text>
                    </View>

                    <View style={styles.buttonsRow}>
                        <TouchableOpacity style={styles.button}>
                            <Text style={styles.buttonText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.buttonOutline}>
                            <Text style={styles.buttonOutlineText}>Share Profile</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Reviews Grid */}
            {loading ? (
                <Text style={{ textAlign: 'center' }}>Loading...</Text>
            ) : reviews.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>
                    No reviews yet.
                </Text>
            ) : (
                <FlatList
                    data={reviews.filter((r) => r.mediaUrl)} // Only show reviews with media
                    numColumns={3}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <Image source={{ uri: item.mediaUrl }} style={styles.gridImage} />
                    )}
                    scrollEnabled={false}
                    contentContainerStyle={styles.gridContainer}
                />
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
    },
    header: {
        paddingTop: 40,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 50,
        marginRight: 20,
    },
    headerInfo: {
        flex: 1,
    },
    username: {
        fontWeight: '700',
        fontSize: 20,
        marginBottom: 6,
    },
    bio: {
        fontSize: 14,
        color: '#444',
    },
    location: {
        fontSize: 13,
        color: '#888',
        marginTop: 4,
    },
    stats: {
        marginTop: 10,
    },
    stat: {
        fontSize: 14,
        color: '#333',
    },
    bold: {
        fontWeight: 'bold',
    },
    buttonsRow: {
        flexDirection: 'row',
        marginTop: 12,
    },
    button: {
        backgroundColor: '#000',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        marginRight: 8,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    buttonOutline: {
        borderColor: '#000',
        borderWidth: 1.5,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
    },
    buttonOutlineText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 20,
    },
    gridContainer: {
        paddingHorizontal: 1,
    },
    gridImage: {
        width: screenWidth / 3 - 2,
        height: screenWidth / 3 - 2,
        margin: 1,
    },
});





