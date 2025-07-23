// firebaseConfig.js
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyD-p0fTFKwmxzcsBBzcgWg5wJp3ft4IdeE",
    authDomain: "slayrate3.firebaseapp.com",
    projectId: "slayrate3",
    storageBucket: "slayrate3.firebasestorage.app",
    messagingSenderId: "782380810563",
    appId: "1:782380810563:web:d336edf5359769049b6ff6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Correct way to initialize Firebase Auth in React Native
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };




