import { db } from '@/firebase/firebaseConfig';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
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

// ---------- Small header component (named export) ----------
export function BigHeader({ title = 'SLAY RATED' }: { title?: string }) {
    return (
        <View style={styles.wrap}>
            <Text style={styles.title}>{title}</Text>
        </View>
    );
}

const screenWidth = Dimensions.get('window').width;

// ---------- Screen (default export) ----------
export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserProfileAndReviews = async () => {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                // Profile
                const profileRef = doc(db, 'users', user.uid);
                const profileSnap = await getDoc(profileRef);
                const userData = profileSnap.exists() ? profileSnap.data() : null;
                setProfile(userData);

                // Reviews by this user (newest first)
                const reviewsRef = collection(db, 'reviews');
                const q = query(
                    reviewsRef,
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                const reviewsSnap = await getDocs(q);
                const userReviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setReviews(userReviews as any[]);
            } catch (error) {
                console.error('Error fetching profile or reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfileAndReviews();
    }, []);

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Optional big header */}
            {/* <BigHeader title="SLAY RATED" /> */}

            {/* Header */}
            <View style={styles.header}>
                <Image
                    source={
                        profile?.avatar
                            ? { uri: String(profile.avatar) }
                            : require('../../../assets/images/profile-avatar.jpg')
                    }
                    style={styles.avatar}
                />

                <View style={styles.headerInfo}>
                    <Text style={styles.username}>@{profile?.username || 'loading'}</Text>
                    <Text style={styles.bio}>
                        {profile?.bio || 'Certified nail addict 💅 | Houston, TX'}
                    </Text>
                    <Text style={styles.location}>📍 {profile?.location || 'Houston, TX'}</Text>

                    <View style={styles.stats}>
                        <Text style={styles.stat}>
                            <Text style={styles.bold}>{reviews.length}</Text> Reviews
                        </Text>
                    </View>

                    <View style={styles.buttonsRow}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => router.push('/edit-profile')}
                        >
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
                <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading...</Text>
            ) : reviews.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>
                    No reviews posted yet.
                </Text>
            ) : (
                <FlatList
                    data={reviews.filter((item: any) => item?.media?.[0]?.url)}
                    numColumns={3}
                    keyExtractor={(item: any) => String(item.id)}
                    renderItem={({ item }: { item: any }) => (
                        <Image source={{ uri: String(item.media[0].url) }} style={styles.gridImage} />
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
    // BigHeader styles (optional)
    wrap: {
        paddingTop: 24,
        paddingBottom: 8,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 2,
    },

    header: {
        paddingTop: 40,
        paddingHorizontal: 20,
        flexDirection: 'column',
        alignItems: 'center',
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 50,
        marginBottom: 12,
    },
    headerInfo: {
        flex: 1,
        alignItems: 'center',
    },
    username: {
        fontWeight: '700',
        fontSize: 20,
        marginBottom: 6,
    },
    bio: {
        fontSize: 14,
        color: '#444',
        textAlign: 'center',
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

