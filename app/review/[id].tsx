// ✅ app/review/[id].tsx
import { db } from '@/firebase/firebaseConfig';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function ReviewDetailScreen() {
    const { id } = useLocalSearchParams();
    const [review, setReview] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchReview();
    }, [id]);

    const fetchReview = async () => {
        try {
            const docRef = doc(db, 'reviews', String(id));
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setReview({ id: docSnap.id, ...docSnap.data() });
            }
        } catch (error) {
            console.error('Error loading review:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" style={{ marginTop: 100 }} />;
    }

    if (!review) {
        return <Text style={{ marginTop: 100, textAlign: 'center' }}>Review not found.</Text>;
    }

    return (
        <ScrollView style={styles.container}>
            {review.media?.map((item: any, index: number) => (
                <Image
                    key={index}
                    source={{ uri: item.url }}
                    style={styles.media}
                    resizeMode="cover"
                />
            ))}

            <View style={styles.details}>
                <Text style={styles.username}>@{review.username}</Text>
                <Text style={styles.caption}>{review.caption}</Text>
                <Text style={styles.meta}>{review.businessName} • {review.cityState}</Text>
                <Text style={styles.service}>Service: {review.serviceType}</Text>
                <Text style={styles.rating}>Rating: {'⭐'.repeat(review.rating)}</Text>
                <Text style={styles.time}>{new Date(review.createdAt).toLocaleString()}</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        padding: 20,
    },
    media: {
        width: '100%',
        height: screenWidth,
        borderRadius: 12,
        marginBottom: 20,
    },
    details: {
        paddingHorizontal: 8,
    },
    username: {
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 6,
    },
    caption: {
        fontSize: 16,
        color: '#333',
        marginBottom: 10,
    },
    meta: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    service: {
        fontSize: 14,
        color: '#e6007e',
        fontWeight: '600',
    },
    rating: {
        fontSize: 16,
        marginTop: 10,
    },
    time: {
        fontSize: 12,
        color: '#aaa',
        marginTop: 10,
    },
});

// This screen displays the details of a specific review, including images, caption, username, service type, rating, and time of creation
// It fetches the review data from Firestore using the review ID from the URL parameters
// It shows a loading indicator while fetching data and handles cases where the review is not found 