// app/(tabs)/_layout.tsx
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import SlayHeader from '@/components/SlayHeader';

import { Compass, House, Star, UserCircle } from 'phosphor-react-native';

// Icon-only tab button with gradient when focused
function TabButton({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.tabButtonContainer}>
      {focused ? (
        // ACTIVE: gradient pill behind the icon
        <LinearGradient
          colors={['#F99332', '#FF72B2', '#3A7BFF']} // orange → pink → blue
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.tabButtonActive}
        >
          {children}
        </LinearGradient>
      ) : (
        // INACTIVE: simple circular touch area
        <View style={styles.tabButton}>
          {children}
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        // Top SlayRated header
        headerTitle: () => <SlayHeader />,
        headerTitleAlign: 'left',
        headerStyle: { backgroundColor: 'rgba(255,255,255,0.18)' },
        headerShadowVisible: false,
        tabBarShowLabel: false,

        tabBarItemStyle: {
          width: 40,
        },
        // Floating glass bar
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView tint="light" intensity={80} style={styles.tabBarBackground} />
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused}>
              <House
                size={30}
                color={focused ? '#FFFFFF' : 'rgba(0,0,0,0.65)'}
                weight={focused ? 'fill' : 'regular'}
              />
            </TabButton>
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused}>
              <Compass
                size={30}
                color={focused ? '#FFFFFF' : 'rgba(0,0,0,0.65)'}
                weight={focused ? 'fill' : 'regular'}
              />
            </TabButton>
          ),
        }}
      />

      <Tabs.Screen
        name="submit"
        options={{
          title: 'Post Review',
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused}>
              <Star
                size={30}
                color={focused ? '#FFFFFF' : 'rgba(0,0,0,0.65)'}
                weight={focused ? 'fill' : 'regular'}
              />
            </TabButton>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused}>
              <UserCircle
                size={30}
                color={focused ? '#FFFFFF' : 'rgba(0,0,0,0.65)'}
                weight={focused ? 'fill' : 'regular'}
              />
            </TabButton>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Floating bar container
  tabBar: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 16,
    height: 46,
    borderRadius: 23,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',

    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  // Glassy background
  tabBarBackground: {
    flex: 1,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.6)', // soft white, no purple
  },

  // Each tab area
  tabButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Inactive button
  tabButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Active gradient pill
  tabButtonActive: {
    padding: 9,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});





