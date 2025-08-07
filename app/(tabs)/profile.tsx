import React, { useEffect, useState } from 'react';
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
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';

const screenWidth = Dimensions.get('window').width;

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserProfileAndReviews = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Get user profile
      const profileRef = doc(db, 'users', user.uid);
      const profileSnap = await getDoc(profileRef);
      const userData = profileSnap.exists() ? profileSnap.data() : null;
      setProfile(userData);

      // Get user reviews
      const reviewsRef = collection(db, 'reviews');
      const q = query(reviewsRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const reviewsSnap = await getDocs(q);
      const userReviews = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(userReviews);
    } catch (error) {
      console.error('Error fetching profile or reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfileAndReviews();
  }, []);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={
            profile?.avatar
              ? { uri: profile.avatar }
              : require('../../assets/images/profile-avatar.jpg')
          }
          style={styles.avatar}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.username}>@{profile?.username || 'loading'}</Text>
          <Text style={styles.bio}>{profile?.bio || 'Certified nail addict 💅 | Houston, TX'}</Text>
          <Text style={styles.location}>📍 Houston, TX</Text>

          <View style={styles.stats}>
            <Text style={styles.stat}>
              <Text style={styles.bold}>{reviews.length}</Text> Reviews
            </Text>
          </View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonOutline}>
              <Text style={styles.buttonOutlineText}>Share Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Reviews Grid */}
      {loading ? (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading...</Text>
      ) : reviews.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>
          No reviews posted yet.
        </Text>
      ) : (
        <FlatList
          data={reviews.filter((item) => item.media?.[0]?.url)}
          numColumns={3}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Image source={{ uri: item.media[0].url }} style={styles.gridImage} />
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
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 50,
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  username: {
    fontWeight: '700',
    fontSize: 20,
    marginBottom: 6,
  },
  bio: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
  },
  location: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  stats: {
    marginTop: 10,
  },
  stat: {
    fontSize: 14,
    color: '#333',
  },
  bold: {
    fontWeight: 'bold',
  },
  buttonsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonOutline: {
    borderColor: '#000',
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  buttonOutlineText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
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






