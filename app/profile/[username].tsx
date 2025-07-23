import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
    Dimensions, FlatList, Image,
    ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';

const dummyUserPosts = {
    beautybyjay: [
        { id: '1', caption: 'Nails on fleek 💅', rating: 5 },
        { id: '2', caption: 'Hair laid 🔥', rating: 4 },
    ],
    glamgoddess: [
        { id: '3', caption: 'My go-to lash tech!', rating: 5 },
    ],
};

// export default function UserProfileScreen() {
//   const { username } = useLocalSearchParams();

//   const posts = dummyUserPosts[username as string] || [];

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>@{username}</Text>
//       <FlatList
//         data={posts}
//         keyExtractor={(item) => item.id}
//         renderItem={({ item }) => (
//           <View style={styles.post}>
//             <Text style={styles.caption}>{item.caption}</Text>
//             <Text>⭐ {item.rating}</Text>
//           </View>
//         )}
//         contentContainerStyle={{ paddingBottom: 100 }}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingTop: 60,
//     paddingHorizontal: 16,
//     backgroundColor: '#fff',
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//   },
//   post: {
//     backgroundColor: '#f9f9f9',
//     borderRadius: 10,
//     padding: 12,
//     marginBottom: 12,
//   },
//   caption: {
//     fontSize: 16,
//     marginBottom: 4,
//   },
// });




const screenWidth = Dimensions.get('window').width;

// Placeholder review posts
const mockReviews = [
    { id: '1', image: require('../../assets/images/sample1.jpg') },
    { id: '2', image: require('../../assets/images/sample2.jpg') },
    { id: '3', image: require('../../assets/images/sample3.jpg') },
    { id: '4', image: require('../../assets/images/sample4.jpg') },
    { id: '5', image: require('../../assets/images/sample5.jpg') },
    { id: '6', image: require('../../assets/images/sample6.jpg') },
];

export default function UserProfileScreen() {
    const { username } = useLocalSearchParams();

    const posts = dummyUserPosts[username as string] || [];

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>

                <Image
                    source={require('../../assets/images/profile-avatar.jpg')}
                    style={styles.avatar}
                />
                <View style={styles.headerInfo}>
                    <Text style={styles.username}>{username}</Text>
                    <Text style={styles.bio}>Certified nail addict 💅 | Houston, TX</Text>
                    <Text style={styles.location}>📍 Houston, TX</Text>

                    <View style={styles.stats}>
                        <Text style={styles.stat}><Text style={styles.bold}>23</Text> Reviews</Text>
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
            <FlatList
                data={mockReviews}
                numColumns={3}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <Image source={item.image} style={styles.gridImage} />
                )}
                scrollEnabled={false}
                contentContainerStyle={styles.gridContainer}
            />
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
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 50,
        marginRight: 20,
    },
    headerInfo: {
        flex: 1,
    },
    username: {
        fontWeight: '700',
        fontSize: 20,
        marginBottom: 6,
    },
    bio: {
        fontSize: 14,
        color: '#444',
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




