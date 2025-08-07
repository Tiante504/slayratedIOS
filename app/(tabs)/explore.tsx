// ✅ Enhanced explore.tsx with tap to open full review or profile
import { db } from '@/firebase/firebaseConfig';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function ExploreScreen() {
  const router = useRouter();
  const [userSearch, setUserSearch] = useState('');
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<any[]>([]);

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    const term = userSearch.toLowerCase();
    const results = allReviews.filter((review) => {
      return (
        review?.businessName?.toLowerCase().includes(term) ||
        review?.caption?.toLowerCase().includes(term) ||
        review?.username?.toLowerCase().includes(term.replace('@', '')) ||
        review?.serviceType?.toLowerCase().includes(term) ||
        review?.cityState?.toLowerCase().includes(term)
      );
    });
    setFilteredReviews(results);
  }, [userSearch, allReviews]);

  const fetchReviews = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'reviews'));
      const reviews = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAllReviews(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const renderReview = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.reviewCard}
      onPress={() => router.push(`/review/${item.id}`)}
    >
      {item.media?.[0]?.url && (
        <Image source={{ uri: item.media[0].url }} style={styles.reviewImage} />
      )}
      <View style={styles.reviewTextWrap}>
        <TouchableOpacity onPress={() => router.push(`/profile/${item.username}`)}>
          <Text style={styles.reviewHandle}>@{item.username}</Text>
        </TouchableOpacity>
        <Text style={styles.reviewCaption}>{item.caption}</Text>
        <Text style={styles.reviewMeta}>{item.businessName} • {item.cityState}</Text>
        <Text style={styles.reviewService}>Service: {item.serviceType}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore Reviews 🔍</Text>
      <Text style={styles.subtitle}>Browse real experiences from users near you</Text>

      <TextInput
        style={styles.input}
        placeholder="Search name, @handle, service, or city/state"
        placeholderTextColor="#aaa"
        value={userSearch}
        onChangeText={setUserSearch}
      />

      <FlatList
        data={filteredReviews}
        keyExtractor={(item) => item.id}
        renderItem={renderReview}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  input: {
    width: '100%',
    borderColor: '#e6007e',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fdfdfd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e6007e',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  reviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  reviewTextWrap: {
    paddingHorizontal: 4,
  },
  reviewHandle: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
    color: '#000',
  },
  reviewCaption: {
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
  },
  reviewMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  reviewService: {
    fontSize: 12,
    color: '#e6007e',
    fontWeight: '500',
  },
});
// ✅ explore.tsx - used for exploring reviews
// This screen allows users to browse and search through reviews made by other users
// It is used to discover new businesses and services based on user experiences
// It includes a search bar to filter reviews by business name, username, service type, or city/state
// Tapping on a review opens the full review details, and tapping on a username
// opens the user's profile page


