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
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/* ================== Types ================== */
type MediaItem = { url: string; type: 'image' | 'video' };
type ReviewDoc = {
  id: string;
  userId: string;
  username?: string;
  userDisplay?: string;
  business: string;
  location?: string;
  service?: string;
  rating?: number;
  caption?: string;
  media?: MediaItem[];
  createdAt?:
  | Timestamp
  | Date
  | { seconds: number; nanoseconds?: number }
  | number
  | null;
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

/* =============== Home: feed shell =============== */
export default function Home() {
  const [items, setItems] = useState<ReviewDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'reviews'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: ReviewDoc[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ReviewDoc, 'id'>),
        }));

        const hydrated = rows.map((r) => ({
          ...r,
          createdAt: (r as any).createdAt ?? new Date(),
        }));

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
      {/* CTA/status header */}
      <View style={styles.statusBar}>
        <Text style={styles.statusTitle}>Share your latest beauty experience ✨</Text>
        <Text style={styles.statusSub}>
          Post photos, a quick video, and your honest rating.
        </Text>
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

  const firstMedia = item.media?.[0];
  const date = tsToDate(item.createdAt);
  const ago = formatTimeAgo(date);

  // --- likes live state ---
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
    if (exists.exists()) {
      await deleteDoc(likeRef);
    } else {
      await setDoc(likeRef, {
        userId: uid,
        createdAt: serverTimestamp(),
      });
    }
  };

  // --- comments (preview + add) ---
  const [comments, setComments] = useState<
    { id: string; text: string; username?: string }[]
  >([]);
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
        return {
          id: d.id,
          text: data.text ?? '',
          username: data.username ?? 'user',
        };
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

  const prompt = useMemo(() => {
    const s = (item.service ?? '').toLowerCase();
    if (s.includes('nail')) return 'Drop a gloss tip…';
    if (s.includes('hair')) return 'Share product + stylist…';
    if (s.includes('lash')) return 'Classic, hybrid, mega? Spill…';
    return 'Be kind, be real…';
  }, [item.service]);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.rowBetween}>
        <View style={styles.row}>
          <View style={styles.avatar} />
          <View>
            <Text style={styles.username}>
              @{item.username ?? item.userDisplay ?? 'user'}
            </Text>
            <Text style={styles.subtle}>
              {ago} • {item.service ?? 'beauty'}
            </Text>
          </View>
        </View>
      </View>

      {/* Media */}
      {firstMedia?.type === 'image' && (
        <Image source={{ uri: firstMedia.url }} style={styles.photo} />
      )}

      {/* Caption */}
      {!!item.caption && <Text style={styles.caption}>{item.caption}</Text>}

      {/* Meta: business + rating stars */}
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
              <Text style={{ fontWeight: '700' }}>
                @{c.username ?? 'user'}
              </Text>{' '}
              {c.text}
            </Text>
          ))}
        </View>
      )}

      {/* Add comment */}
      <View style={styles.commentBox}>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder={prompt}
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

/* ================== Helpers ================== */
function tsToMillis(ts: any): number {
  const d = tsToDate(ts);
  return d ? d.getTime() : 0;
}

function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === 'function') return ts.toDate(); // Firestore Timestamp
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000);
  return null;
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'just now';
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());

  const secs = Math.floor(diff / 1000);
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s`;

  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;

  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;

  const years = Math.floor(days / 365);
  return `${years}y`;
}

function renderStars(n: number) {
  const stars = Array.from({ length: 5 }).map((_, i) => {
    const active = i < n;
    return (
      <Text
        key={i}
        style={{ fontSize: 16, color: active ? ACCENT : SOFT, marginLeft: 2 }}
      >
        ★
      </Text>
    );
  });
  return <View style={{ flexDirection: 'row' }}>{stars}</View>;
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ddd',
    marginRight: 10,
  },
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
  input: {
    flex: 1,
    color: INK,
    paddingVertical: 4,
  },
});

