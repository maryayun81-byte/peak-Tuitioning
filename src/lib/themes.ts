export type Theme =
  | 'midnight-scholar'
  | 'royal-indigo'
  | 'emerald-focus'
  | 'solar-gold'
  | 'ocean-depth'
  | 'arctic-frost'
  | 'crimson-elite'
  | 'lavender-dream'
  | 'forest-intelligence'
  | 'cyber-blue'
  | 'graphite-pro'
  | 'sunrise-energy'

export interface ThemeConfig {
  id: Theme
  name: string
  font: string
  fontUrl: string
  bg: string
  card: string
  cardBorder: string
  primary: string
  primaryHover: string
  accent: string
  text: string
  textMuted: string
  sidebar: string
  input: string
  gradient: string
  isDark: boolean
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'midnight-scholar',
    name: '🌙 Midnight Scholar',
    font: 'Inter',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap',
    bg: '#0B0F1A',
    card: '#121826',
    cardBorder: '#1E2D45',
    primary: '#4F8CFF',
    primaryHover: '#3B7BF5',
    accent: '#22D3EE',
    text: '#E5E7EB',
    textMuted: '#6B7280',
    sidebar: '#0D1321',
    input: '#1A2235',
    gradient: 'linear-gradient(135deg, #0B0F1A 0%, #1a2744 100%)',
    isDark: true,
  },
  {
    id: 'royal-indigo',
    name: '👑 Royal Indigo',
    font: 'Poppins',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap',
    bg: '#0F0B1E',
    card: '#1A1533',
    cardBorder: '#2D2460',
    primary: '#7C3AED',
    primaryHover: '#6D28D9',
    accent: '#A78BFA',
    text: '#EDE9FE',
    textMuted: '#7C6DAF',
    sidebar: '#0D0920',
    input: '#231D3F',
    gradient: 'linear-gradient(135deg, #0F0B1E 0%, #2D1B69 100%)',
    isDark: true,
  },
  {
    id: 'emerald-focus',
    name: '🌿 Emerald Focus',
    font: 'Nunito',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap',
    bg: '#0A1A12',
    card: '#0F2419',
    cardBorder: '#1A3D2B',
    primary: '#10B981',
    primaryHover: '#059669',
    accent: '#34D399',
    text: '#D1FAE5',
    textMuted: '#6B9E7A',
    sidebar: '#081510',
    input: '#142B1F',
    gradient: 'linear-gradient(135deg, #0A1A12 0%, #1A3D2B 100%)',
    isDark: true,
  },
  {
    id: 'solar-gold',
    name: '☀️ Solar Gold',
    font: 'Montserrat',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap',
    bg: '#1A1200',
    card: '#261A00',
    cardBorder: '#3D2B00',
    primary: '#F59E0B',
    primaryHover: '#D97706',
    accent: '#FBBF24',
    text: '#FEF3C7',
    textMuted: '#9E8241',
    sidebar: '#150F00',
    input: '#332200',
    gradient: 'linear-gradient(135deg, #1A1200 0%, #3D2B00 100%)',
    isDark: true,
  },
  {
    id: 'ocean-depth',
    name: '🌊 Ocean Depth',
    font: 'Rubik',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800;900&display=swap',
    bg: '#020B18',
    card: '#051929',
    cardBorder: '#0A3050',
    primary: '#0EA5E9',
    primaryHover: '#0284C7',
    accent: '#38BDF8',
    text: '#E0F2FE',
    textMuted: '#4E7A99',
    sidebar: '#020D1F',
    input: '#072235',
    gradient: 'linear-gradient(135deg, #020B18 0%, #0A3050 100%)',
    isDark: true,
  },
  {
    id: 'arctic-frost',
    name: '❄️ Arctic Frost',
    font: 'Work Sans',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700;800;900&display=swap',
    bg: '#F0F4F8',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    accent: '#06B6D4',
    text: '#1E293B',
    textMuted: '#64748B',
    sidebar: '#E8EEF4',
    input: '#F8FAFC',
    gradient: 'linear-gradient(135deg, #F0F4F8 0%, #E2E8F0 100%)',
    isDark: false,
  },
  {
    id: 'crimson-elite',
    name: '🔴 Crimson Elite',
    font: 'Playfair Display',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap',
    bg: '#140004',
    card: '#1F0008',
    cardBorder: '#3D0010',
    primary: '#DC2626',
    primaryHover: '#B91C1C',
    accent: '#F87171',
    text: '#FEE2E2',
    textMuted: '#9E4040',
    sidebar: '#100003',
    input: '#2A000E',
    gradient: 'linear-gradient(135deg, #140004 0%, #3D0010 100%)',
    isDark: true,
  },
  {
    id: 'lavender-dream',
    name: '💜 Lavender Dream',
    font: 'Quicksand',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap',
    bg: '#110B1E',
    card: '#1C1530',
    cardBorder: '#2E2348',
    primary: '#A855F7',
    primaryHover: '#9333EA',
    accent: '#C084FC',
    text: '#F3E8FF',
    textMuted: '#8B6BAF',
    sidebar: '#0D0818',
    input: '#261E3D',
    gradient: 'linear-gradient(135deg, #110B1E 0%, #2E2348 100%)',
    isDark: true,
  },
  {
    id: 'forest-intelligence',
    name: '🌲 Forest Intelligence',
    font: 'Cabin',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Cabin:wght@400;500;600;700&display=swap',
    bg: '#091409',
    card: '#0F200F',
    cardBorder: '#1A3A1A',
    primary: '#16A34A',
    primaryHover: '#15803D',
    accent: '#4ADE80',
    text: '#DCFCE7',
    textMuted: '#5A8A5A',
    sidebar: '#060F06',
    input: '#142714',
    gradient: 'linear-gradient(135deg, #091409 0%, #1A3A1A 100%)',
    isDark: true,
  },
  {
    id: 'cyber-blue',
    name: '⚡ Cyber Blue',
    font: 'Space Grotesk',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
    bg: '#000814',
    card: '#00111F',
    cardBorder: '#00244D',
    primary: '#00B4D8',
    primaryHover: '#0077B6',
    accent: '#90E0EF',
    text: '#CAF0F8',
    textMuted: '#3A7A96',
    sidebar: '#00060F',
    input: '#001529',
    gradient: 'linear-gradient(135deg, #000814 0%, #00244D 100%)',
    isDark: true,
  },
  {
    id: 'graphite-pro',
    name: '🖤 Graphite Pro',
    font: 'IBM Plex Sans',
    fontUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap',
    bg: '#111111',
    card: '#1C1C1C',
    cardBorder: '#2D2D2D',
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    accent: '#818CF8',
    text: '#F3F4F6',
    textMuted: '#6B7280',
    sidebar: '#0A0A0A',
    input: '#252525',
    gradient: 'linear-gradient(135deg, #111111 0%, #2D2D2D 100%)',
    isDark: true,
  },
  {
    id: 'sunrise-energy',
    name: '🌅 Sunrise Energy',
    font: 'Nunito Sans',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;500;600;700;800;900&display=swap',
    bg: '#FFF7ED',
    card: '#FFFFFF',
    cardBorder: '#FED7AA',
    primary: '#EA580C',
    primaryHover: '#C2410C',
    accent: '#FB923C',
    text: '#1C0A00',
    textMuted: '#78350F',
    sidebar: '#FFF3E0',
    input: '#FFF7ED',
    gradient: 'linear-gradient(135deg, #FFF7ED 0%, #FED7AA 100%)',
    isDark: false,
  },
]

export function getTheme(id: Theme): ThemeConfig {
  return THEMES.find(t => t.id === id) ?? THEMES[0]
}

export const DEFAULT_THEME: Theme = 'midnight-scholar'
