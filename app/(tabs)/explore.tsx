// SlayRated • Explore (new theme + grid/list + chips)
// Keep the same Firestore shape & routing you already use.

import { db } from '@/firebase/firebaseConfig';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/* ============== Theme ============== */
const BG = '#f7f6fb';
const CARD = '#ffffff';
const INK = '#0E0E0E';
const MUTED = '#6B6B6B';
const BORDER = '#eee1f0';
const ACCENT = '#B266FF'; // primary purple
const LIME = '#E5FFCC';   // soft lime accent

const screenWidth = Dimensions.get('window').width;

export default function ExploreScreen() {
  const router = useRouter();

  // search + filters + view mode
  const [userSearch, setUserSearch] = useState('');
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // data
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getDocs(collection(db, 'reviews'));
        const reviews = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAllReviews(reviews);
      } catch (e) {
        console.error('Error fetching reviews:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredReviews = useMemo(() => {
    const term = userSearch.trim().toLowerCase();

    // base text search
    const base = allReviews.filter((r) => {
      const business = (r?.businessName ?? '').toString().toLowerCase();
      const caption = (r?.caption ?? '').toString().toLowerCase();
      const username = (r?.username ?? '').toString().toLowerCase();
      const service = (r?.serviceType ?? '').toString().toLowerCase();
      const cityState = (r?.cityState ?? '').toString().toLowerCase();

      return (
        (!term ||
          business.includes(term) ||
          caption.includes(term) ||
          username.includes(term.replace('@', '')) ||
          service.includes(term) ||
          cityState.includes(term)) &&
        true
      );
    });

    // chip filters (placeholder logic; you can wire to real fields later)
    return base.filter((r) => {
      if (activeChips.includes('Nearby')) {
        // Example heuristic: prioritize items that have a cityState set
        if (!r?.cityState) return false;
      }
      if (activeChips.includes('Top Rated')) {
        if ((r?.rating ?? 0) < 4) return false;
      }
      if (activeChips.includes('Deals')) {
        // Example heuristic: captions containing keywords
        const cap = (r?.caption ?? '').toString().toLowerCase();
        if (!cap.includes('deal') && !cap.includes('promo') && !cap.includes('special'))
          return false;
      }
      if (activeChips.includes('Open Now')) {
        // Placeholder: require a serviceType or businessName (indicates a real service post)
        if (!r?.serviceType && !r?.businessName) return false;
      }
      return true;
    });
  }, [userSearch, allReviews, activeChips]);

  const toggleChip = (label: string) => {
    setActiveChips((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]
    );
  };

  const renderChip = (label: string) => {
    const active = activeChips.includes(label);
    return (
      <TouchableOpacity
        key={label}
        onPress={() => toggleChip(label)}
        activeOpacity={0.8}
        style={[
          styles.chip,
          active && { backgroundColor: ACCENT + '22', borderColor: ACCENT },
        ]}
      >
        <Text style={[styles.chipText, active && { color: ACCENT }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const toReview = (id: string) => router.push(`/review/${id}`);
  const toProfile = (username?: string) => {
    if (!username) return;
    router.push(`/profile/${username}`);
  };

  /* ---------- Card renderers ---------- */

  // List Card (large image + details)
  const ListCard = ({ item }: { item: any }) => {
    const img = item?.media?.[0]?.url;
    return (
      <TouchableOpacity style={styles.listCard} onPress={() => toReview(item.id)} activeOpacity={0.9}>
        {img ? <Image source={{ uri: img }} style={styles.listImage} /> : <View style={styles.listImageFallback} />}
        <View style={styles.listTextWrap}>
          <Pressable onPress={() => toProfile(item.username)}>
            <Text style={styles.handle}>@{item.username}</Text>
          </Pressable>
          {!!item.caption && <Text style={styles.caption}>{item.caption}</Text>}
          <Text style={styles.meta}>
            {(item.businessName || 'Business')} • {(item.cityState || '—')}
          </Text>
          {!!item.serviceType && (
            <Text style={styles.service}>Service: {item.serviceType}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Grid Tile (tight card with overlay text)
  const GridTile = ({ item }: { item: any }) => {
    const size = (screenWidth - 24 - 12) / 2; // 12px gutters
    const img = item?.media?.[0]?.url;
    return (
      <TouchableOpacity
        onPress={() => toReview(item.id)}
        activeOpacity={0.9}
        style={[styles.gridTile, { width: size, height: size }]}
      >
        {img ? (
          <Image source={{ uri: img }} style={styles.gridImg} />
        ) : (
          <View style={styles.gridImgFallback} />
        )}
        <View style={styles.gridOverlay}>
          <Text numberOfLines={1} style={styles.gridHandle}>@{item.username}</Text>
          {!!item.serviceType && (
            <Text numberOfLines={1} style={styles.gridService}>{item.serviceType}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore 🔍</Text>
        <TouchableOpacity
          onPress={() => setViewMode((v) => (v === 'list' ? 'grid' : 'list'))}
          style={styles.viewToggle}
          activeOpacity={0.8}
        >
          <Text style={styles.viewToggleTxt}>{viewMode === 'list' ? 'Grid' : 'List'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Browse real experiences from the SlayRated community</Text>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔎</Text>
        <TextInput
          style={styles.input}
          placeholder="Search name, @handle, service, or city/state"
          placeholderTextColor={MUTED}
          value={userSearch}
          onChangeText={setUserSearch}
          returnKeyType="search"
        />
      </View>

      {/* Filter chips */}
      <View style={styles.chipsRow}>
        {['Nearby', 'Top Rated', 'Deals', 'Open Now'].map(renderChip)}
      </View>

      {/* List/Grid */}
      <FlatList
        data={filteredReviews}
        key={viewMode} // force layout recalculation when mode changes
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? { gap: 12, paddingHorizontal: 12 } : undefined}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: viewMode === 'list' ? 12 : 0 }}
        renderItem={({ item }) =>
          viewMode === 'grid' ? <GridTile item={item} /> : <ListCard item={item} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: MUTED }}>No results yet—try a different search or filters.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

/* ============== Styles ============== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: CARD,
    borderBottomColor: BORDER,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '800', color: INK },
  viewToggle: {
    backgroundColor: LIME,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d8f5bf',
  },
  viewToggleTxt: { color: INK, fontWeight: '700' },

  subtitle: {
    color: MUTED,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: CARD,
    borderBottomColor: BORDER,
    borderBottomWidth: 1,
  },

  searchWrap: {
    margin: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  searchIcon: { marginRight: 8, fontSize: 16, color: ACCENT },
  input: { flex: 1, fontSize: 16, color: INK },

  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipText: { color: INK, fontWeight: '600', fontSize: 12 },

  /* List view card */
  listCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    borderColor: BORDER,
    borderWidth: 1,
  },
  listImage: {
    width: '100%',
    height: 220,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: '#eee',
  },
  listImageFallback: {
    width: '100%',
    height: 220,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: '#eee',
  },
  listTextWrap: { padding: 12 },
  handle: { color: ACCENT, fontWeight: '800', marginBottom: 4 },
  caption: { color: INK, marginBottom: 6 },
  meta: { color: MUTED, fontSize: 12, marginBottom: 2 },
  service: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: ACCENT + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },

  /* Grid view tile */
  gridTile: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    marginLeft: 12,
  },
  gridImg: { width: '100%', height: '100%' },
  gridImgFallback: { width: '100%', height: '100%', backgroundColor: '#eee' },
  gridOverlay: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  gridHandle: { color: '#fff', fontWeight: '800' },
  gridService: { color: LIME, fontWeight: '700', fontSize: 12 },
});

// ✅ explore.tsx - used for exploring reviews
// This screen allows users to browse and search through reviews made by other users
// It is used to discover new businesses and services based on user experiences
// It includes a search bar to filter reviews by business name, username, service type, or city/state
// Tapping on a review opens the full review details, and tapping on a username
// opens the user's profile page


