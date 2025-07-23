// app/(tabs)/home.tsx

import { useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const screenWidth = Dimensions.get('window').width;

const reviews = [
  {
    id: '1',
    username: 'beautybyjay',
    time: '3h ago',
    service: 'Nails',
    avatar: require('../../assets/images/avatar1.png'),
    media: require('../../assets/images/sample-nails.jpg'),
    caption: 'She snapped on these nails 💅✨',
    likes: 24,
    comments: 5,
  },
  {
    id: '2',
    username: 'glambykeisha',
    time: '5h ago',
    service: 'Hair',
    avatar: require('../../assets/images/avatar2.png'),
    media: require('../../assets/images/sample-hair.jpg'),
    caption: 'Love my silk press 🖤🔥',
    likes: 30,
    comments: 7,
  },
];

export default function HomeScreen() {
  const router = useRouter();

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
      {reviews.map((review) => (
        <View key={review.id} style={styles.postCard}>
          <View style={styles.userRow}>
            <Image source={review.avatar} style={styles.avatar} />
            <View>
              <TouchableOpacity onPress={() => router.push(`/profile/${review.username}`)}>
                <Text style={styles.username}>@{review.username}</Text>
              </TouchableOpacity>
              <Text style={styles.meta}>
                {review.time} • <Text style={styles.tag}>{review.service}</Text>
              </Text>
            </View>
          </View>

          <Image source={review.media} style={styles.postImage} />

          <Text style={styles.caption}>{review.caption}</Text>

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
  action: {
    fontSize: 14,
    color: '#555',
  },
});
