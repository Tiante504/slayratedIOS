// app/profile/[username].tsx
import { db } from '@/firebase/firebaseConfig';
import { useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
    collection,
    getDocs,
    orderBy,
    query,
    where
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
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

type Review = {
    id: string;
    userId: string;
    username: string;
    caption?: string;
    serviceType?: string;
    cityState?: string;
    media?: { url: string; type: 'image' | 'video' }[];
    createdAt?: string; // ISO stored in your app
};

type UserProfile = {
    username: string;
    avatar?: string;
    bio?: string;
};

export default function UserProfileScreen() {
    const { username } = useLocalSearchParams();
    const cleanUsername = useMemo(
        () => String(username ?? '').replace(/^@/, '').toLowerCase(),
        [username]
    );

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [targetUid, setTargetUid] = useState<string | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const auth = getAuth();
    const currentUid = auth.currentUser?.uid || null;
    const isMyProfile = currentUid && targetUid ? currentUid === targetUid : false;

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                // 1) Find the user doc by username to get their uid + profile info
                const usersQ = query(
                    collection(db, 'users'),
                    where('username', '==', cleanUsername)
                );
                const usersSnap = await getDocs(usersQ);

                if (!mounted) return;

                if (usersSnap.empty) {
                    setProfile({
                        username: cleanUsername,
                        bio: 'This user has no profile yet.',
                    });
                    setTargetUid(null);
                    setReviews([]);
                    return;
                }

                const userDoc = usersSnap.docs[0];
                const uid = userDoc.id;
                const userData = userDoc.data() as UserProfile;
                setProfile({
                    username: userData.username,
                    avatar: userData.avatar,
                    bio: userData.bio,
                });
                setTargetUid(uid);

                // 2) Load their reviews by userId (better than filtering by username)
                // Requires composite index (userId + createdAt) — you created this earlier.
                const rQ = query(
                    collection(db, 'reviews'),
                    where('userId', '==', uid),
                    orderBy('createdAt', 'desc')
                );
                const rSnap = await getDocs(rQ);

                if (!mounted) return;

                const data = rSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Review) }));
                setReviews(data);
            } catch (e) {
                console.error('Error loading user profile or reviews:', e);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        setLoading(true);
        load();

        return () => {
            mounted = false;
        };
    }, [cleanUsername]);

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Image
                    source={
                        profile?.avatar
                            ? { uri: profile.avatar }
                            : require('../../assets/images/profile-avatar.jpg') // note: path from app/profile/*
                    }
                    style={styles.avatar}
                />

                <View style={styles.headerInfo}>
                    <Text style={styles.username}>@{profile?.username || cleanUsername}</Text>
                    <Text style={styles.bio}>
                        {profile?.bio ?? 'Beauty lover • SlayRated user'}
                    </Text>
                    {/* Optional: show location if you later store one on the user */}
                    {/* <Text style={styles.location}>📍 {profile?.location ?? '—'}</Text> */}

                    <View style={styles.stats}>
                        <Text style={styles.stat}>
                            <Text style={styles.bold}>{reviews.length}</Text> Reviews
                        </Text>
                    </View>

                    {/* Show Edit buttons ONLY on your own profile */}
                    {isMyProfile && (
                        <View style={styles.buttonsRow}>
                            <TouchableOpacity style={styles.button}>
                                <Text style={styles.buttonText}>Edit Profile</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.buttonOutline}>
                                <Text style={styles.buttonOutlineText}>Share Profile</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Reviews Grid */}
            {loading ? (
                <Text style={{ textAlign: 'center', marginTop: 16 }}>Loading…</Text>
            ) : reviews.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>
                    No reviews yet.
                </Text>
            ) : (
                <FlatList
                    data={reviews.filter((r) => r.media?.[0]?.url)}
                    numColumns={3}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <Image source={{ uri: item.media![0].url }} style={styles.gridImage} />
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






