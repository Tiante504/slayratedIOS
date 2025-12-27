import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** COLORS */
const ACTIVE_COLOR = '#000000';          // selected icon + label -> black
const INACTIVE_COLOR = '#000000';        // unselected icons (black)
const PILL_RGBA = 'rgba(237, 122, 197, 0.88)'; //  with glassy opacity

/** LAYOUT */
const HEIGHT = 56;
const RADIUS = 20;
const WIDTH_RATIO = 0.84;
const PRESS_THROTTLE_MS = 320;

export default function TabBarPill({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const lastPressRef = useRef(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const pillWidth = useMemo(() => Math.round(width * WIDTH_RATIO), [width]);
  const left = Math.round((width - pillWidth) / 2);
  const bottom = insets.bottom + 10;

  if (keyboardOpen) return null;

  return (
    <View style={[styles.container, { width: pillWidth, left, bottom }]}>
      {/* Keep the blur for depth, but tint with your brand color */}
      <BlurView intensity={70} tint="light" style={styles.blur}>
        <View style={styles.tint} />
      </BlurView>

      <View style={styles.row} pointerEvents="box-none">
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const options = descriptor?.options ?? {};
          const isFocused = state.index === index;
          const iconColor = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;
          const iconSize = 24;

          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
                ? options.title
                : route.name;

          const onPress = () => {
            const now = Date.now();
            if (now - lastPressRef.current < PRESS_THROTTLE_MS) return;
            lastPressRef.current = now;
            Haptics.selectionAsync().catch(() => null);

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.item}
            >
              <View style={styles.iconWrap}>
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color: iconColor,
                  size: iconSize,
                })}
              </View>
              {isFocused && (
                <Text style={styles.label} numberOfLines={1}>
                  {label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    height: HEIGHT,
    borderRadius: RADIUS,
    overflow: 'hidden',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  /** Semi-opaque brand tint over the blur */
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PILL_RGBA,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: HEIGHT,
  },
  iconWrap: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: ACTIVE_COLOR, // black label when selected
  },
});
