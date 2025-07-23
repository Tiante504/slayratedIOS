import { useRouter } from 'expo-router';
import {
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const backgroundImage = require('../assets/images/slayratedwelcome1.png');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => router.push('/signup')}
        >
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>

        {/* Rated 💅 badge moved to bottom center */}
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>Rated 💅</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  overlay: {
    width: '100%',
    paddingHorizontal: 30,
    alignItems: 'center',
    paddingBottom: 30,
  },
  buttonPrimary: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    marginVertical: 8,
    width: '100%',
    borderWidth: 2,
    borderColor: '#fff',
  },
  buttonSecondary: {
    backgroundColor: '#ff69b4',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    marginVertical: 8,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 1,
  },
  badgeContainer: {
    marginTop: 12,
    backgroundColor: '#000',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});


