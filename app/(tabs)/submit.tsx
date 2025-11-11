import { Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/firebase/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

type PickedMedia = { uri: string; mime: string; type: 'image' | 'video'; durationSec?: number };

const ACCENT = '#6E56CF';
const ACCENT_SOFT = '#edeafc';
const INK = '#0E0E0E';
const MUTED = '#6B6B6B';
const CARD = '#ffffff';
const BG = '#f7f6fb';
const SERVICES = ['nails', 'hair', 'brows', 'makeup'] as const;

const MAX_VIDEO_SEC = 120; // 2 minutes

// Turn a local file URI into a Blob for upload
const uriToBlob = async (uri: string): Promise<Blob> => {
  const res = await fetch(uri);
  return await res.blob();
};

export default function PostReview() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const auth = getAuth();
  const user = auth.currentUser;

  // form state
  const [business, setBusiness] = useState('');
  const [location, setLocation] = useState('');
  const [service, setService] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<PickedMedia[]>([]);
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // keep the submit bar above the keyboard
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, e => setKbHeight(e.endCoordinates?.height ?? 0));
    const h = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => { s.remove(); h.remove(); };
  }, []);

  const canPost = useMemo(
    () => business.trim().length >= 2 && !!service && rating > 0 && media.length > 0,
    [business, service, rating, media]
  );

  const resetForm = () => {
    setBusiness('');
    setLocation('');
    setService(null);
    setRating(0);
    setCaption('');
    setMedia([]);
    setFormKey(k => k + 1);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  };

  /** Pick from iOS/Android Photos app — supports images + videos, duration capped at 2 minutes */
  const pickFromPhotos = async () => {
    try {
      const { status, canAskAgain, granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted && status !== 'limited') {
        if (!canAskAgain) {
          Alert.alert('Permission needed', 'Allow Photo access in Settings to pick images or videos.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]);
        } else {
          Alert.alert('Permission needed', 'Photo access is required to select media.');
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // 👈 includes videos
        allowsMultipleSelection: true,
        selectionLimit: 6,
        quality: 0.9,
        allowsEditing: false,
      });

      if (result.canceled) return;

      const tooLong: string[] = [];
      const picked: PickedMedia[] = (result.assets ?? []).map(a => {
        const isVideo = (a as any).type === 'video';
        const durationSec = isVideo ? Math.round((a as any).duration ?? 0) : undefined;
        if (isVideo && durationSec && durationSec > MAX_VIDEO_SEC) {
          tooLong.push(`${durationSec}s`);
        }
        return {
          uri: a.uri,
          mime: a.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
          type: isVideo ? 'video' : 'image',
          durationSec,
        };
      }).filter(m => !(m.type === 'video' && (m.durationSec ?? 0) > MAX_VIDEO_SEC));

      if (tooLong.length) {
        Alert.alert(
          'Video too long',
          `We only support videos up to 2 minutes. Skipped ${tooLong.length} selection${tooLong.length > 1 ? 's' : ''}.`
        );
      }

      setMedia(prev => [...prev, ...picked]);
    } catch (e: any) {
      console.error('pickFromPhotos error', e);
      Alert.alert('Error', e?.message ?? 'Could not open your photo library.');
    }
  };

  /** Optional “Files” picker — can select videos too (duration may not be available) */
  const pickFromFiles = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;

      const picked: PickedMedia[] = (res.assets ?? []).map(a => {
        const isVideo = (a.mimeType ?? '').startsWith('video/');
        return {
          uri: a.uri,
          mime: a.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
          type: isVideo ? 'video' : 'image',
          // DocumentPicker doesn't reliably expose duration; enforce at upload by size gate
        };
      });

      setMedia(prev => [...prev, ...picked]);
    } catch (e: any) {
      console.error('pickFromFiles error', e);
      Alert.alert('Error', e?.message ?? 'Could not open your files.');
    }
  };

  /** Submit review — saves correct profile username + respects video type */
  const postReview = async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Please log in to post a review.');
      return;
    }
    if (!canPost) return;

    setSaving(true);
    try {
      // Enforce: must have a profile username
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      if (!profileSnap.exists() || !String(profileSnap.data()?.username ?? '').trim()) {
        Alert.alert('Complete Profile', 'Please set a username in your profile before posting.');
        setSaving(false);
        return;
      }
      const profileData = profileSnap.data() as any;
      const usernameFromProfile = String(profileData.username).trim();

      const storage = getStorage();
      const uploads: { url: string; type: 'image' | 'video' }[] = [];

      // upload media
      for (const m of media) {
        // If video came from Photos, durationSec was checked already. For Files, we rely on size/bitrate.
        if (m.type === 'video' && (m.durationSec ?? 0) > MAX_VIDEO_SEC) {
          Alert.alert('Video too long', 'Please choose a video that is 2 minutes or less.');
          setSaving(false);
          return;
        }

        const ts = Date.now() + Math.floor(Math.random() * 1000);
        const isVideo = m.type === 'video' || m.mime.startsWith('video/');
        const ext = isVideo ? 'mp4' : (m.mime.includes('png') ? 'png' : 'jpg');
        const path = `reviews/${user.uid}/${ts}.${ext}`;

        const fileRef = ref(storage, path);
        const blob = await uriToBlob(m.uri);

        // Simple size caps: ~20MB video, ~8MB image (tweak as needed)
        // @ts-ignore
        if (blob.size && ((isVideo && blob.size > 20 * 1024 * 1024) || (!isVideo && blob.size > 8 * 1024 * 1024))) {
          Alert.alert('File too large', isVideo ? 'Video must be under 20 MB.' : 'Image must be under 8 MB.');
          setSaving(false);
          return;
        }

        await uploadBytes(fileRef, blob, { contentType: m.mime });
        const url = await getDownloadURL(fileRef);
        uploads.push({ url, type: isVideo ? 'video' : 'image' });
      }

      await addDoc(collection(db, 'reviews'), {
        userId: user.uid,
        username: usernameFromProfile,
        userDisplay: profileData?.displayName || user.email || '',
        business: business.trim(),
        location: location.trim(),
        service,
        rating,
        caption: caption.trim(),
        media: uploads,                                // 👈 keeps type for each item
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      });

      Alert.alert('Posted ✨', 'Your review is live!');
      resetForm();
      Keyboard.dismiss();
    } catch (e: any) {
      console.error('post failed', e);
      Alert.alert('Error', e?.message ?? 'Failed to post review.');
    } finally {
      setSaving(false);
    }
  };

  // layout math for floating bar
  const postBarBottom = (kbHeight ? kbHeight + 12 : 12) + insets.bottom;
  const extraScrollPad = postBarBottom + 64;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          ref={scrollRef}
          key={formKey}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: extraScrollPad }}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <Text style={styles.heroKicker}>Let them know</Text>
            <Text style={styles.heroTitle}>Post a Review ✨</Text>
            <Text style={styles.heroSub}>Share photos or videos (up to 2 minutes).</Text>
          </View>

          {/* Basics */}
          <View style={styles.card}>
            <Text style={styles.label}>Business Name or @handle</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Gloss Lab"
              value={business}
              onChangeText={setBusiness}
              returnKeyType="next"
            />
            <Text style={[styles.label, { marginTop: 12 }]}>City and State</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Houston, TX"
              value={location}
              onChangeText={setLocation}
              returnKeyType="done"
            />
          </View>

          {/* Service + Rating */}
          <View style={styles.card}>
            <Text style={styles.label}>Service Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {SERVICES.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setService(s)}
                  style={[styles.chip, service === s && { backgroundColor: ACCENT, borderColor: ACCENT }]}
                >
                  <Text style={[styles.chipText, service === s && { color: '#fff' }]}>{s[0].toUpperCase() + s.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>Your Rating</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              {Array.from({ length: 5 }).map((_, i) => {
                const idx = i + 1;
                const active = rating >= idx;
                return (
                  <TouchableOpacity key={i} onPress={() => setRating(idx)}>
                    <Text style={{ fontSize: 28, color: active ? ACCENT : '#dcd6f5' }}>★</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Caption */}
          <View style={styles.card}>
            <Text style={styles.label}>Caption</Text>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="What happened, would you go back, any tips?"
              multiline
              numberOfLines={4}
              style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
              maxLength={500}
              returnKeyType="default"
            />
            <Text style={styles.helper}>Thoughtful reviews help people—and great creators—shine.</Text>
          </View>

          {/* Media */}
          <View style={styles.card}>
            <Text style={styles.label}>Upload Photos / Videos (≤ 2 min)</Text>

            {media.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {media.map((m, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    {m.type === 'image' ? (
                      <Image source={{ uri: m.uri }} style={styles.imagePreview} />
                    ) : (
                      <View>
                        <Video
                          source={{ uri: m.uri }}
                          style={styles.imagePreview}
                          resizeMode="cover"
                          shouldPlay={false}
                          isMuted
                        />
                        <View style={styles.videoBadge}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>▶︎ {Math.min(m.durationSec ?? 0, MAX_VIDEO_SEC)}s</Text>
                        </View>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => setMedia(prev => prev.filter((_, idx) => idx !== i))}
                      style={styles.removeBadge}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '900' }}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.mediaPlaceholder}>
                <Text style={{ color: MUTED }}>No files chosen</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={styles.primaryBtn} onPress={pickFromPhotos}>
                <Text style={styles.primaryBtnText}>From Photos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={pickFromFiles}>
                <Text style={styles.ghostBtnText}>From Files</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Floating Post bar */}
      <View style={[styles.postBar, { paddingBottom: Math.max(insets.bottom, 12), bottom: postBarBottom }]}>
        <TouchableOpacity
          onPress={postReview}
          disabled={!canPost || saving}
          style={[styles.postBtn, (!canPost || saving) && { opacity: 0.5 }]}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.postBtnText}>Post Review</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: CARD,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -120,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 200,
    backgroundColor: ACCENT_SOFT,
    opacity: 0.7,
  },
  heroKicker: { color: MUTED, fontSize: 12, letterSpacing: 1.2, marginBottom: 4 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: INK },
  heroSub: { marginTop: 6, color: MUTED, lineHeight: 20 },

  card: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: CARD,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  label: { fontWeight: '800', color: INK },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e6dffa',
    backgroundColor: '#fbfaff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: INK,
  },
  helper: { marginTop: 8, color: MUTED, fontSize: 12 },

  chip: { borderWidth: 1, borderColor: '#d8d2ee', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  chipText: { color: INK, fontWeight: '700' },

  imagePreview: { width: 110, height: 110, borderRadius: 12 },
  videoBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPlaceholder: {
    marginTop: 10,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#f0ecff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e6dffa',
  },

  primaryBtn: { backgroundColor: ACCENT, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  ghostBtn: { borderWidth: 1, borderColor: INK, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#fff' },
  ghostBtnText: { color: INK, fontWeight: '700' },

  postBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: '#eee1f0',
  },
  postBtn: { backgroundColor: ACCENT, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  postBtnText: { color: '#fff', fontWeight: '800' },
});

