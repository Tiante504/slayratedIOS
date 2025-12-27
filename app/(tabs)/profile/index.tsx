import avatarPlaceholder from '@/assets/images/profile-avatar.jpg';
import { db } from '@/firebase/firebaseConfig';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    where,
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Review = {
    id: string;
    media?: { url: string; type: 'image' | 'video' }[];
    createdAt?: any;
    createdAtMs?: number;
};

const screenWidth = Dimensions.get('window').width;

export default function ProfileScreen() {
    const router = useRouter();
    const auth = getAuth();
    const user = auth.currentUser;

    const [profile, setProfile] = useState<any>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        // 1) profile
        const getProfile = async () => {
            const snap = await getDoc(doc(db, 'users', user.uid));
            setProfile(snap.exists() ? snap.data() : null);
        };

        // 2) reviews (order by createdAtMs desc, fallback to createdAt)
        const qReviews = query(
            collection(db, 'reviews'),
            where('userId', '==', user.uid),
            orderBy('createdAtMs', 'desc')
        );

        const unsub = onSnapshot(qReviews, (snap) => {
            const rows: Review[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            // defensive: if older docs lack createdAtMs, sort by createdAt to be safe
            rows.sort((a, b) => {
                const aMs = a.createdAtMs ?? (typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0);
                const bMs = b.createdAtMs ?? (typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0);
                return bMs - aMs;
            });
            setReviews(rows);
            setLoading(false);
        });

        getProfile();
        return unsub;
    }, [user?.uid]);

    const avatarSource = useMemo(() => {
        if (profile?.avatar) return { uri: String(profile.avatar) };
        return avatarPlaceholder;
    }, [profile?.avatar]);

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Image source={avatarSource} style={styles.avatar} />
                <View style={styles.headerInfo}>
                    <Text style={styles.username}>@{profile?.username ?? user?.email?.split('@')[0] ?? 'user'}</Text>
                    {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
                    <Text style={styles.location}>📍 {profile?.location ?? 'Houston, TX'}</Text>

                    <Text style={styles.reviewsCount}>
                        <Text style={{ fontWeight: '800' }}>{reviews.length}</Text> Reviews
                    </Text>

                    <View style={styles.buttonsRow}>
                        <TouchableOpacity style={styles.button} onPress={() => router.push('/edit-profile')}>
                            <Text style={styles.buttonText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.buttonOutline} onPress={() => { }}>
                            <Text style={styles.buttonOutlineText}>Share Profile</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            {/* Grid */}
            {loading ? (
                <Text style={{ textAlign: 'center', marginTop: 20, color: '#9AA0A6' }}>Loading…</Text>
            ) : reviews.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20, color: '#9AA0A6' }}>No reviews posted yet.</Text>
            ) : (
                <FlatList
                    data={reviews.filter((r) => r.media?.[0]?.url)}
                    numColumns={3}
                    keyExtractor={(it) => it.id}
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
    container: { backgroundColor: '#000000' },
    header: {
        paddingTop: 40,
        paddingHorizontal: 20,
        flexDirection: 'column',
        alignItems: 'center',
    },
    avatar: { width: 90, height: 90, borderRadius: 50, marginBottom: 12 },
    headerInfo: { flex: 1, alignItems: 'center' },
    username: { fontWeight: '800', fontSize: 20, marginBottom: 6, color: '#FFFFFF' },
    bio: { fontSize: 14, color: '#B3B3B3', textAlign: 'center' },
    location: { fontSize: 13, color: '#9AA0A6', marginTop: 4 },
    reviewsCount: { fontSize: 14, color: '#D0D0D0', marginTop: 10 },
    buttonsRow: { flexDirection: 'row', marginTop: 12 },
    button: { backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, marginRight: 8 },
    buttonText: { color: '#000000', fontWeight: '600', fontSize: 14 },
    buttonOutline: { borderColor: '#FFFFFF', borderWidth: 1.5, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
    buttonOutlineText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

    divider: { height: 1, backgroundColor: '#1F1F1F', marginVertical: 20 },

    gridContainer: { paddingHorizontal: 1 },
    gridImage: { width: screenWidth / 3 - 2, height: screenWidth / 3 - 2, margin: 1 },
});
