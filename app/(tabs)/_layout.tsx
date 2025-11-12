// app/(tabs)/_layout.tsx
import SlayHeader from '@/components/SlayHeader';
import { Tabs } from 'expo-router';
import React from 'react';

// Icon families you already chose (examples)
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';

const ACTIVE = '#6E56CF';
const INACTIVE = '#9B8CF2';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitle: () => <SlayHeader />,
        headerTitleAlign: 'left',
        headerStyle: { backgroundColor: '#fff' },
        headerShadowVisible: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#EAE7F8',
          height: 62,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <SimpleLineIcons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="saved-search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'Post Review',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="reviews" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="card-account-details-star-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

