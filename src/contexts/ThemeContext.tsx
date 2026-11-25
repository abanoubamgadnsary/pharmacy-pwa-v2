import React, { createContext, useContext, useEffect, useState } from 'react';

export interface ThemePalette {
  id: string;
  nameEn: string;
  nameAr: string;
  preview: string;
  vars: Record<string, string>;
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'emerald',
    nameEn: 'Emerald',
    nameAr: 'زمردي',
    preview: '#0d493a',
    vars: {
      '--ph-darkest': '#041510',
      '--ph-dark':    '#072318',
      '--ph-green':   '#0d493a',
      '--ph-mid':     '#1a6b55',
      '--ph-mint':    '#00c896',
      '--ph-lime':    '#c8ff5e',
      '--ph-glow':    'rgba(0, 200, 150, 0.22)',
      '--ph-glow-lg': 'rgba(0, 200, 150, 0.35)',
      '--ph-bg':      '#f0f8f5',
      '--ph-border':  '#d4ece4',
      '--ph-text':    '#0a2218',
      '--ph-sub':     '#4d7263',
    },
  },
  {
    id: 'ocean',
    nameEn: 'Ocean Blue',
    nameAr: 'أزرق محيطي',
    preview: '#0f3b6e',
    vars: {
      '--ph-darkest': '#061529',
      '--ph-dark':    '#0a2444',
      '--ph-green':   '#0f3b6e',
      '--ph-mid':     '#1d5fa3',
      '--ph-mint':    '#0ea5e9',
      '--ph-lime':    '#bae6fd',
      '--ph-glow':    'rgba(14, 165, 233, 0.22)',
      '--ph-glow-lg': 'rgba(14, 165, 233, 0.35)',
      '--ph-bg':      '#f0f7ff',
      '--ph-border':  '#d0e4f7',
      '--ph-text':    '#0c2340',
      '--ph-sub':     '#47698a',
    },
  },
  {
    id: 'indigo',
    nameEn: 'Royal Indigo',
    nameAr: 'نيلي ملكي',
    preview: '#312e81',
    vars: {
      '--ph-darkest': '#14123a',
      '--ph-dark':    '#1e1b54',
      '--ph-green':   '#312e81',
      '--ph-mid':     '#4338ca',
      '--ph-mint':    '#6366f1',
      '--ph-lime':    '#c7d2fe',
      '--ph-glow':    'rgba(99, 102, 241, 0.22)',
      '--ph-glow-lg': 'rgba(99, 102, 241, 0.35)',
      '--ph-bg':      '#f3f4ff',
      '--ph-border':  '#dce0fa',
      '--ph-text':    '#1a174d',
      '--ph-sub':     '#55528a',
    },
  },
  {
    id: 'teal',
    nameEn: 'Teal',
    nameAr: 'تركواز',
    preview: '#115e59',
    vars: {
      '--ph-darkest': '#052220',
      '--ph-dark':    '#093835',
      '--ph-green':   '#115e59',
      '--ph-mid':     '#0f766e',
      '--ph-mint':    '#14b8a6',
      '--ph-lime':    '#99f6e4',
      '--ph-glow':    'rgba(20, 184, 166, 0.22)',
      '--ph-glow-lg': 'rgba(20, 184, 166, 0.35)',
      '--ph-bg':      '#f0fdfa',
      '--ph-border':  '#ccfbf1',
      '--ph-text':    '#0c3532',
      '--ph-sub':     '#467570',
    },
  },
  {
    id: 'rose',
    nameEn: 'Crimson',
    nameAr: 'قرمزي',
    preview: '#881337',
    vars: {
      '--ph-darkest': '#2d0613',
      '--ph-dark':    '#4c0a1f',
      '--ph-green':   '#881337',
      '--ph-mid':     '#be123c',
      '--ph-mint':    '#f43f5e',
      '--ph-lime':    '#fecdd3',
      '--ph-glow':    'rgba(244, 63, 94, 0.22)',
      '--ph-glow-lg': 'rgba(244, 63, 94, 0.35)',
      '--ph-bg':      '#fff5f7',
      '--ph-border':  '#f9d4dc',
      '--ph-text':    '#3b0a18',
      '--ph-sub':     '#7c4855',
    },
  },
  {
    id: 'amber',
    nameEn: 'Warm Amber',
    nameAr: 'كهرماني',
    preview: '#78350f',
    vars: {
      '--ph-darkest': '#271104',
      '--ph-dark':    '#451d07',
      '--ph-green':   '#78350f',
      '--ph-mid':     '#b45309',
      '--ph-mint':    '#f59e0b',
      '--ph-lime':    '#fde68a',
      '--ph-glow':    'rgba(245, 158, 11, 0.22)',
      '--ph-glow-lg': 'rgba(245, 158, 11, 0.35)',
      '--ph-bg':      '#fffaf0',
      '--ph-border':  '#f5e2c0',
      '--ph-text':    '#3b1b06',
      '--ph-sub':     '#7c593c',
    },
  },
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0');
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function mixHex(hex: string, target: [number, number, number], ratio: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mr = Math.round(r * (1 - ratio) + target[0] * ratio);
  const mg = Math.round(g * (1 - ratio) + target[1] * ratio);
  const mb = Math.round(b * (1 - ratio) + target[2] * ratio);
  return `#${[mr, mg, mb].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function buildCustomVars(hex: string): Record<string, string> {
  const [r, g, b] = hexToRgb(hex);
  return {
    '--ph-darkest': mixHex(hex, [0, 0, 0], 0.72),
    '--ph-dark':    mixHex(hex, [0, 0, 0], 0.5),
    '--ph-green':   hex,
    '--ph-mid':     mixHex(hex, [255, 255, 255], 0.18),
    '--ph-mint':    mixHex(hex, [255, 255, 255], 0.35),
    '--ph-lime':    mixHex(hex, [255, 255, 255], 0.8),
    '--ph-glow':    `rgba(${r}, ${g}, ${b}, 0.22)`,
    '--ph-glow-lg': `rgba(${r}, ${g}, ${b}, 0.35)`,
    '--ph-bg':      mixHex(hex, [255, 255, 255], 0.94),
    '--ph-border':  mixHex(hex, [255, 255, 255], 0.82),
    '--ph-text':    mixHex(hex, [0, 0, 0], 0.65),
    '--ph-sub':     mixHex(hex, [100, 116, 139], 0.5),
  };
}

const PALETTE_KEY = 'theme_palette';
const CUSTOM_KEY = 'theme_custom_color';

interface ThemeContextValue {
  paletteId: string;
  customColor: string;
  setPalette: (id: string) => void;
  setCustomColor: (hex: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [paletteId, setPaletteId] = useState<string>(
    () => localStorage.getItem(PALETTE_KEY) || 'emerald',
  );
  const [customColor, setCustomColorState] = useState<string>(
    () => localStorage.getItem(CUSTOM_KEY) || '#0d493a',
  );

  useEffect(() => {
    const vars =
      paletteId === 'custom'
        ? buildCustomVars(customColor)
        : (THEME_PALETTES.find((p) => p.id === paletteId) ?? THEME_PALETTES[0]).vars;

    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
    }
    localStorage.setItem(PALETTE_KEY, paletteId);
    localStorage.setItem(CUSTOM_KEY, customColor);
  }, [paletteId, customColor]);

  const setPalette = (id: string) => setPaletteId(id);
  const setCustomColor = (hex: string) => {
    setCustomColorState(hex);
    setPaletteId('custom');
  };

  return (
    <ThemeContext.Provider value={{ paletteId, customColor, setPalette, setCustomColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
