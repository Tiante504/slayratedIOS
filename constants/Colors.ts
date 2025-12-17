/**
 * App-wide colors used for light and dark mode.
 * No purple, just blue + orange + neutrals.
 */

const tintColorLight = '#3A7BFF'; // royal blue (buttons, links, etc.)
const tintColorDark = '#3A7BFF';

const orangeActive = '#F99332';   // warm orange for active tab icons

export const Colors = {
  light: {
    text: '#11181C',
    background: '#ffffff',
    tint: tintColorLight,          // general accent (e.g. blue Post button)
    icon: '#687076',               // inactive icon
    tabIconDefault: '#687076',     // inactive tab icon
    tabIconSelected: orangeActive, // active tab icon color
    orange: orangeActive,
    blue: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: orangeActive,
    orange: orangeActive,
    blue: tintColorDark,
  },
};



