// app/profile/[username].tsx
import { db } from '@/firebase/firebaseConfig';
import { useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  collection,
  getDocs,
  limit,
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
  userId?: string;
  username: string;
  caption?: string;
  serviceType?: string;
  cityState?: string;
  media?: { url: string; type: 'image' | 'video' }[];
  createdAt?: number | string | Date; // flexible
  avatarUrl?: string; // optional if you later surface it
};

type UserProfile = {
  username: string;
  usernameLower?: string;
  avatar?: string;
  bio?: string;
};

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams();
  const rawParam = String(username ?? '');
  const cleanParam = useMemo(() => rawParam.replace(/^@/, '').trim(), [rawParam]);
  const cleanLower = useMemo(() => cleanParam.toLowerCase(), [cleanParam]);

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
        // ---------- 1) Try to find the user by usernameLower (case-insensitive) ----------
        let userDoc = null as any;

        // prefer usernameLower if your user docs have it
        const qLower = query(
          collection(db, 'users'),
          where('usernameLower', '==', cleanLower),
          limit(1)
        );
        const snapLower = await getDocs(qLower);

        if (!snapLower.empty) {
          userDoc = snapLower.docs[0];
        } else {
          // fallback to exact-case match on username
          const qExact = query(
            collection(db, 'users'),
            where('username', '==', cleanParam),
            limit(1)
          );
          const snapExact = await getDocs(qExact);
          if (!snapExact.empty) userDoc = snapExact.docs[0];
        }

        if (!mounted) return;

        if (!userDoc) {
          // ---------- No user doc found: still show posts by username ----------
          setProfile({
            username: cleanParam,
            bio: 'This user has no profile yet.',
          });

          const rQ = query(
            collection(db, 'reviews'),
            where('username', '==', cleanParam),
            orderBy('createdAt', 'desc')
          );
          const rSnap = await getDocs(rQ);
          if (!mounted) return;

          const rows: Review[] = rSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setReviews(rows);
          setTargetUid(null);
          return;
        }

        // ---------- Have a user doc: load header + reviews by userId ----------
        const uid = userDoc.id;
        const data = userDoc.data() as UserProfile;
        setProfile({
          username: data?.username ?? cleanParam,
          usernameLower: data?.usernameLower ?? cleanLower,
          avatar: data?.avatar,
          bio: data?.bio,
        });
        setTargetUid(uid);

        const rQ = query(
          collection(db, 'reviews'),
          where('userId', '==', uid),
          orderBy('createdAt', 'desc')
        );
        const rSnap = await getDocs(rQ);
        if (!mounted) return;

        const rows: Review[] = rSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setReviews(rows);
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
  }, [cleanParam, cleanLower]);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={
            profile?.avatar
              ? { uri: profile.avatar }
              : require('../../../assets/images/profile-avatar.jpg')
          }
          style={styles.avatar}
        />

        <View style={styles.headerInfo}>
          <Text style={styles.username}>@{profile?.username || cleanParam}</Text>
          <Text style={styles.bio}>
            {profile?.bio ?? 'Beauty lover • SlayRated user'}
          </Text>

          <View style={styles.stats}>
            <Text style={styles.stat}>
              <Text style={styles.bold}>{reviews.length}</Text> Reviews
            </Text>
          </View>

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
        <Text style={{ textAlign: 'center', marginTop: 16, color: '#9AA0A6' }}>
          Loading…
        </Text>
      ) : reviews.length === 0 ? (
        <Text style={{ textAlign: 'center', color: '#9AA0A6', marginTop: 20 }}>
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
    backgroundColor: '#000000',
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
    color: '#FFFFFF',
  },
  bio: {
    fontSize: 14,
    color: '#B3B3B3',
  },
  location: {
    fontSize: 13,
    color: '#9AA0A6',
    marginTop: 4,
  },
  stats: {
    marginTop: 10,
  },
  stat: {
    fontSize: 14,
    color: '#D0D0D0',
  },
  bold: {
    fontWeight: 'bold',
  },
  buttonsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 8,
  },
  buttonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonOutline: {
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  buttonOutlineText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#1F1F1F',
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
