import { db } from '@/firebase/firebaseConfig';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  media?: unknown;
  createdAt?:
  | Timestamp
  | Date
  | { seconds: number; nanoseconds?: number }
  | number
  | null;
};

type StatusDoc = {
  id: string;
  userId: string;
  username?: string;
  userAvatar?: string;
  text: string;
  createdAt?:
  | Timestamp
  | Date
  | { seconds: number; nanoseconds?: number }
  | number
  | null;
};

type FeedItem =
  | { type: 'review'; createdAt: any; data: ReviewDoc }
  | { type: 'status'; createdAt: any; data: StatusDoc };

/* =============== Theme tokens =============== */

// background gradient (fixed behind everything)
const GRADIENT_TOP = '#000000';
const GRADIENT_MID = '#000000';
const GRADIENT_BOTTOM = '#000000';

const CARD = '#FFFFFF';
const INK = '#0E0E0E';
const MUTED = '#6B6B6B';

// lighter, more neutral borders
const BORDER = 'rgba(0,0,0,0.06)';

// primary action color (Post button / links)
const ACCENT = '#3A7BFF'; // royal blue

// softer color for inactive stars etc.
const SOFT = 'rgba(0,0,0,0.18)';

// like heart stays pink
const HEART = '#E066B3';
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
          const url =
            (m as any).url ?? (m as any).uri ?? (m as any).downloadURL ?? '';
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
    const url =
      (raw as any).url ?? (raw as any).uri ?? (raw as any).downloadURL ?? '';
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
      <Text
        key={i}
        style={{
          fontSize: 16,
          color: active ? ACCENT : SOFT,
          marginLeft: 2,
        }}
      >
        ★
      </Text>
    );
  });
  return <View style={{ flexDirection: 'row' }}>{stars}</View>;
}

/* =============== Home (feed) =============== */
export default function Home() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // status composer
  const [statusText, setStatusText] = useState('');
  const remaining = 150 - statusText.length;

  // subscribe to reviews + statuses and merge
  useEffect(() => {
    setLoading(true);

    const revQ = query(
      collection(db, 'reviews'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const statQ = query(
      collection(db, 'statuses'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    let reviews: FeedItem[] = [];
    let statuses: FeedItem[] = [];

    const apply = () => {
      const merged = [...reviews, ...statuses].sort(
        (a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt)
      );
      setFeed(merged);
      setLoading(false);
    };

    const unsubReviews = onSnapshot(
      revQ,
      (snap) => {
        reviews = snap.docs.map((d) => {
          const data = { id: d.id, ...(d.data() as any) } as ReviewDoc;
          return {
            type: 'review',
            createdAt: (data as any).createdAt ?? new Date(),
            data,
          };
        });
        apply();
      },
      (e) => {
        console.error('reviews sub error', e);
        apply();
      }
    );

    const unsubStatuses = onSnapshot(
      statQ,
      (snap) => {
        statuses = snap.docs.map((d) => {
          const data = { id: d.id, ...(d.data() as any) } as StatusDoc;
          return {
            type: 'status',
            createdAt: (data as any).createdAt ?? new Date(),
            data,
          };
        });
        apply();
      },
      (e) => {
        console.error('statuses sub error', e);
        apply();
      }
    );

    return () => {
      unsubReviews();
      unsubStatuses();
    };
  }, []);

  const postStatus = async () => {
    const text = statusText.trim();
    if (!text) return;
    const auth = getAuth();
    const uid = auth.currentUser?.uid ?? 'anon';
    const username = auth.currentUser?.email?.split('@')[0] ?? 'user';

    const safe = text.slice(0, 150);

    await addDoc(collection(db, 'statuses'), {
      userId: uid,
      username,
      text: safe,
      createdAt: serverTimestamp(),
    });

    setStatusText('');
  };

  return (
    <LinearGradient
      colors={[GRADIENT_TOP, GRADIENT_MID, GRADIENT_BOTTOM]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.container}>
        {/* ===== Intro and status composer ===== */}
        <View style={styles.statusBar}>
          <Text style={styles.statusTitle}>
            Share your latest beauty experience ✨
          </Text>
          <Text style={styles.statusSub}>
            Post photos, a quick video, and your honest rating.
          </Text>

          {/* Status composer */}
          <View style={styles.postBox}>
            <TextInput
              value={statusText}
              onChangeText={setStatusText}
              maxLength={150}
              placeholder="Ask for appointments, share updates… (150 chars)"
              placeholderTextColor={MUTED}
              style={styles.postInput}
              returnKeyType="send"
              onSubmitEditing={postStatus}
            />
            <Text
              style={[
                styles.counter,
                { color: remaining < 15 ? ACCENT : MUTED },
              ]}
            >
              {remaining}
            </Text>
            <TouchableOpacity
              onPress={postStatus}
              activeOpacity={0.85}
              style={[styles.postBtn, !statusText.trim() && { opacity: 0.5 }]}
              disabled={!statusText.trim()}
            >
              <Text style={styles.postBtnText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== Feed (reviews + statuses merged) ===== */}
        {loading ? (
          <View
            style={[
              styles.container,
              { alignItems: 'center', justifyContent: 'center' },
            ]}
          >
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={feed}
            keyExtractor={(it, idx) =>
              (it.type === 'review'
                ? `r-${(it.data as ReviewDoc).id}`
                : `s-${(it.data as StatusDoc).id}`) || String(idx)
            }
            renderItem={({ item }) =>
              item.type === 'review' ? (
                <PostCard item={item.data as ReviewDoc} />
              ) : (
                <StatusCard item={item.data as StatusDoc} />
              )
            }
            contentContainerStyle={{ paddingBottom: 80 }}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ color: MUTED }}>No posts yet.</Text>
              </View>
            }
            style={{ paddingHorizontal: 12 }}
          />
        )}
      </View>
    </LinearGradient>
  );
}

/* =============== Status Card (with likes + comments) =============== */
function StatusCard({ item }: { item: StatusDoc }) {
  const auth = getAuth();
  const uid = auth.currentUser?.uid ?? 'anon';

  const date = tsToDate(item.createdAt);
  const ago = formatTimeAgo(date);

  const [likeCount, setLikeCount] = useState(0);
  const [iLike, setILike] = useState(false);
  useEffect(() => {
    const likesRef = collection(db, 'statuses', item.id, 'likes');
    const unsub = onSnapshot(likesRef, (snap) => {
      setLikeCount(snap.size);
      setILike(snap.docs.some((d) => d.id === uid));
    });
    return unsub;
  }, [item.id, uid]);

  const toggleLike = async () => {
    const likeRef = doc(db, 'statuses', item.id, 'likes', uid);
    const exists = await getDoc(likeRef);
    if (exists.exists()) await deleteDoc(likeRef);
    else await setDoc(likeRef, { userId: uid, createdAt: serverTimestamp() });
  };

  const [comments, setComments] = useState<
    { id: string; text: string; username?: string }[]
  >([]);
  const [commentText, setCommentText] = useState('');
  useEffect(() => {
    const commentsRef = query(
      collection(db, 'statuses', item.id, 'comments'),
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
    await addDoc(collection(db, 'statuses', item.id, 'comments'), {
      userId: uid,
      username: auth.currentUser?.email?.split('@')[0] ?? 'user',
      text,
      createdAt: serverTimestamp(),
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.row}>
          {item.userAvatar ? (
            <Image source={{ uri: item.userAvatar }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar} />
          )}
          <View>
            <Text style={styles.username}>@{item.username || 'user'}</Text>
            <Text style={styles.subtle}>{ago} • status</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.caption, { marginTop: 6 }]}>{item.text}</Text>

      <View style={[styles.rowBetween, { marginTop: 10 }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={toggleLike}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 18, color: iLike ? HEART : MUTED }}>
            {iLike ? '♥' : '♡'}
          </Text>
          <Text style={[styles.muted, { marginLeft: 6 }]}>{likeCount}</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <Text style={[styles.muted]}>{comments.length} comments</Text>
        </View>
      </View>

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

/* =============== Post Card (reviews) =============== */
function PostCard({ item }: { item: ReviewDoc }) {
  const auth = getAuth();
  const uid = auth.currentUser?.uid ?? 'anon';
  const isOwner = item.userId === uid;
  const date = tsToDate(item.createdAt);
  const ago = formatTimeAgo(date);

  // DELETE confirmation (owner only)
  const handleDelete = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'reviews', item.id));
          } catch (err) {
            console.error('Delete failed:', err);
            Alert.alert('Error', 'Could not delete this post. Try again.');
          }
        },
      },
    ]);
  };

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
          userCache.set(item.userId, {
            avatar: data.avatar,
            username: data?.username,
          });
          setAvatarUrl(data.avatar);
        }
      } catch { }
    })();
  }, [item.userId, avatarUrl]);

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

  // ===== Community feedback (comment + rating) =====
  const [comments, setComments] = useState<
    { id: string; text: string; username?: string; rating?: number }[]
  >([]);
  const [communityAvg, setCommunityAvg] = useState<number | null>(null);
  const [communityCount, setCommunityCount] = useState(0);

  // “preview” comments (latest 2)
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
          rating: typeof data.rating === 'number' ? data.rating : undefined,
        };
      });
      setComments(rows);
    });
    return unsub;
  }, [item.id]);

  // compute community rating from recent feedback docs (up to 200)
  useEffect(() => {
    const allRef = query(
      collection(db, 'reviews', item.id, 'comments'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsub = onSnapshot(allRef, (snap) => {
      let sum = 0;
      let count = 0;
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        if (typeof data.rating === 'number' && data.rating >= 1 && data.rating <= 5) {
          sum += data.rating;
          count += 1;
        }
      });
      setCommunityCount(count);
      setCommunityAvg(count ? Math.round((sum / count) * 10) / 10 : null);
    });
    return unsub;
  }, [item.id]);

  // modal state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftRating, setDraftRating] = useState(0);

  const openFeedback = () => {
    if (isOwner) {
      Alert.alert("Not allowed", "You can’t rate/comment on your own post.");
      return;
    }
    setDraftText('');
    setDraftRating(0);
    setFeedbackOpen(true);
  };

  const submitFeedback = async () => {
    if (isOwner) {
      Alert.alert("Not allowed", "You can’t rate/comment on your own post.");
      return;
    }

    const text = draftText.trim();
    if (!text) {
      Alert.alert('Missing comment', 'Write a comment before posting.');
      return;
    }
    if (draftRating < 1 || draftRating > 5) {
      Alert.alert('Missing rating', 'Tap 1–5 stars to rate this post.');
      return;
    }

    try {
      setFeedbackOpen(false);
      await addDoc(collection(db, 'reviews', item.id, 'comments'), {
        userId: uid,
        username: auth.currentUser?.email?.split('@')[0] ?? 'user',
        text,
        rating: draftRating,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('submitFeedback failed', err);
      Alert.alert('Error', 'Could not post your feedback. Try again.');
      setFeedbackOpen(true);
    }
  };

  const media = normalizeMedia(item.media);

  return (
    <View style={styles.card}>
      {/* ===== TOP ROW (Avatar + Username + Delete Button) ===== */}
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

        {/* DELETE BUTTON (only shows for the post owner) */}
        {item.userId === uid && (
          <TouchableOpacity onPress={handleDelete} activeOpacity={0.8}>
            <Text style={{ color: '#B00020', fontWeight: '800' }}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ===== MEDIA CAROUSEL ===== */}
      <MediaCarousel media={media} />

      {!!item.caption && <Text style={styles.caption}>{item.caption}</Text>}

      {/* business + original poster rating */}
      <View style={styles.footer}>
        <Text style={styles.muted}>
          {item.business}
          {item.location ? ` • ${item.location}` : ''}
        </Text>
        <View style={styles.row}>{renderStars(item.rating ?? 0)}</View>
      </View>

      {/* Community rating (avg) */}
      <View style={[styles.rowBetween, { marginTop: 10 }]}>
        <View style={styles.row}>
          <Text style={[styles.muted, { fontWeight: '800' }]}>Community:</Text>
          <Text style={[styles.muted, { marginLeft: 6 }]}>
            {communityAvg == null ? '—' : `${communityAvg}★`}
          </Text>
          <Text style={[styles.muted, { marginLeft: 6 }]}>
            ({communityCount})
          </Text>
        </View>

        {/* “Rate + Comment” opens big modal */}
        {!isOwner ? (
          <TouchableOpacity onPress={openFeedback} activeOpacity={0.8}>
            <Text style={{ color: ACCENT, fontWeight: '900' }}>Rate + Comment</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ color: MUTED, fontWeight: '800' }}>Your post</Text>
        )}
      </View>

      {/* Likes + comments count */}
      <View style={[styles.rowBetween, { marginTop: 8 }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={toggleLike}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 18, color: iLike ? HEART : MUTED }}>
            {iLike ? '♥' : '♡'}
          </Text>
          <Text style={[styles.muted, { marginLeft: 6 }]}>{likeCount}</Text>
        </TouchableOpacity>

        <Text style={[styles.muted]}>{comments.length} comments</Text>
      </View>

      {/* Preview latest comments */}
      {comments.length > 0 && (
        <View style={{ marginTop: 10, gap: 6 }}>
          {comments.map((c) => (
            <Text key={c.id} style={{ color: INK }}>
              <Text style={{ fontWeight: '800' }}>@{c.username ?? 'user'}</Text>{' '}
              {typeof c.rating === 'number' ? (
                <Text style={{ color: MUTED }}>({c.rating}★) </Text>
              ) : null}
              {c.text}
            </Text>
          ))}
        </View>
      )}

      {/* ===== Feedback Modal ===== */}
      <Modal
        visible={feedbackOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFeedbackOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setFeedbackOpen(false)}
        >
          <Pressable style={styles.modalSheet} onPress={() => { }}>
            <Text style={styles.modalTitle}>Rate this post</Text>
            <Text style={styles.modalSub}>Your rating helps the community.</Text>

            {/* Star picker */}
            <View style={styles.starRow}>
              {Array.from({ length: 5 }).map((_, i) => {
                const n = i + 1;
                const active = n <= draftRating;
                return (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setDraftRating(n)}
                    activeOpacity={0.75}
                    style={styles.starTap}
                  >
                    <Text style={{ fontSize: 30, color: active ? ACCENT : SOFT }}>
                      ★
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Big comment box */}
            <Text style={[styles.muted, { marginTop: 10, marginBottom: 6 }]}>
              Write your thoughts
            </Text>
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              placeholder="What do you think? Be honest, be respectful…"
              placeholderTextColor={MUTED}
              multiline
              style={styles.modalInput}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setFeedbackOpen(false)}
                activeOpacity={0.8}
                style={[styles.modalBtn, styles.modalBtnGhost]}
              >
                <Text style={[styles.modalBtnText, { color: INK }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitFeedback}
                activeOpacity={0.85}
                style={[styles.modalBtn, styles.modalBtnPrimary]}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Post</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
            <Text style={styles.counterText}>
              {index + 1} / {media.length}
            </Text>
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
            <Text style={styles.viewerTitle}>
              {viewerIndex + 1} / {media.length}
            </Text>
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
  gradient: { flex: 1 },
  container: { flex: 1 },

  // Top section (title + composer)
  statusBar: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },

  statusTitle: { fontWeight: '800', color: INK, fontSize: 16 },
  statusSub: { color: MUTED, marginTop: 4, fontSize: 13 },

  // Status composer
  postBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgb(0, 0, 0)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postInput: { flex: 1, color: INK, paddingVertical: 4 },
  counter: { fontSize: 12, minWidth: 28, textAlign: 'right' },

  postBtn: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  postBtnText: { color: '#fff', fontWeight: '800' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.50)',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgb(12, 0, 0)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
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
  avatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ddd',
    marginRight: 10,
  },

  username: { fontWeight: '800', color: INK },
  subtle: { color: MUTED, fontSize: 12, marginTop: 2 },

  photo: { width: '100%', height: 260, borderRadius: 14, marginTop: 10 },
  caption: { marginTop: 10, color: INK },

  footer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muted: { color: MUTED, fontSize: 12 },

  commentBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgb(0, 0, 0)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fafafa',
  },
  input: { flex: 1, color: INK, paddingVertical: 4 },

  // counter top-right over media
  counterWrapRight: { position: 'absolute', top: 12, right: 12 },
  counterBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
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
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
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
  closeBtn: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: '#fff', fontSize: 20, fontWeight: '900' },
  viewerSlide: {
    width: Dimensions.get('window').width,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  viewerImage: { width: '100%', height: '100%' },

  // ===== Modal (Rate + Comment) =====
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: INK },
  modalSub: { marginTop: 4, color: MUTED, fontSize: 13 },

  starRow: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  starTap: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },

  modalInput: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: INK,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGhost: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
  },
  modalBtnPrimary: {
    backgroundColor: ACCENT,
  },
  modalBtnText: { fontWeight: '900', fontSize: 14 },
});


/* =============== timeline page  =============== */


