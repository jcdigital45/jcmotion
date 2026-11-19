// JC Motion — 7 ambiances tirées de la bibliothèque de Jean-Claude.
// « lime » = couleur d'accent du thème actif (nom historique gardé partout dans le code).
export type ThemeName = 'neon' | 'vert' | 'violet' | 'rouge' | 'bleu' | 'clair' | 'or';

type Theme = {
  bg: string; bg2: string; surface: string; surface2: string; border: string;
  lime: string; limeDeep: string; limeGlow: string; accent2: string; onAccent: string;
  text: string; muted: string; red: string; light: boolean; glow: boolean;
  ui: string; display: string; title: string;
  stepStyle: 'list' | 'diamonds' | 'questions' | 'cards';
  pill: 'flat' | 'gloss' | 'glass' | 'neon';
  bgClip9x16?: string; bgClip16x9?: string; // fonds animés de la bibliothèque
};

const base = {
  red: '#FF4D4D',
  ui: '"Inter", sans-serif',
  display: '"Anton", "Inter", sans-serif',
  title: '"Poppins", "Inter", sans-serif',
};

export const THEMES: Record<ThemeName, Theme> = {
  neon: {
    ...base, bg: '#040406', bg2: '#0B0B12', surface: '#101016', surface2: '#181822', border: 'rgba(255,255,255,0.10)',
    lime: '#22E5FF', limeDeep: '#0FB8D0', limeGlow: 'rgba(34,229,255,0.45)', accent2: '#FFE14D', onAccent: '#04121A',
    text: '#F6F8FF', muted: '#8D93A8', light: false, glow: true, stepStyle: 'list', pill: 'neon',
    bgClip16x9: 'fond_grille_sombre', bgClip9x16: 'fond_vertical_sombre',
  },
  vert: {
    ...base, bg: '#03120A', bg2: '#062414', surface: '#0B2216', surface2: '#10301F', border: 'rgba(160,255,200,0.12)',
    lime: '#C6FF3D', limeDeep: '#7BD400', limeGlow: 'rgba(120,255,120,0.35)', accent2: '#2BFF88', onAccent: '#06140A',
    text: '#F2FFF5', muted: '#86A892', light: false, glow: false, stepStyle: 'list', pill: 'flat',
    bgClip9x16: 'fond_vertical_degrade_vert',
  },
  violet: {
    ...base, bg: '#0E0418', bg2: '#22093C', surface: 'rgba(120,60,200,0.22)', surface2: 'rgba(160,90,255,0.28)', border: 'rgba(210,170,255,0.25)',
    lime: '#C08BFF', limeDeep: '#8A3FFC', limeGlow: 'rgba(170,100,255,0.5)', accent2: '#FF5BD8', onAccent: '#14051F',
    text: '#FBF6FF', muted: '#B8A4D6', light: false, glow: true, stepStyle: 'cards', pill: 'glass',
    bgClip16x9: 'fond_grille_magenta_particules', bgClip9x16: 'fond_vertical_degrade_magenta',
  },
  rouge: {
    ...base, bg: '#090102', bg2: '#2A0507', surface: '#1E0507', surface2: '#2C080B', border: 'rgba(255,90,90,0.22)',
    lime: '#FF2E3B', limeDeep: '#C4111D', limeGlow: 'rgba(255,40,60,0.5)', accent2: '#FFC2C2', onAccent: '#FFFFFF',
    text: '#FFF5F5', muted: '#C79A9C', light: false, glow: false, stepStyle: 'questions', pill: 'gloss',
    bgClip9x16: 'fond_vertical_bordeaux',
  },
  bleu: {
    ...base, bg: '#020824', bg2: '#0A1F6E', surface: '#0B1C55', surface2: '#12287A', border: 'rgba(120,170,255,0.25)',
    lime: '#4FA3FF', limeDeep: '#1E5BFF', limeGlow: 'rgba(80,160,255,0.5)', accent2: '#7BE9FF', onAccent: '#FFFFFF',
    text: '#F3F7FF', muted: '#9DB0DA', light: false, glow: true, stepStyle: 'diamonds', pill: 'flat',
    bgClip16x9: 'fond_grille_bleue_particules', bgClip9x16: 'fond_vertical_degrade_bleu',
  },
  clair: {
    ...base, bg: '#F4F6FB', bg2: '#E3E8F5', surface: '#FFFFFF', surface2: '#F7F8FC', border: 'rgba(20,30,60,0.10)',
    lime: '#3F4BFF', limeDeep: '#2A33C9', limeGlow: 'rgba(63,75,255,0.25)', accent2: '#F2B33D', onAccent: '#FFFFFF',
    text: '#111527', muted: '#6B7390', light: true, glow: false, stepStyle: 'list', pill: 'flat',
    bgClip16x9: 'fond_vagues_pastel', bgClip9x16: 'fond_vertical_blanc_palmes',
  },
  or: {
    ...base, bg: '#0A0502', bg2: '#2A1404', surface: '#1E1207', surface2: '#2B1A0A', border: 'rgba(255,190,90,0.22)',
    lime: '#FFB21E', limeDeep: '#E07B00', limeGlow: 'rgba(255,170,40,0.45)', accent2: '#FFE7B3', onAccent: '#1A0E02',
    text: '#FFF7EA', muted: '#C4A57E', light: false, glow: true, stepStyle: 'list', pill: 'gloss',
  },
};

// Objet partagé par tous les composants ; applyTheme() le remplit avant le rendu.
export const T: Theme = { ...THEMES.vert };
export const applyTheme = (name?: string) => {
  Object.assign(T, THEMES[(name as ThemeName) in THEMES ? (name as ThemeName) : 'vert']);
};

export type Format = '9:16' | '16:9';
export const dims = (f: Format) =>
  f === '9:16' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
