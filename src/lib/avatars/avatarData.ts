/**
 * Avatar data and utilities using DiceBear Avataaars
 * Friendly, approachable, and mobile-performant
 */

export interface AvatarConfig {
  seed: string
  // Avataaars style options
  backgroundColor?: string
  backgroundType?: 'circle' | 'transparent'
  top?: string
  hatColor?: string
  hairColor?: string
  facialHairType?: string
  facialHairColor?: string
  clotheType?: string
  clotheColor?: string
  eyes?: string
  eyebrow?: string
  mouth?: string
  skin?: string
  accessories?: string
  accessoriesChance?: number
  facialHairChance?: number
}

// --- Palette data for selectors ---

export const SKIN_TONES = [
  { name: 'Pale', value: 'pale' },
  { name: 'Light', value: 'light' },
  { name: 'Yellow', value: 'yellow' },
  { name: 'Tan', value: 'tan' },
  { name: 'Brown', value: 'brown' },
  { name: 'Dark Brown', value: 'darkBrown' },
  { name: 'Black', value: 'black' },
]

export const HAIR_COLORS = [
  { name: 'Auburn', value: 'auburn', hex: '#A55728' },
  { name: 'Black', value: 'black', hex: '#1A1A1A' },
  { name: 'Blonde', value: 'blonde', hex: '#E8CA6E' },
  { name: 'Golden', value: 'blondeGolden', hex: '#F5C742' },
  { name: 'Brown', value: 'brown', hex: '#6A3800' },
  { name: 'Dark Brown', value: 'brownDark', hex: '#3C1A00' },
  { name: 'Platinum', value: 'platinum', hex: '#E5E5E5' },
  { name: 'Red', value: 'red', hex: '#C62A2A' },
  { name: 'Gray', value: 'silverGray', hex: '#9FA1A4' },
]

export const TOPS = [
  { name: 'Short Hair', value: 'shortHairShortFlat', emoji: '👦' },
  { name: 'Short Waved', value: 'shortHairShortWaved', emoji: '💆' },
  { name: 'Short Dreads', value: 'shortHairDreads01', emoji: '🧔' },
  { name: 'Short Sides', value: 'shortHairSides', emoji: '🙂' },
  { name: 'Long Bun', value: 'longHairBun', emoji: '👩' },
  { name: 'Long Curly', value: 'longHairCurly', emoji: '💁' },
  { name: 'Long Dreads', value: 'longHairDreads', emoji: '🌀' },
  { name: 'Long Straight', value: 'longHairStraight', emoji: '💇' },
  { name: 'Hijab', value: 'hijab', emoji: '🧕' },
  { name: 'Hat', value: 'hat', emoji: '🎩' },
  { name: 'Turban', value: 'turban', emoji: '🌍' },
  { name: 'Winter Hat', value: 'winterHat02', emoji: '🎿' },
  { name: 'Eyepatch', value: 'eyepatch', emoji: '☠️' },
]

export const OUTFITS = [
  { name: 'Hoodie', value: 'hoodie', emoji: '🧥' },
  { name: 'Shirt Crew', value: 'shirtCrewNeck', emoji: '👕' },
  { name: 'Shirt V-Neck', value: 'shirtVNeck', emoji: '🎽' },
  { name: 'Blazer', value: 'blazerAndShirt', emoji: '🧣' },
  { name: 'Blazer & Sweater', value: 'blazerAndSweater', emoji: '👔' },
  { name: 'Overall', value: 'graphicShirt', emoji: '🎨' },
  { name: 'Collarshirt', value: 'shirtScoopNeck', emoji: '🌿' },
]

export const CLOTHING_COLORS = [
  { name: 'Heather', value: 'heather', hex: '#B9C0CB' },
  { name: 'Slate', value: 'gray01', hex: '#6C6C6C' },
  { name: 'Navy', value: 'blue01', hex: '#1E3A5F' },
  { name: 'Sky', value: 'blue02', hex: '#5CBFE5' },
  { name: 'Pastel Blue', value: 'blue03', hex: '#AED6F1' },
  { name: 'Blush', value: 'pastelRed', hex: '#F28B82' },
  { name: 'Coral', value: 'red', hex: '#E55039' },
  { name: 'Pink', value: 'pastelYellow', hex: '#FEC8D8' },
  { name: 'Lavender', value: 'pastelBlue', hex: '#D7BDE2' },
  { name: 'Mint', value: 'pastelGreen', hex: '#A9DFBF' },
  { name: 'Emerald', value: 'gray02', hex: '#1E8449' },
  { name: 'Sunset', value: 'pastelOrange', hex: '#F8C471' },
  { name: 'Parchment', value: 'white', hex: '#F9F9F9' },
  { name: 'Black', value: 'black', hex: '#1A1A1A' },
  { name: 'Warm', value: 'pink', hex: '#EE82EE' },
]

export const EYES_OPTIONS = [
  { name: 'Default', value: 'default', emoji: '👁️' },
  { name: 'Happy', value: 'happy', emoji: '😊' },
  { name: 'Wink', value: 'wink', emoji: '😉' },
  { name: 'Closed', value: 'closed', emoji: '😌' },
  { name: 'Hearts', value: 'hearts', emoji: '😍' },
  { name: 'Stars', value: 'stars', emoji: '🤩' },
  { name: 'Squint', value: 'squint', emoji: '😏' },
  { name: 'Surprised', value: 'surprised', emoji: '😮' },
]

export const MOUTHS = [
  { name: 'Smile', value: 'smile', emoji: '😄' },
  { name: 'Big Smile', value: 'twinkle', emoji: '😁' },
  { name: 'Tongue', value: 'tongue', emoji: '😛' },
  { name: 'Serious', value: 'serious', emoji: '😐' },
  { name: 'Eating', value: 'eating', emoji: '😋' },
  { name: 'Disbelief', value: 'disbelief', emoji: '😦' },
  { name: 'Scream Open', value: 'screamOpen', emoji: '😱' },
  { name: 'Grimace', value: 'grimace', emoji: '😬' },
  { name: 'Vomit', value: 'vomit', emoji: '🤢' },
]

export const ACCESSORIES = [
  { name: 'None', value: 'blank', chance: 0 },
  { name: 'Glasses', value: 'prescription01', chance: 100 },
  { name: 'Round Glasses', value: 'prescription02', chance: 100 },
  { name: 'Kurt', value: 'kurt', chance: 100 },
  { name: 'Sunglasses', value: 'sunglasses', chance: 100 },
  { name: 'Wayfarers', value: 'wayfarers', chance: 100 },
]

export const BACKGROUND_COLORS = [
  { name: 'Sky', hex: 'b6e3f4' },
  { name: 'Blush', hex: 'ffd5dc' },
  { name: 'Mint', hex: 'c0aede' },
  { name: 'Peach', hex: 'ffdfba' },
  { name: 'Lilac', hex: 'd1d4f9' },
  { name: 'Lemon', hex: 'fffacd' },
  { name: 'Sage', hex: 'c8e6c9' },
  { name: 'Lavender', hex: 'e8d5f5' },
  { name: 'Butter', hex: 'fff3b0' },
  { name: 'Rose', hex: 'fce4ec' },
  { name: 'Teal', hex: 'b2dfdb' },
  { name: 'Cloud', hex: 'f0f4f8' },
]

export const getDefaultConfig = (): AvatarConfig => ({
  seed: Math.random().toString(36).slice(2, 10),
  backgroundColor: 'b6e3f4',
  backgroundType: 'circle',
  top: 'shortHairShortFlat',
  hairColor: 'brown',
  skin: 'light',
  clotheType: 'hoodie',
  clotheColor: 'heather',
  eyes: 'default',
  eyebrow: 'default',
  mouth: 'smile',
  accessories: 'blank',
  accessoriesChance: 0,
  facialHairType: 'blank',
  facialHairChance: 0,
})

export const getRandomConfig = (): AvatarConfig => {
  const pick = <T>(arr: { value: string }[]): string =>
    arr[Math.floor(Math.random() * arr.length)].value
  
  const bgColor = BACKGROUND_COLORS[Math.floor(Math.random() * BACKGROUND_COLORS.length)]
  const acc = ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)]

  return {
    seed: Math.random().toString(36).slice(2, 10),
    backgroundColor: bgColor.hex,
    backgroundType: 'circle',
    top: pick(TOPS),
    hairColor: pick(HAIR_COLORS),
    skin: pick(SKIN_TONES),
    clotheType: pick(OUTFITS),
    clotheColor: pick(CLOTHING_COLORS),
    eyes: pick(EYES_OPTIONS),
    eyebrow: 'default',
    mouth: pick(MOUTHS),
    accessories: acc.value,
    accessoriesChance: acc.chance,
    facialHairType: 'blank',
    facialHairChance: 0,
  }
}

/** 
 * Build the DiceBear Avataaars URL from a config. 
 * Uses the free HTTP API — zero extra bundle size. 
 */
export const buildAvatarUrl = (config: AvatarConfig): string => {
  const params = new URLSearchParams()
  params.set('seed', config.seed)
  if (config.backgroundColor) params.set('backgroundColor', config.backgroundColor)
  if (config.backgroundType) params.set('backgroundType', config.backgroundType)
  if (config.top) params.set('top', config.top)
  if (config.hairColor) params.set('hairColor', config.hairColor)
  if (config.skin) params.set('skinColor', config.skin)
  if (config.clotheType) params.set('clotheType', config.clotheType)
  if (config.clotheColor) params.set('clotheColor', config.clotheColor)
  if (config.eyes) params.set('eyes', config.eyes)
  if (config.eyebrow) params.set('eyebrow', config.eyebrow)
  if (config.mouth) params.set('mouth', config.mouth)
  if (config.accessories && config.accessories !== 'blank') params.set('accessories', config.accessories)
  if (config.accessoriesChance !== undefined) params.set('accessoriesChance', String(config.accessoriesChance))
  if (config.facialHairType && config.facialHairType !== 'blank') params.set('facialHairType', config.facialHairType)
  if (config.facialHairChance !== undefined) params.set('facialHairChance', String(config.facialHairChance))
  
  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`
}
