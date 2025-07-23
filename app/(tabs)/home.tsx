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
import { collection, getDocs } from 'firebase/firestore';

const screenWidth = Dimensions.get('window').width;

// const reviews = [
//   {
//     id: '1',
//     username: 'beautybyjay',
//     time: '3h ago',
//     service: 'Nails',
//     avatar: require('../../assets/images/avatar1.png'),
//     media: require('../../assets/images/sample-nails.jpg'),
//     caption: 'She snapped on these nails 💅✨',
//     likes: 24,
//     comments: 5,
//   },
//   {
//     id: '2',
//     username: 'glambykeisha',
//     time: '5h ago',
//     service: 'Hair',
//     avatar: require('../../assets/images/avatar2.png'),
//     media: require('../../assets/images/sample-hair.jpg'),
//     caption: 'Love my silk press 🖤🔥',
//     likes: 30,
//     comments: 7,
//   },
// ];

export default function HomeScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[] | null>(null)

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {

    try {
      let reviews = await getDocs(collection(db, 'reviews'));
      const allReviews = reviews.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Review[];
      setReviews(allReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      Alert.alert('Error fetching reviews');
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
        <Text style={styles.welcome}>Welcome back, @slayqueen</Text>
      </View>

      {/* Reviews */}
      {reviews && reviews?.map((review) => (
        <View key={review.id} style={styles.postCard}>
          <View style={styles.userRow}>
            {review.avatar && <Image source={review.avatar} style={styles.avatar} />}
            <View>
              <TouchableOpacity onPress={() => router.push(`/profile/${review.username}`)}>
                <Text style={styles.username}>@{review.username}</Text>
              </TouchableOpacity>
              <Text style={styles.meta}>
                {review.time} • <Text style={styles.tag}>{review.serviceType}</Text>
              </Text>
            </View>
          </View>

          {review.image && <Image source={review.image} style={styles.postImage} />}

          <Text style={styles.caption}>{review.caption}</Text>
          <View style={styles.starsRow}>

            {Array.from({ length: review.rating }, (star) => (
              <Text style={styles.star}>{'⭐'}</Text>
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
});
