/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */
const primaryPink = '#E068B1';   // Pink (primary)
const goldAccent = '#D8A336';    // Gold/Orange (secondary)

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',

    // Primary accent used by buttons + active icons
    tint: primaryPink,

    icon: '#687076',
    tabIconDefault: '#687076',

    // When a tab is selected
    tabIconSelected: primaryPink,

    // Brand gold
    gold: goldAccent,
  },

  dark: {
    text: '#ECEDEE',
    background: '#151718',

    tint: primaryPink,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: primaryPink,
    gold: goldAccent,
  },
};


