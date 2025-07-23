import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

export default function ExploreScreen() {

  const [userSearch, setUserSearch] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore Reviews 🔍</Text>
      <Text style={styles.subtitle}>Browse real experiences from users near you</Text>

      <TextInput
        style={styles.input}
        placeholder="Search Name or @handle"
        placeholderTextColor="#aaa"
        value={userSearch}
        onChangeText={setUserSearch}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
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
  },
});

