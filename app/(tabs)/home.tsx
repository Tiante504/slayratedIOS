// app/(tabs)/home.tsx

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { db } from '@/firebase/firebaseConfig';
import { Review } from '@/types/post';
import { Video } from 'expo-video';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';

const screenWidth = Dimensions.get('window').width;

function formatTimeAgo(date: Date) {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 },
  ];

  for (const i of intervals) {
    const count = Math.floor(seconds / i.seconds);
    if (count >= 1) {
      return `${count} ${i.label}${count > 1 ? 's' : ''} ago`;
    }
  }

  return 'Just now';
}

export default function HomeScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
    fetchCurrentUser();

    const interval = setInterval(() => {
      fetchReviews();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // ✅ Fetch reviews from Firestore
  async function fetchReviews() {
    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        orderBy('createdAt', 'desc')
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const allReviews = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];
      setReviews(allReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      Alert.alert('Error fetching reviews');
    }
  }

  // ✅ Fetch the logged-in user's username
  async function fetchCurrentUser() {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setCurrentUsername(userDoc.data().username);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  }

  return (
    <ScrollView style={styles.container}>
      {/* Logo + Welcome Text */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/slayratedwelcome1.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.welcome}>Welcome back, @{currentUsername || 'slayqueen'}</Text>
      </View>

      {/* Reviews */}
      {reviews && reviews.map((review) => (
        <View key={review.id} style={styles.postCard}>
          <View style={styles.userRow}>
            {review.avatar && <Image source={review.avatar} style={styles.avatar} />}
            <View>
              <TouchableOpacity
                onPress={() => {
                  if (review.username === currentUsername) {
                    router.navigate('/(tabs)/profile');
                  } else {
                    router.push(`/profile/${review.username}`);
                  }

                }}
              >
                <Text style={styles.username}>@{review.username}</Text>
              </TouchableOpacity>
              <Text style={styles.meta}>
                {review.createdAt ? formatTimeAgo(new Date(review.createdAt)) : 'Just now'} • <Text style={styles.tag}>{review.serviceType}</Text>
              </Text>
            </View>
          </View>

          {/* Media content */}
          {Array.isArray(review.media) && review.media.map((item, index) => {
            if (item.type === 'image') {
              return (
                <Image
                  key={index}
                  source={{ uri: item.url }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              );
            } else if (item.type === 'video') {
              return (
                <Video
                  key={index}
                  source={{ uri: item.url }}
                  style={styles.postVideo}
                  useNativeControls
                  resizeMode="resizeMode.COVER"
                  shouldPlay={false}
                />
              );
            }
            return null;
          })}

          {review.image && (
            <Image
              source={review.image}
              style={styles.postImage}
              resizeMode="cover"
            />
          )}

          <Text style={styles.caption}>{review.caption}</Text>

          <View style={styles.starsRow}>
            {Array.from({ length: review.rating }).map((_, index) => (
              <Text key={index} style={styles.star}>⭐</Text>
            ))}
          </View>

          <View style={styles.actionsRow}>
            <Text style={styles.action}>💖 {review.likes}</Text>
            <Text style={styles.action}>💬 {review.comments}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: screenWidth * 0.6,
    height: 60,
  },
  welcome: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
    color: '#333',
  },
  postCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
  },
  username: {
    fontWeight: 'bold',
    color: '#000',
  },
  meta: {
    fontSize: 12,
    color: '#555',
  },
  tag: {
    fontWeight: '600',
    color: '#ff69b4',
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginVertical: 10,
  },
  caption: {
    color: '#333',
    fontSize: 14,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  star: {
    fontSize: 32,
    marginHorizontal: 4,
    color: '#e6007e',
  },
  action: {
    fontSize: 14,
    color: '#555',
  },
  postVideo: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
});

