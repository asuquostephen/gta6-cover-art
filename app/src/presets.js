// Colour-grade presets for Vice Panels. Each preset is a set of canvas filter values plus the
// overlay colours the poster renderer paints over the panels: a top scrim for the title, a
// bottom glow, and the accent used for the title shadow and subtitle pill. All values are
// original to this app; the names describe moods, not any game's artwork.

export const PRESETS = {
  vice: {
    label: 'Vice Sunset',
    filter: 'saturate(1.38) contrast(1.12) brightness(1.05)',
    topScrim: 'rgba(43, 10, 54, 0.55)',
    bottomGlow: ['rgba(255, 94, 58, 0)', 'rgba(255, 46, 136, 0.5)'],
    accent: '#ff2e88',
    accent2: '#ffb347',
    emptyPanel: ['#3a1650', '#8a2463'],
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.55) contrast(1.22) brightness(0.98) hue-rotate(-10deg)',
    topScrim: 'rgba(5, 6, 32, 0.6)',
    bottomGlow: ['rgba(0, 229, 255, 0)', 'rgba(124, 58, 237, 0.55)'],
    accent: '#00e5ff',
    accent2: '#ff2ea6',
    emptyPanel: ['#0b1038', '#3b1470'],
  },
  beach: {
    label: 'Beach Day',
    filter: 'saturate(1.22) contrast(1.03) brightness(1.13) hue-rotate(4deg)',
    topScrim: 'rgba(8, 60, 92, 0.42)',
    bottomGlow: ['rgba(255, 214, 90, 0)', 'rgba(255, 150, 60, 0.38)'],
    accent: '#ffcf3f',
    accent2: '#ff7a59',
    emptyPanel: ['#0e5a7d', '#c97b2d'],
  },
  midnight: {
    label: 'Midnight Crime',
    filter: 'saturate(0.72) contrast(1.32) brightness(0.88)',
    topScrim: 'rgba(2, 4, 12, 0.68)',
    bottomGlow: ['rgba(10, 20, 60, 0)', 'rgba(8, 10, 30, 0.66)'],
    accent: '#7dd3fc',
    accent2: '#334155',
    emptyPanel: ['#05070f', '#1c2440'],
  },
};

export const PRESET_ORDER = ['vice', 'neon', 'beach', 'midnight'];
