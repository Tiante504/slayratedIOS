// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';

import SlayHeader from '@/components/SlayHeader';
import TabBarPill from '@/components/ui/TabBarPill';

import { Compass, House, Star, UserCircle } from 'phosphor-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBarPill {...props} />}
      screenOptions={{
        // Top SlayRated header
        headerTitle: () => <SlayHeader />,
        headerTitleAlign: 'left',
        headerStyle: { backgroundColor: 'rgba(221, 40, 104, 0.7)' },
        headerShadowVisible: false,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <House
              size={size ?? 24}
              color={color}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused, color, size }) => (
            <Compass
              size={size ?? 24}
              color={color}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="submit"
        options={{
          title: 'Post Review',
          tabBarIcon: ({ focused, color, size }) => (
            <Star
              size={size ?? 24}
              color={color}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <UserCircle
              size={size ?? 24}
              color={color}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
    </Tabs>
  );
}


