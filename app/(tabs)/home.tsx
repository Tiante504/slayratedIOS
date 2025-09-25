// app/(tabs)/home.tsx
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { db, storage } from '@/firebase/firebaseConfig';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Video } from 'expo-video';
import { getAuth } from 'firebase/auth';
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';

const screenWidth = Dimensions.get('window').width;

function formatTimeAgoMs(ms: number | undefined) {
  if (!ms) return 'Just now';
  const now = Date.now();
  const seconds = Math.floor((now - ms) / 1000);
  const steps = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ] as const;
  for (const [label, s] of steps) {
    const count = Math.floor(seconds / s);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'Just now';
}

type Review = {
  id: string;
  username: string;
  avatarUrl?: string;
  rating: number;
  caption?: string;
  serviceType?: string;
  media?: Array<{ type: 'image' | 'video'; url: string }>;
  likes?: number;
  comments?: number;
  likedByMe?: boolean;
  createdAtMs?: number;
};

async function ensureUrl(pathOrUrl?: string): Promise<string | undefined> {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  try {
    return await getDownloadURL(storageRef(storage, pathOrUrl));
  } catch (e) {
    console.log('getDownloadURL failed for', pathOrUrl, e);
    return undefined;
  }
}

async function normalizeDoc(id: string, data: any): Promise<Review> {
  const createdAtMs =
    data?.createdAt instanceof Timestamp
      ? data.createdAt.toMillis()
      : typeof data?.createdAt === 'number'
        ? data.createdAt
        : undefined;
  const avatarUrl =
    (await ensureUrl(data?.avatarUrl)) ?? (await ensureUrl(data?.avatarPath));
  const media: Review['media'] = Array.isArray(data?.media)
    ? await Promise.all(
      data.media.map(async (m: any) => ({
        type: m?.type === 'video' ? 'video' : 'image',
        url: (await ensureUrl(m?.url ?? m?.path)) ?? '',
      }))
    )
    : undefined;
  return {
    id,
    username: data?.username ?? data?.handle ?? 'user',
    avatarUrl,
    rating: typeof data?.rating === 'number' ? data.rating : 0,
    caption: data?.caption ?? data?.text ?? '',
    serviceType: data?.serviceType,
    media,
    likes: data?.likes ?? 0,
    comments: data?.comments ?? 0,
    likedByMe: !!data?.likedByMe,
    createdAtMs,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOnce = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'reviews'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      const rows = await Promise.all(
        snap.docs.map((d) => normalizeDoc(d.id, d.data()))
      );
      setReviews(rows);
    } catch (e) {
      console.log('fetchOnce error:', e);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOnce();
    setRefreshing(false);
  }, [fetchOnce]);

  useEffect(() => {
    (async () => {
      try {
        const auth = getAuth();
        setCurrentUsername(auth.currentUser?.displayName ?? null);
      } catch (e) {
        console.log('Fetch current user error:', e);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'reviews'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const unsub = onSnapshot(q, async (snap) => {
        try {
          const rows = await Promise.all(
            snap.docs.map((d) => normalizeDoc(d.id, d.data()))
          );
          setReviews(rows);
        } catch (e) {
          console.log('Normalize error:', e);
        }
      });
      return () => unsub();
    } catch (e) {
      console.log('onSnapshot error:', e);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Review }) => (
      <ReviewCard item={item} router={router} currentUsername={currentUsername} />
    ),
    [router, currentUsername]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable hitSlop={8}>
          <Feather name="menu" size={22} />
        </Pressable>
        <Text style={styles.brand}>SLAY RATED</Text>
        <Pressable hitSlop={8}>
          <Feather name="search" size={22} />
        </Pressable>
      </View>
      <View style={styles.header}>
        <Text style={styles.welcome}>
          Welcome back, @{currentUsername || 'slayqueen'}
        </Text>
      </View>
      <FlatList
        data={reviews}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </SafeAreaView>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < value ? 'star' : 'star-outline'}
          size={16}
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );
}

function ReviewCard({
  item,
  router,
  currentUsername,
}: {
  item: Review;
  router: any;
  currentUsername: string | null;
}) {
  const [liked, setLiked] = useState<boolean>(!!item.likedByMe);
  const [likes, setLikes] = useState<number>(item.likes ?? 0);

  const timeAgo = useMemo(
    () => formatTimeAgoMs(item.createdAtMs),
    [item.createdAtMs]
  );

  const handleLike = async () => {
    setLiked((v) => !v);
    setLikes((n) => (liked ? Math.max(0, n - 1) : n + 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
  };

  const handleComment = () => {
    Alert.alert('Comments', 'Open comments thread here.');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${item.username} on Slay Rated: ${item.caption ?? ''}`,
        url: item.media && item.media[0]?.url,
        title: 'Slay Rated Review',
      });
    } catch (e) {
      console.log('Share cancelled or failed', e);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#eee' }]} />
          )}
          <View>
            <Pressable
              onPress={() => {
                const clean = (u?: string | null) => (u ?? '').replace(/^@/, '').trim();
                const me = clean(currentUsername);
                const them = clean(item.username);
                if (me && me === them) {
                  router.navigate('/(tabs)/profile');
                } else {
                  router.push(`/profile/${them}`);
                }
              }}
            >
              <Text style={styles.username}>
                @{(item.username || '').replace(/^@/, '')}
              </Text>
            </Pressable>
            <Stars value={item.rating} />
          </View>
        </View>
        <Text style={styles.timestamp}>
          {timeAgo} {item.serviceType ? '• ' : ''}{' '}
          <Text style={styles.tag}>{item.serviceType}</Text>
        </Text>
      </View>
      {Array.isArray(item.media) &&
        item.media.map((m, idx) =>
          m.type === 'video' ? (
            <Video
              key={idx}
              source={{ uri: m.url }}
              style={styles.postVideo}
              resizeMode="cover"
              useNativeControls
              shouldPlay={false}
            />
          ) : (
            <Image
              key={idx}
              source={{ uri: m.url }}
              style={styles.media}
              resizeMode="cover"
            />
          )
        )}
      {!!item.caption && <Text style={styles.bodyText}>{item.caption}</Text>}
      <View style={styles.actionBar}>
        <Pressable style={styles.actionBtn} onPress={handleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} />
          <Text style={styles.actionLabel}>{likes}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={handleComment}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} />
          <Text style={styles.actionLabel}>{item.comments ?? 0}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} />
          <Text style={styles.actionLabel}>Share</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  brand: { fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  header: { alignItems: 'center', marginBottom: 10, paddingTop: 8 },
  welcome: { fontSize: 16, fontWeight: '600', marginTop: 6, color: '#333' },
  listContent: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    padding: 12,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  username: { fontWeight: '700', marginBottom: 2 },
  timestamp: { color: '#777', fontSize: 12 },
  tag: { color: '#ff69b4', fontWeight: '600' },
  media: { width: '100%', height: 240, borderRadius: 12, marginVertical: 8 },
  bodyText: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionLabel: { marginLeft: 6, fontWeight: '600' },
  postVideo: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginVertical: 8,
  },
});




