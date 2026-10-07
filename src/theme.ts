/** Day palette. Kid and game screens always use it (see `lightColors`). */
const LIGHT = {
  bg: '#F4F2EC',
  card: '#FFFFFF',
  border: '#E6E4DC',
  ink: '#1E3A2F',
  inkSoft: '#5E7268',
  inkMuted: '#8A9A91',
  forest: '#2F5D46',
  forestDeep: '#213D31',
  lime: '#D4E98C',
  sage: '#E6ECE2',
  mint: '#DDEEDA',
  peach: '#F2B49A',
  sky: '#CDE5E3',
  butter: '#F2D78A',
  rose: '#F1D5CF',
  leaf: '#94BA6A',
  danger: '#B5533C',
  white: '#FFFFFF',
  /** Quiet neutral panel inside a card. */
  soft: '#F6F5F1',
  /** Warm (yellow/orange) tint panel and the text that sits on it. */
  warm: '#FFF5DD',
  warmInk: '#7A5A00',
  /** Pink/red tint panel and the text that sits on it. */
  blush: '#FCE6E1',
  blushInk: '#9A3B2A',
  /** Text that always sits on a pastel avatar or tile colour. */
  onPastel: '#1E3A2F',
  /** Soft text on the dark green hero cards. */
  onDark: '#E3EBE5',
};

/** Night palette for the parent and therapist screens. */
const DARK: typeof LIGHT = {
  bg: '#101714',
  card: '#1A231F',
  border: '#2B3631',
  ink: '#E7EFE9',
  inkSoft: '#A8B8AE',
  inkMuted: '#7E8E85',
  forest: '#4E9670',
  forestDeep: '#16261E',
  lime: '#C7DF7E',
  sage: '#24312A',
  mint: '#1F3628',
  peach: '#F2B49A',
  sky: '#CDE5E3',
  butter: '#F2D78A',
  rose: '#F1D5CF',
  leaf: '#86B85E',
  danger: '#EE876F',
  white: '#FFFFFF',
  soft: '#212B26',
  warm: '#3A3120',
  warmInk: '#F2D78A',
  blush: '#3D2926',
  blushInk: '#F4B3A4',
  onPastel: '#1E3A2F',
  onDark: '#E3EBE5',
};

export type Palette = typeof LIGHT;
export type Scheme = 'light' | 'dark';

/**
 * The live palette. Styles are created when modules load, so the scheme is chosen once at
 * start-up (index.ts calls `applyScheme` before the app is imported); switching needs a reload.
 */
export const colors: Palette = { ...LIGHT };
/** Always-light palette for kid and game screens. */
export const lightColors: Palette = Object.freeze({ ...LIGHT });

let scheme: Scheme = 'light';
export const isDark = () => scheme === 'dark';
export function applyScheme(next: Scheme) {
  scheme = next;
  Object.assign(colors, next === 'dark' ? DARK : LIGHT);
}

export const avatarColors = [LIGHT.peach, LIGHT.sky, LIGHT.butter, LIGHT.mint, LIGHT.rose];

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  heavy: 'Inter_800ExtraBold',
};

export const radius = { sm: 12, md: 18, lg: 26, xl: 32 };
