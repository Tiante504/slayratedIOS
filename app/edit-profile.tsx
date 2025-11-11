import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { db } from '@/firebase/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

type LocalImage = { uri: string; mime: string };

const PINK = '#ff69b4';
const INK = '#0E0E0E';
const MUTED = '#6B6B6B';
const CARD = '#ffffff';
const BG = '#faf7fb';
const hasNewPickerEnum = 'MediaType' in (ImagePicker as any);

export default function EditProfileScreen() {
    const router = useRouter();
    const auth = getAuth();
    const user = auth.currentUser;

    const [avatarLocal, setAvatarLocal] = useState<LocalImage | null>(null);
    const [avatarRemoteUrl, setAvatarRemoteUrl] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            if (!user) return;
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists()) {
                    const data: any = snap.data();
                    setAvatarRemoteUrl(data?.avatar ?? null);
                    setUsername(data?.username ?? '');
                    setBio(data?.bio ?? '');
                }
            } catch (e) {
                console.error('Failed loading profile:', e);
                Alert.alert('Error', 'Could not load your profile.');
            } finally {
                setLoading(false);
            }
        })();
    }, [user]);

    // pickers (latest API)
    const pickFromPhotos = async () => {
        try {
            const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
            let status = existing.status;
            if (status !== 'granted' && status !== 'limited') {
                const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
                status = req.status;
            }
            if (status !== 'granted' && status !== 'limited') {
                Alert.alert('Permission needed', 'Allow photo library access to choose a profile photo.');
                return;
            }

            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: hasNewPickerEnum
                    ? [ImagePicker.MediaType.Images]                                    // new API
                    : (ImagePicker as any).MediaTypeOptions.Images,                     // old API
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.9,
            });


            if (res.canceled) return;
            const asset = res.assets?.[0];
            if (!asset?.uri) return;

            setAvatarLocal({ uri: asset.uri, mime: asset.mimeType ?? 'image/jpeg' });
        } catch (e: any) {
            console.error('pickFromPhotos error', e);
            Alert.alert('Error', e?.message ?? 'Could not open your photo library.');
        }
    };

    const pickFromFiles = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: ['image/*'],
                copyToCacheDirectory: true,
                multiple: false,
            });
            if (res.canceled) return;
            const asset = res.assets?.[0];
            if (!asset?.uri) return;
            setAvatarLocal({ uri: asset.uri, mime: asset.mimeType ?? 'image/jpeg' });
        } catch (e: any) {
            console.error('pickFromFiles error', e);
            Alert.alert('Error', e?.message ?? 'Could not open your files.');
        }
    };

    const uriToBlob = async (uri: string): Promise<Blob> => {
        const response = await fetch(uri);
        return await response.blob();
    };

    const clean = (s: string) => s?.trim() ?? '';
    const usernameValid = clean(username).length >= 2 && clean(username).length <= 24;
    const bioValid = clean(bio).length <= 160;
    const hasAvatar = !!(avatarLocal?.uri || avatarRemoteUrl);
    const completeness = useMemo(() => {
        let score = 0;
        if (hasAvatar) score += 1;
        if (usernameValid) score += 1;
        if (bioValid && clean(bio).length > 0) score += 1;
        return Math.round((score / 3) * 100);
    }, [hasAvatar, usernameValid, bioValid, bio]);

    const saveProfile = async () => {
        if (!user) return;
        if (!usernameValid) {
            Alert.alert('Username', 'Username must be 2–24 characters.');
            return;
        }
        if (!bioValid) {
            Alert.alert('Bio', 'Bio must be 160 characters or fewer.');
            return;
        }

        setSaving(true);
        try {
            let finalAvatarUrl = avatarRemoteUrl ?? null;

            if (avatarLocal) {
                const storage = getStorage();
                const ts = Date.now();
                const ext = avatarLocal.mime.includes('png') ? 'png' : 'jpg';
                const path = `avatars/${user.uid}/avatar_${ts}.${ext}`;
                const fileRef = ref(storage, path);
                const blob = await uriToBlob(avatarLocal.uri);
                // @ts-ignore
                if (blob.size && blob.size > 5 * 1024 * 1024) {
                    Alert.alert('Image too large', 'Please choose an image under 5 MB.');
                    setSaving(false);
                    return;
                }
                await uploadBytes(fileRef, blob, { contentType: avatarLocal.mime });
                finalAvatarUrl = await getDownloadURL(fileRef);
            }

            const updates: any = {
                avatar: finalAvatarUrl,
                username: clean(username),
                usernameLower: clean(username).toLowerCase(),
                bio: clean(bio),
                updatedAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'users', user.uid), updates, { merge: true });

            Alert.alert('Saved', 'Profile updated. Time to post your first slay ✨');
            router.back();
        } catch (e: any) {
            console.error('Save failed:', e);
            Alert.alert('Error', e?.message ?? 'Failed to save profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text style={{ marginTop: 8 }}>Loading…</Text>
            </View>
        );
    }

    const previewUri = avatarLocal?.uri || avatarRemoteUrl;
    const usernameLen = clean(username).length;
    const bioLen = clean(bio).length;

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} bounces>
                {/* Hero */}
                <View style={styles.hero}>
                    <View style={styles.heroGlow} />
                    <Text style={styles.heroKicker}>Make it yours</Text>
                    <Text style={styles.heroTitle}>Your Slay Profile</Text>
                    <Text style={styles.heroSub}>Add a vibe, a look, and let the world rate your slay.</Text>

                    <View style={styles.avatarWrap}>
                        <View style={styles.avatarRing}>
                            <Image
                                source={previewUri ? { uri: previewUri } : require('../assets/images/profile-avatar.jpg')}
                                style={styles.avatar}
                            />
                        </View>
                        <View style={styles.avatarButtonsRow}>
                            <TouchableOpacity onPress={pickFromPhotos} style={styles.smallBtnPrimary}>
                                <Text style={styles.smallBtnPrimaryText}>Edit Photo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={pickFromFiles} style={styles.smallBtnGhost}>
                                <Text style={styles.smallBtnGhostText}>From Files</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.progressRow}>
                        <Text style={styles.progressText}>Profile completeness</Text>
                        <Text style={styles.progressPct}>{completeness}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${completeness}%` }]} />
                    </View>
                </View>

                {/* Username */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>Username</Text>
                        <Text style={[styles.charCount, !usernameValid && { color: '#c0392b' }]}>{usernameLen}/24</Text>
                    </View>
                    <TextInput
                        value={username}
                        onChangeText={setUsername}
                        placeholder="@handle"
                        autoCapitalize="none"
                        style={styles.input}
                        maxLength={24}
                    />
                    <Text style={styles.helper}>Keep it short. We’ll save a lowercase copy for search.</Text>
                </View>

                {/* Bio */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>Bio</Text>
                        <Text style={[styles.charCount, !bioValid && { color: '#c0392b' }]}>{bioLen}/160</Text>
                    </View>
                    <TextInput
                        value={bio}
                        onChangeText={setBio}
                        placeholder="Tell people about your style, specialties, city…"
                        multiline
                        numberOfLines={4}
                        style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
                        maxLength={160}
                    />
                    <Text style={styles.helper}>A great bio boosts follows and reviews. Mention your vibe + location.</Text>
                </View>

                {/* Nudge */}
                <View style={styles.nudge}>
                    <Text style={styles.nudgeTitle}>Pro tip</Text>
                    <Text style={styles.nudgeBody}>
                        Profiles with a photo and bio get <Text style={{ fontWeight: '800' }}>3×</Text> more ratings. After saving,
                        post a look from <Text style={{ fontWeight: '800' }}>Post Review</Text> to start getting slayed ⭐️
                    </Text>
                </View>
            </ScrollView>

            {/* Save bar */}
            <View style={styles.saveBar}>
                <TouchableOpacity onPress={saveProfile} disabled={saving || !usernameValid || !bioValid} style={[styles.saveBtn, (saving || !usernameValid || !bioValid) && { opacity: 0.5 }]}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },

    hero: {
        backgroundColor: CARD, paddingHorizontal: 20, paddingTop: 26, paddingBottom: 18,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden',
    },
    heroGlow: { position: 'absolute', top: -120, left: -60, width: 300, height: 300, borderRadius: 200, backgroundColor: '#ffd1ea', opacity: 0.35, transform: [{ rotate: '15deg' }] },
    heroKicker: { color: MUTED, fontSize: 12, letterSpacing: 1.2, marginBottom: 4 },
    heroTitle: { fontSize: 26, fontWeight: '800', color: INK },
    heroSub: { marginTop: 6, color: MUTED, lineHeight: 20 },

    avatarWrap: { alignItems: 'center', marginTop: 18 },
    avatarRing: { padding: 4, borderRadius: 90, borderWidth: 3, borderColor: PINK },
    avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee' },
    avatarButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    smallBtnPrimary: { backgroundColor: INK, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
    smallBtnPrimaryText: { color: '#fff', fontWeight: '700' },
    smallBtnGhost: { borderWidth: 1, borderColor: INK, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#fff' },
    smallBtnGhostText: { color: INK, fontWeight: '700' },

    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
    progressText: { color: MUTED, fontWeight: '600' },
    progressPct: { color: INK, fontWeight: '800' },
    progressTrack: { marginTop: 8, height: 8, backgroundColor: '#f0e6f2', borderRadius: 999, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: PINK, borderRadius: 999 },

    card: {
        marginTop: 16, marginHorizontal: 16, padding: 14, borderRadius: 14, backgroundColor: CARD,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2,
    },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    cardTitle: { fontWeight: '800', fontSize: 16, color: INK },
    charCount: { color: MUTED, fontSize: 12 },

    input: { marginTop: 10, borderWidth: 1, borderColor: '#e6dfea', backgroundColor: '#fbf9fc', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: INK },
    helper: { marginTop: 8, color: MUTED, fontSize: 12 },

    nudge: { marginTop: 16, marginHorizontal: 16, padding: 14, borderRadius: 14, backgroundColor: '#fff5fb', borderWidth: 1, borderColor: '#ffe2f2' },
    nudgeTitle: { fontWeight: '800', color: INK, marginBottom: 6 },
    nudgeBody: { color: INK, lineHeight: 20 },

    saveBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: BG, borderTopWidth: 1, borderTopColor: '#eee1f0' },
    saveBtn: { backgroundColor: PINK, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
});


