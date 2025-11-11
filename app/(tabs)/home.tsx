import { db } from '@/firebase/firebaseConfig';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Video } from 'expo-av';

/* ================== Types ================== */
type MediaItem = { url: string; type: 'image' | 'video' };
type ReviewDoc = {
  id: string;
  userId: string;
  username?: string;
  userDisplay?: string;
  userAvatar?: string;
  business: string;
  location?: string;
  service?: string;
  rating?: number;
  caption?: string;
  media?: unknown; // older docs may vary
  createdAt?: Timestamp | Date | { seconds: number; nanoseconds?: number } | number | null;
};

/* =============== Theme tokens =============== */
const BG = '#f7f6fb';
const CARD = '#fff';
const INK = '#0E0E0E';
const MUTED = '#6B6B6B';
const BORDER = '#eee1f0';
const ACCENT = '#6E56CF';
const SOFT = '#e6dffa';
const HEART = '#ff6aa2';
const BLACK = '#000';

/* =============== Simple user cache (avatar/username) =============== */
const userCache = new Map<string, { avatar?: string; username?: string }>();

/* ================== Helpers ================== */
function tsToMillis(ts: any): number {
  const d = tsToDate(ts);
  return d ? d.getTime() : 0;
}
function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000);
  return null;
}
function formatTimeAgo(date: Date | null): string {
  if (!date) return 'just now';
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const s = Math.floor(diff / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  const y = Math.floor(d / 365);
  return `${y}y`;
}
function guessTypeFromUrl(url: string): 'image' | 'video' {
  const v = /\.(mp4|mov|m4v|webm)$/i.test(url);
  return v ? 'video' : 'image';
}
/** Normalize any historical media shape into MediaItem[] */
function normalizeMedia(raw: any): MediaItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((m) => {
        if (!m) return null;
        if (typeof m === 'string') return { url: m, type: guessTypeFromUrl(m) };
        if (typeof m === 'object') {
          const url = (m as any).url ?? (m as any).uri ?? (m as any).downloadURL ?? '';
          if (!url) return null;
          const type =
            (m as any).type === 'image' || (m as any).type === 'video'
              ? (m as any).type
              : guessTypeFromUrl(url);
          return { url, type };
        }
        return null;
      })
      .filter(Boolean) as MediaItem[];
  }
  if (typeof raw === 'string') return [{ url: raw, type: guessTypeFromUrl(raw) }];
  if (typeof raw === 'object') {
    const url = (raw as any).url ?? (raw as any).uri ?? (raw as any).downloadURL ?? '';
    if (!url) return [];
    const type =
      (raw as any).type === 'image' || (raw as any).type === 'video'
        ? (raw as any).type
        : guessTypeFromUrl(url);
    return [{ url, type }];
  }
  return [];
}
function renderStars(n: number) {
  const stars = Array.from({ length: 5 }).map((_, i) => {
    const active = i < n;
    return (
      <Text key={i} style={{ fontSize: 16, color: active ? ACCENT : SOFT, marginLeft: 2 }}>
        ★
      </Text>
    );
  });
  return <View style={{ flexDirection: 'row' }}>{stars}</View>;
}

/* =============== Home (feed) =============== */
export default function Home() {
  const [items, setItems] = useState<ReviewDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: ReviewDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const hydrated = rows.map((r) => ({ ...r, createdAt: (r as any).createdAt ?? new Date() }));
        hydrated.sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt));
        setItems(hydrated);
        setLoading(false);
      },
      (err) => {
        console.error('home feed error', err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusTitle}>Share your latest beauty experience ✨</Text>
        <Text style={styles.statusSub}>Post photos, a quick video, and your honest rating.</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <PostCard item={item} />}
        contentContainerStyle={{ paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: MUTED }}>No reviews yet.</Text>
          </View>
        }
        style={{ paddingHorizontal: 12 }}
      />
    </View>
  );
}

/* =============== Post Card =============== */
function PostCard({ item }: { item: ReviewDoc }) {
  const auth = getAuth();
  const uid = auth.currentUser?.uid ?? 'anon';
  const date = tsToDate(item.createdAt);
  const ago = formatTimeAgo(date);

  // resolve avatar (prefer review's userAvatar, else /users/{userId}, cached)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(item.userAvatar);
  useEffect(() => {
    if (avatarUrl || !item.userId) return;
    const cached = userCache.get(item.userId);
    if (cached?.avatar) {
      setAvatarUrl(cached.avatar);
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', item.userId));
        const data = snap.exists() ? (snap.data() as any) : null;
        if (data?.avatar) {
          userCache.set(item.userId, { avatar: data.avatar, username: data?.username });
          setAvatarUrl(data.avatar);
        }
      } catch {}
    })();
  }, [item.userId, avatarUrl]);

  // likes
  const [likeCount, setLikeCount] = useState(0);
  const [iLike, setILike] = useState(false);
  useEffect(() => {
    const likesRef = collection(db, 'reviews', item.id, 'likes');
    const unsub = onSnapshot(likesRef, (snap) => {
      setLikeCount(snap.size);
      setILike(snap.docs.some((d) => d.id === uid));
    });
    return unsub;
  }, [item.id, uid]);

  const toggleLike = async () => {
    const likeRef = doc(db, 'reviews', item.id, 'likes', uid);
    const exists = await getDoc(likeRef);
    if (exists.exists()) await deleteDoc(likeRef);
    else await setDoc(likeRef, { userId: uid, createdAt: serverTimestamp() });
  };

  // comments preview + add
  const [comments, setComments] = useState<{ id: string; text: string; username?: string }[]>([]);
  const [commentText, setCommentText] = useState('');
  useEffect(() => {
    const commentsRef = query(
      collection(db, 'reviews', item.id, 'comments'),
      orderBy('createdAt', 'desc'),
      limit(2)
    );
    const unsub = onSnapshot(commentsRef, (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as any;
        return { id: d.id, text: data.text ?? '', username: data.username ?? 'user' };
      });
      setComments(rows);
    });
    return unsub;
  }, [item.id]);

  const addComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    setCommentText('');
    await addDoc(collection(db, 'reviews', item.id, 'comments'), {
      userId: uid,
      username: auth.currentUser?.email?.split('@')[0] ?? 'user',
      text,
      createdAt: serverTimestamp(),
    });
  };

  const media = normalizeMedia(item.media);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.rowBetween}>
        <View style={styles.row}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar} />
          )}
          <View>
            <Text style={styles.username}>
              @{item.username || item.userDisplay?.split('@')[0] || 'user'}
            </Text>
            <Text style={styles.subtle}>
              {ago} • {item.service ?? 'beauty'}
            </Text>
          </View>
        </View>
      </View>

      {/* Media carousel */}
      <MediaCarousel media={media} />

      {/* Caption */}
      {!!item.caption && <Text style={styles.caption}>{item.caption}</Text>}

      {/* Meta */}
      <View style={styles.footer}>
        <Text style={styles.muted}>
          {item.business}
          {item.location ? ` • ${item.location}` : ''}
        </Text>
        <View style={styles.row}>{renderStars(item.rating ?? 0)}</View>
      </View>

      {/* Actions */}
      <View style={[styles.rowBetween, { marginTop: 8 }]}>
        <TouchableOpacity style={styles.row} onPress={toggleLike} activeOpacity={0.7}>
          <Text style={{ fontSize: 18, color: iLike ? HEART : MUTED }}>
            {iLike ? '♥' : '♡'}
          </Text>
          <Text style={[styles.muted, { marginLeft: 6 }]}>{likeCount}</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <Text style={[styles.muted]}>{comments.length} comments</Text>
        </View>
      </View>

      {/* Comments preview */}
      {comments.length > 0 && (
        <View style={{ marginTop: 10, gap: 6 }}>
          {comments.map((c) => (
            <Text key={c.id} style={{ color: INK }}>
              <Text style={{ fontWeight: '700' }}>@{c.username ?? 'user'}</Text> {c.text}
            </Text>
          ))}
        </View>
      )}

      {/* Add comment */}
      <View style={styles.commentBox}>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder={'Be kind, be real…'}
          placeholderTextColor={MUTED}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={addComment}
        />
        <TouchableOpacity onPress={addComment} activeOpacity={0.8}>
          <Text style={{ color: ACCENT, fontWeight: '800' }}>Post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* =============== Media Carousel + Fullscreen Viewer =============== */
function MediaCarousel({ media }: { media: MediaItem[] }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length) setIndex(viewableItems[0].index ?? 0);
  }).current;

  const openViewer = useCallback((startAt: number) => {
    setViewerIndex(startAt);
    setViewerOpen(true);
    StatusBar.setBarStyle('light-content');
  }, []);
  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    StatusBar.setBarStyle('dark-content');
  }, []);

  if (!media || !Array.isArray(media) || media.length === 0) return null;

  return (
    <>
      {/* Position badges/dots relative to media */}
      <View style={{ position: 'relative' }}>
        <FlatList
          data={media}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index: i }) => (
            <Pressable onPress={() => openViewer(i)} style={{ width }}>
              {item.type === 'image' ? (
                <Image source={{ uri: item.url }} style={styles.photo} />
              ) : (
                <SmartVideo uri={item.url} playing={i === index} />
              )}
            </Pressable>
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />

        {/* counter: top-right */}
        <View style={styles.counterWrapRight}>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{index + 1} / {media.length}</Text>
          </View>
        </View>

        {/* dots: bottom-center */}
        {media.length > 1 && (
          <View style={styles.dotsBottomCenter}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {media.map((_, i) => (
                <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Fullscreen viewer */}
      <Modal visible={viewerOpen} animationType="fade" onRequestClose={closeViewer}>
        <SafeAreaView style={styles.viewerRoot}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity onPress={closeViewer} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.viewerTitle}>{viewerIndex + 1} / {media.length}</Text>
            <View style={{ width: 44 }} />
          </View>

          <FlatList
            data={media}
            horizontal
            pagingEnabled
            initialScrollIndex={viewerIndex}
            keyExtractor={(_, i) => `v-${i}`}
            getItemLayout={(_, i) => ({
              length: Dimensions.get('window').width,
              offset: i * Dimensions.get('window').width,
              index: i,
            })}
            onMomentumScrollEnd={(e) => {
              const w = Dimensions.get('window').width;
              const idx = Math.round(e.nativeEvent.contentOffset.x / w);
              setViewerIndex(idx);
            }}
            renderItem={({ item }) => (
              <View style={styles.viewerSlide}>
                {item.type === 'image' ? (
                  <Image
                    source={{ uri: item.url }}
                    style={styles.viewerImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Video
                    source={{ uri: item.url }}
                    style={styles.viewerImage}
                    resizeMode="contain"
                    shouldPlay
                    useNativeControls
                    isLooping
                  />
                )}
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

function SmartVideo({ uri, playing }: { uri: string; playing: boolean }) {
  return (
    <Video
      source={{ uri }}
      style={styles.photo}
      resizeMode="cover"
      shouldPlay={playing}
      isLooping
      useNativeControls={false}
      isMuted={!playing}
    />
  );
}

/* ================== Styles ================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  statusBar: {
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomColor: BORDER,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  statusTitle: { fontWeight: '800', color: INK },
  statusSub: { color: MUTED, marginTop: 4 },

  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#ddd', marginRight: 10 },
  avatarImg: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#ddd', marginRight: 10 },

  username: { fontWeight: '800', color: INK },
  subtle: { color: MUTED, fontSize: 12, marginTop: 2 },

  photo: { width: '100%', height: 260, borderRadius: 12, marginTop: 10 },
  caption: { marginTop: 10, color: INK },

  footer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muted: { color: MUTED, fontSize: 12 },

  commentBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, color: INK, paddingVertical: 4 },

  // counter top-right over media
  counterWrapRight: { position: 'absolute', top: 12, right: 12 },
  counterBadge: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  counterText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  // dots bottom-center
  dotsBottomCenter: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 14, borderRadius: 7 },

  // fullscreen viewer
  viewerRoot: { flex: 1, backgroundColor: BLACK },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  viewerTitle: { color: '#fff', fontWeight: '800' },
  closeBtn: { width: 44, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#fff', fontSize: 20, fontWeight: '900' },
  viewerSlide: {
    width: Dimensions.get('window').width,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  viewerImage: { width: '100%', height: '100%' },
});



