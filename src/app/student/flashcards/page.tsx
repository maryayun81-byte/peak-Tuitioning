'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  Download,
  BadgeCheck,
  Compass,
  Palette,
  Type,
  Wallpaper,
  Image as ImageIcon,
  Layers,
  Mic,
  Paintbrush,
  Play,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import {
  createBeautifulFlashcardDeck,
  createCard,
  getCreatorHubMeta,
  getDeckWithCards,
  getStudentDecks,
  incrementDeckShareMetric,
  submitCardReview,
  updateDeckDesign,
  updateDeckPublishingStatus,
} from '@/app/actions/flashcards'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

const THEME_STYLES = [
  { id: 'cbc-magic', category: 'CBC', wizard: 'Colorful', name: 'Magic Sparkle', emoji: '✨', frontClass: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border-4 border-yellow-300 rounded-[2rem] shadow-lg shadow-purple-500/40 font-sans', backClass: 'bg-white text-purple-900 border-4 border-purple-500 rounded-[2rem] font-sans' },
  { id: 'cbc-jungle', category: 'CBC', wizard: 'Nature', name: 'Jungle Explorer', emoji: '🌿', frontClass: 'bg-emerald-600 text-white border-8 border-amber-800 rounded-3xl shadow-[inset_0_0_20px_rgba(0,0,0,0.35)] font-sans', backClass: 'bg-amber-100 text-emerald-900 border-4 border-emerald-600 rounded-3xl font-sans' },
  { id: 'cbc-cute', category: 'CBC', wizard: 'Cute', name: 'Kawaii Notes', emoji: '🌸', frontClass: 'bg-pink-100 text-rose-600 border-8 border-pink-300 rounded-[2rem] shadow-[0_0_20px_rgba(244,114,182,0.35)] font-serif', backClass: 'bg-white text-rose-600 border-4 border-pink-300 rounded-3xl font-serif' },
  { id: 'cbc-space', category: 'CBC', wizard: 'Space', name: 'Astro Learner', emoji: '🚀', frontClass: 'bg-slate-950 text-cyan-200 border border-cyan-300 rounded-[2rem] shadow-[0_0_24px_rgba(34,211,238,0.35)] font-sans', backClass: 'bg-indigo-50 text-indigo-950 border-4 border-indigo-400 rounded-[2rem] font-sans' },
  { id: 'cbc-sports', category: 'CBC', wizard: 'Sports', name: 'Champion Mode', emoji: '⚽', frontClass: 'bg-lime-400 text-slate-950 border-8 border-white rounded-3xl shadow-xl font-black', backClass: 'bg-white text-slate-950 border-4 border-lime-500 rounded-3xl font-sans' },
  { id: 'cbc-gaming', category: 'CBC', wizard: 'Gaming', name: 'Quest Cards', emoji: '🎮', frontClass: 'bg-violet-700 text-white border-4 border-fuchsia-300 rounded-xl shadow-[8px_8px_0_0_rgba(0,0,0,1)] font-black', backClass: 'bg-yellow-300 text-black border-4 border-black rounded-xl shadow-[8px_8px_0_0_rgba(0,0,0,1)] font-black' },
  { id: '844-minimal', category: 'Advanced', wizard: 'Academic', name: 'Minimal White', emoji: '📚', frontClass: 'bg-white text-slate-800 border-t-8 border-t-slate-800 rounded-xl shadow-xl font-sans', backClass: 'bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-sans' },
  { id: '844-neon', category: 'Advanced', wizard: 'Gaming', name: 'Cyber Neon', emoji: '💎', frontClass: 'bg-slate-900 text-cyan-400 border border-cyan-500/50 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] font-mono', backClass: 'bg-slate-900 text-fuchsia-400 border border-fuchsia-500/50 rounded-lg shadow-[0_0_15px_rgba(217,70,239,0.5)] font-mono' },
  { id: 'math-blueprint', category: 'Math', wizard: 'Academic', name: 'Math Blueprint', emoji: '📐', frontClass: 'bg-[linear-gradient(rgba(255,255,255,.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.14)_1px,transparent_1px),linear-gradient(135deg,#0f172a,#1d4ed8)] bg-[length:22px_22px,22px_22px,100%_100%] text-white border border-blue-300/60 rounded-[1.75rem] shadow-xl font-mono', backClass: 'bg-blue-50 text-blue-950 border-4 border-blue-500 rounded-[1.75rem] font-mono' },
  { id: 'science-glass', category: 'Science', wizard: 'Academic', name: 'Science Glass', emoji: '🧪', frontClass: 'bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white border border-white/40 rounded-[2rem] shadow-xl shadow-cyan-500/30 font-sans', backClass: 'bg-emerald-50 text-emerald-950 border-4 border-emerald-400 rounded-[2rem] font-sans' },
  { id: 'sunrise-revision', category: 'CBC', wizard: 'Colorful', name: 'Sunrise Revision', emoji: '🌅', frontClass: 'bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 text-slate-950 border-4 border-white rounded-[2rem] shadow-xl font-black', backClass: 'bg-amber-50 text-orange-950 border-4 border-orange-300 rounded-[2rem] font-sans' },
  { id: 'midnight-focus', category: 'Advanced', wizard: 'Academic', name: 'Midnight Focus', emoji: '🌙', frontClass: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-black text-indigo-100 border border-indigo-300/40 rounded-[1.5rem] shadow-xl shadow-indigo-500/30 font-sans', backClass: 'bg-slate-950 text-indigo-100 border border-indigo-400 rounded-[1.5rem] font-sans' },
  { id: 'comic-pop', category: 'CBC', wizard: 'Gaming', name: 'Comic Pop', emoji: '💥', frontClass: 'bg-yellow-300 text-black border-4 border-black rounded-[1.25rem] shadow-[8px_8px_0_0_#111827] font-black', backClass: 'bg-white text-black border-4 border-black rounded-[1.25rem] shadow-[8px_8px_0_0_#111827] font-black' },
  { id: 'soft-lilac', category: 'CBC', wizard: 'Cute', name: 'Soft Lilac', emoji: '💜', frontClass: 'bg-gradient-to-br from-violet-100 via-fuchsia-100 to-pink-100 text-violet-950 border-4 border-violet-300 rounded-[2rem] shadow-xl font-serif', backClass: 'bg-white text-violet-950 border-4 border-violet-300 rounded-[2rem] font-serif' },
  { id: 'kenya-pride', category: 'CBC', wizard: 'Colorful', name: 'Kenya Pride', emoji: '🇰🇪', frontClass: 'bg-gradient-to-br from-emerald-700 via-black to-red-700 text-white border-4 border-white rounded-[2rem] shadow-xl font-black', backClass: 'bg-white text-slate-950 border-4 border-emerald-700 rounded-[2rem] font-sans' },
  { id: 'exam-gold', category: 'Advanced', wizard: 'Academic', name: 'Exam Gold', emoji: '🏆', frontClass: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 text-slate-950 border-4 border-yellow-100 rounded-[1.75rem] shadow-xl shadow-amber-500/30 font-black', backClass: 'bg-yellow-50 text-amber-950 border-4 border-amber-400 rounded-[1.75rem] font-sans' },
]

const STICKER_PACKS = [
  { name: 'Animals', emoji: '🐼', stickers: ['🐼', '🦁', '🦉', '🦊', '🦋', '🐝', '🐢', '🦒'] },
  { name: 'Space', emoji: '🚀', stickers: ['🚀', '🪐', '⭐', '🌙', '☄️', '🛰️', '🌌', '👨‍🚀'] },
  { name: 'Sports', emoji: '⚽', stickers: ['⚽', '🏅', '🔥', '🏆', '🥇', '🏃', '🎯', '💪'] },
  { name: 'Nature', emoji: '🦋', stickers: ['🌱', '🦋', '☀️', '🌿', '🌸', '🌊', '🌍', '🍃'] },
  { name: 'Art', emoji: '🎨', stickers: ['🎨', '🖍️', '🌈', '✏️', '🖌️', '🧩', '✨', '💡'] },
  { name: 'School', emoji: '📚', stickers: ['📚', '✏️', '🧠', '📐', '🧪', '🔬', '📝', '⏱️'] },
  { name: 'Achievement', emoji: '⭐', stickers: ['⭐', '🏆', '💎', '🎖️', '✅', '📈', '👑', '🔥'] },
  { name: 'Cute', emoji: '❤️', stickers: ['🌸', '💖', '✨', '☁️', '🌷', '🍭', '😊', '🎀'] },
]

const BACKGROUND_STYLES = [
  { id: 'clean', name: 'Clean White', className: 'bg-white' },
  { id: 'notebook', name: 'Notebook', className: 'bg-[linear-gradient(#eef2ff_1px,transparent_1px)] bg-[length:100%_28px] bg-white' },
  { id: 'graph', name: 'Graph Paper', className: 'bg-[linear-gradient(rgba(59,130,246,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,.16)_1px,transparent_1px)] bg-[length:18px_18px] bg-white' },
  { id: 'chalk', name: 'Chalkboard', className: 'bg-slate-900' },
  { id: 'sunset', name: 'Sunset', className: 'bg-gradient-to-br from-orange-300 via-pink-300 to-purple-400' },
  { id: 'science', name: 'Science Lab', className: 'bg-gradient-to-br from-cyan-50 to-emerald-100' },
  { id: 'royal', name: 'Royal Navy', className: 'bg-gradient-to-br from-slate-950 to-indigo-900' },
  { id: 'pastel', name: 'Pastel', className: 'bg-gradient-to-br from-pink-100 via-violet-100 to-cyan-100' },
]

const COVER_IMAGE_PRESETS = [
  { id: 'none', name: 'No image', className: 'bg-gradient-to-br from-slate-950 to-indigo-900' },
  { id: 'chemistry', name: 'Chemistry Lab', className: 'bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,.55),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,.55),transparent_30%),linear-gradient(135deg,#020617,#0f172a)]' },
  { id: 'biology', name: 'Biology Nature', className: 'bg-[radial-gradient(circle_at_25%_20%,rgba(34,197,94,.55),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(132,204,22,.45),transparent_30%),linear-gradient(135deg,#052e16,#064e3b)]' },
  { id: 'math', name: 'Math Grid', className: 'bg-[linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(135deg,#111827,#312e81)] bg-[length:22px_22px,22px_22px,100%_100%]' },
  { id: 'physics', name: 'Physics Light', className: 'bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,.55),transparent_20%),radial-gradient(circle_at_20%_80%,rgba(59,130,246,.5),transparent_30%),linear-gradient(135deg,#020617,#1e1b4b)]' },
  { id: 'study', name: 'Study Desk', className: 'bg-gradient-to-br from-amber-900 via-orange-800 to-slate-950' },
  { id: 'galaxy', name: 'Galaxy', className: 'bg-[radial-gradient(circle_at_30%_30%,rgba(236,72,153,.55),transparent_25%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,.5),transparent_28%),linear-gradient(135deg,#020617,#581c87)]' },
  { id: 'pastel', name: 'Pastel Glow', className: 'bg-gradient-to-br from-pink-300 via-violet-300 to-cyan-300' },
  { id: 'chalk', name: 'Chalk Study', className: 'bg-[linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(135deg,#111827,#020617)] bg-[length:28px_28px,28px_28px,100%_100%]' },
]

const COVER_EMOJIS = ['📚', '🧪', '🔬', '🧬', '⚡', '📐', '🧠', '🚀', '⭐', '🏆', '🌿', '🎯', '💎', '🔥', '✏️', '📝']

const FONT_STYLES = [
  { id: 'sans', name: 'Modern Sans', className: 'font-sans' },
  { id: 'serif', name: 'Elegant Serif', className: 'font-serif' },
  { id: 'mono', name: 'Formula Mono', className: 'font-mono' },
  { id: 'black', name: 'Bold Poster', className: 'font-black tracking-tight' },
]

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  n: 'ⁿ',
}

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
}

const FORMULA_SYMBOLS = ['²', '³', '√', 'π', 'θ', '∆', '≤', '≥', '≠', '≈', '→', '÷', '×', '±', '∑', '∫', 'Ω', 'λ', 'H₂O', 'CO₂']

const MASCOTS = [
  { id: 'professor-peak', name: 'Professor Peak', emoji: '🦉', line: 'Tiny steps, giant brain.' },
  { id: 'panda-genius', name: 'Panda Genius', emoji: '🐼', line: 'Make it cute. Make it stick.' },
  { id: 'astro-learner', name: 'Astro Learner', emoji: '🚀', line: 'Blast through one card at a time.' },
  { id: 'clever-fox', name: 'Clever Fox', emoji: '🦊', line: 'Smart choices win the quiz.' },
]

const SUBJECT_TOPIC_BANK: Record<string, string[]> = {
  mathematics: ['Trigonometry', 'Calculus', 'Vectors', 'Probability', 'Geometry', 'Linear Programming'],
  chemistry: ['Organic Chemistry', 'Electrochemistry', 'Mole Concept', 'Reaction Rates', 'Acids and Bases', 'Qualitative Analysis'],
  biology: ['Genetics', 'Reproduction', 'Ecology', 'Photosynthesis', 'Classification', 'Human Transport'],
  physics: ['Electricity', 'Waves', 'Optics', 'Forces', 'Pressure', 'Radioactivity'],
  english: ['Grammar', 'Set Book Quotes', 'Poetry', 'Oral Skills', 'Comprehension', 'Writing Skills'],
  kiswahili: ['Sarufi', 'Fasihi', 'Insha', 'Ufahamu', 'Methali', 'Matumizi ya Lugha'],
  geography: ['Map Work', 'Climate', 'Landforms', 'Agriculture', 'Population', 'Field Work'],
  history: ['Government', 'Nationalism', 'Trade', 'Citizenship', 'World Wars', 'Constitution'],
  business: ['Accounting', 'Demand and Supply', 'Entrepreneurship', 'Insurance', 'Warehousing', 'Office Practice'],
  agriculture: ['Crop Production', 'Livestock', 'Soil Fertility', 'Farm Tools', 'Agribusiness', 'Pests and Diseases'],
}

function getSubjectTopics(subjectName: string, curriculumName: string) {
  const lower = subjectName.toLowerCase()
  const match = Object.entries(SUBJECT_TOPIC_BANK).find(([key]) => lower.includes(key))
  if (match) return match[1]
  const curriculum = curriculumName.toLowerCase()
  if (curriculum.includes('8-4') || curriculum.includes('kcse')) {
    return ['Definitions', 'Formulas', 'Common Exam Mistakes', 'Worked Examples', 'Diagrams', 'Past Paper Traps']
  }
  return ['Strand Vocabulary', 'Match Cards', 'Picture Cards', 'Draw the Answer', 'Listen and Answer', 'Story Activity']
}

function scriptFromMap(value: string, map: Record<string, string>) {
  return value.split('').map((char) => map[char] || char).join('')
}

function formatFormula(value: string) {
  return value
    .replace(/\bsqrt\(([^)]+)\)/gi, '√($1)')
    .replace(/\bDelta\b/gi, '∆')
    .replace(/\btheta\b/gi, 'θ')
    .replace(/\bpi\b/gi, 'π')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/->/g, '→')
    .replace(/\*/g, '×')
    .replace(/\^([0-9n()+\-=]+)/g, (_, power) => scriptFromMap(power, SUPERSCRIPT_MAP))
    .replace(/_([0-9()+\-=]+)/g, (_, subscript) => scriptFromMap(subscript, SUBSCRIPT_MAP))
    .replace(/\bH2O\b/g, 'H₂O')
    .replace(/\bCO2\b/g, 'CO₂')
    .replace(/\bO2\b/g, 'O₂')
    .replace(/\bN2\b/g, 'N₂')
}

export default function FlashcardStudio() {
  const { student, profile } = useAuthStore()
  const [decks, setDecks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDeck, setActiveDeck] = useState<any>(null)
  const [studyMode, setStudyMode] = useState(false)
  const [studyCards, setStudyCards] = useState<any[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [search, setSearch] = useState('')
  const [creatorMeta, setCreatorMeta] = useState<{ curriculumName: string; className: string; subjects: any[]; hasRegisteredSubjects?: boolean }>({
    curriculumName: '',
    className: '',
    subjects: [],
    hasRegisteredSubjects: false,
  })

  const [isCreatingDeck, setIsCreatingDeck] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [quickSubject, setQuickSubject] = useState('')
  const [quickTopic, setQuickTopic] = useState('')
  const [quickQuestion, setQuickQuestion] = useState('')
  const [quickAnswer, setQuickAnswer] = useState('')
  const [quickAttachmentTarget, setQuickAttachmentTarget] = useState<'question' | 'answer'>('question')
  const [quickImageUrl, setQuickImageUrl] = useState('')
  const [quickAnswerImageUrl, setQuickAnswerImageUrl] = useState('')
  const [quickDrawingUrl, setQuickDrawingUrl] = useState('')
  const [quickAnswerDrawingUrl, setQuickAnswerDrawingUrl] = useState('')
  const [quickFormulaDraft, setQuickFormulaDraft] = useState('')
  const [themePrompt, setThemePrompt] = useState('Colorful')
  const [stickerPack, setStickerPack] = useState('School')
  const [mascotId, setMascotId] = useState('professor-peak')
  const [coverEmoji, setCoverEmoji] = useState('📚')
  const [coverBackground, setCoverBackground] = useState('royal')
  const [coverPresetId, setCoverPresetId] = useState('none')
  const [coverFont, setCoverFont] = useState('black')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [newCardFront, setNewCardFront] = useState('')
  const [newCardBack, setNewCardBack] = useState('')
  const [newCardType, setNewCardType] = useState<'qa' | 'match' | 'draw' | 'voice'>('qa')
  const [cardBackground, setCardBackground] = useState('clean')
  const [cardFont, setCardFont] = useState('sans')
  const [cardImageUrl, setCardImageUrl] = useState('')
  const [drawingUrl, setDrawingUrl] = useState('')
  const [formulaDraft, setFormulaDraft] = useState('')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const quickCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const isQuickDrawingRef = useRef(false)

  const selectedTheme = useMemo(
    () => THEME_STYLES.find((style) => style.wizard === themePrompt) || THEME_STYLES[0],
    [themePrompt]
  )
  const selectedPack = STICKER_PACKS.find((pack) => pack.name === stickerPack) || STICKER_PACKS[5]
  const selectedMascot = MASCOTS.find((mascot) => mascot.id === mascotId) || MASCOTS[0]
  const selectedBackground = BACKGROUND_STYLES.find((background) => background.id === cardBackground) || BACKGROUND_STYLES[0]
  const selectedFont = FONT_STYLES.find((font) => font.id === cardFont) || FONT_STYLES[0]
  const selectedCoverBackground = BACKGROUND_STYLES.find((background) => background.id === coverBackground) || BACKGROUND_STYLES[6]
  const selectedCoverFont = FONT_STYLES.find((font) => font.id === coverFont) || FONT_STYLES[3]
  const selectedCoverPreset = COVER_IMAGE_PRESETS.find((preset) => preset.id === coverPresetId) || COVER_IMAGE_PRESETS[0]
  const selectedCoverSurface = coverImageUrl
    ? selectedCoverBackground.className
    : selectedCoverPreset.id === 'none'
      ? selectedCoverBackground.className
      : selectedCoverPreset.className
  const selectedCoverSurfaceName = coverImageUrl
    ? 'Custom image'
    : selectedCoverPreset.id === 'none'
      ? selectedCoverBackground.name
      : selectedCoverPreset.name
  const formattedFormula = formatFormula(formulaDraft)
  const formattedQuickFormula = formatFormula(quickFormulaDraft)
  const coverAccentStickers = selectedPack.stickers.slice(0, 3)
  const hasQuickQuestionContent = Boolean(quickQuestion || quickDrawingUrl || quickImageUrl || formattedQuickFormula)
  const hasQuickAnswerContent = Boolean(quickAnswer || quickAnswerDrawingUrl || quickAnswerImageUrl)

  useEffect(() => {
    if (student?.id) {
      loadDecks()
      loadCreatorMeta()
    }
  }, [student?.id])

  const loadDecks = async () => {
    if (!student?.id) return
    try {
      const data = await getStudentDecks(student.id, (student as any).class_id)
      setDecks(data || [])
    } catch {
      toast.error('Failed to load decks')
    } finally {
      setLoading(false)
    }
  }

  const loadCreatorMeta = async () => {
    if (!student?.id) return
    const meta = await getCreatorHubMeta(student.id)
    const firstSubject = meta.subjects[0]
    const curriculumName = meta.curriculumName
    const isExamTrack = curriculumName.toLowerCase().includes('8-4') || curriculumName.toLowerCase().includes('kcse')
    if (isExamTrack) {
      setThemePrompt('Academic')
    }

    setCreatorMeta(meta)
    if (!selectedSubjectId && firstSubject) {
      setSelectedSubjectId(firstSubject.id)
      setQuickSubject(firstSubject.name)
      setQuickTopic(getSubjectTopics(firstSubject.name, curriculumName)[0])
    }
  }

  const openDeck = async (deckId: string) => {
    setLoading(true)
    try {
      const deck = await getDeckWithCards(deckId, student!.id)
      setActiveDeck(deck)
      const cover = deck.cover_config || {}
      if (cover.emoji) setCoverEmoji(cover.emoji)
      if (cover.background) setCoverBackground(cover.background)
      if (cover.presetId) setCoverPresetId(cover.presetId)
      if (cover.font) setCoverFont(cover.font)
      if (cover.imageUrl) setCoverImageUrl(cover.imageUrl)
      if (deck.sticker_pack) setStickerPack(deck.sticker_pack)
    } catch {
      toast.error('Failed to load cards')
    } finally {
      setLoading(false)
    }
  }

  const handleMakeBeautiful = async () => {
    if (!student?.id || !selectedSubjectId || !quickSubject || !quickTopic || !hasQuickQuestionContent || !hasQuickAnswerContent) {
      toast.error('Choose a subject, then add a question and answer. Either side can be typed, drawn, or image-based.')
      return
    }

    try {
      const deck = await createBeautifulFlashcardDeck(student.id, {
        expectedUserId: profile?.id,
        classId: (student as any).class_id,
        subject: quickSubject,
        subjectId: selectedSubjectId || undefined,
        topic: quickTopic,
        question: quickQuestion || formattedQuickFormula || 'See the drawing or image question',
        answer: quickAnswer || 'See the drawn or image answer',
        themeStyle: selectedTheme.id,
        themePrompt,
        stickerPack,
        mascotId,
        coverConfig: {
          emoji: coverEmoji,
          background: coverBackground,
          presetId: coverPresetId,
          presetClass: selectedCoverSurface,
          font: coverFont,
          imageUrl: coverImageUrl || null,
          stickerPack,
          themeStyle: selectedTheme.id,
        },
        cardType: quickDrawingUrl || quickAnswerDrawingUrl ? 'draw' : 'qa',
        cardImageUrl: quickImageUrl || undefined,
        answerImageUrl: quickAnswerImageUrl || undefined,
        drawingUrl: quickDrawingUrl || undefined,
        answerDrawingUrl: quickAnswerDrawingUrl || undefined,
        formula: formattedQuickFormula || undefined,
      })
      setQuickQuestion('')
      setQuickAnswer('')
      setQuickImageUrl('')
      setQuickAnswerImageUrl('')
      setQuickDrawingUrl('')
      setQuickAnswerDrawingUrl('')
      setQuickFormulaDraft('')
      setIsCreatingDeck(false)
      await loadDecks()
      toast.success(`${selectedMascot.name}: beautiful deck created!`, { icon: selectedMascot.emoji })
      openDeck(deck.id)
    } catch (error: any) {
      console.error('[CreatorHub] create deck failed:', error)
      toast.error(error?.message || 'Could not create the deck yet.')
    }
  }

  const handleCreateCard = async () => {
    if (!newCardFront || !newCardBack || !activeDeck) return
    try {
      await createCard(activeDeck.id, newCardFront, newCardBack, {
        expectedUserId: profile?.id,
        cardType: newCardType,
        stickers: selectedPack.stickers,
        visualConfig: {
          stickerPack,
          themeStyle: activeDeck.theme_color,
          background: cardBackground,
          font: cardFont,
          imageUrl: cardImageUrl || null,
          drawingUrl: drawingUrl || null,
          layout: 'student-created',
        },
        drawingUrl: drawingUrl || undefined,
      })
      setNewCardFront('')
      setNewCardBack('')
      setCardImageUrl('')
      setDrawingUrl('')
      setFormulaDraft('')
      setNewCardType('qa')
      openDeck(activeDeck.id)
      toast.success('Card added with stickers!', { icon: selectedPack.emoji })
    } catch {
      toast.error('Failed to add card')
    }
  }

  const getCanvasPoint = (event: any) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const point = event.touches?.[0] || event
    return {
      x: ((point.clientX - rect.left) / rect.width) * canvas.width,
      y: ((point.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const beginDrawing = (event: any) => {
    if (newCardType !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const point = getCanvasPoint(event)
    isDrawingRef.current = true
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 5
    context.strokeStyle = '#111827'
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  const moveDrawing = (event: any) => {
    if (!isDrawingRef.current || newCardType !== 'draw') return
    event.preventDefault?.()
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const point = getCanvasPoint(event)
    context.lineTo(point.x, point.y)
    context.stroke()
    setDrawingUrl(canvas.toDataURL('image/jpeg', 0.82))
  }

  const endDrawing = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const canvas = canvasRef.current
    if (canvas) setDrawingUrl(canvas.toDataURL('image/jpeg', 0.82))
  }

  const clearDrawing = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    setDrawingUrl('')
  }

  const getQuickCanvasPoint = (event: any) => {
    const canvas = quickCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const point = event.touches?.[0] || event
    return {
      x: ((point.clientX - rect.left) / rect.width) * canvas.width,
      y: ((point.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const beginQuickDrawing = (event: any) => {
    const canvas = quickCanvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const point = getQuickCanvasPoint(event)
    isQuickDrawingRef.current = true
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 5
    context.strokeStyle = '#111827'
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  const moveQuickDrawing = (event: any) => {
    if (!isQuickDrawingRef.current) return
    event.preventDefault?.()
    const canvas = quickCanvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const point = getQuickCanvasPoint(event)
    context.lineTo(point.x, point.y)
    context.stroke()
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
    if (quickAttachmentTarget === 'answer') {
      setQuickAnswerDrawingUrl(dataUrl)
    } else {
      setQuickDrawingUrl(dataUrl)
    }
  }

  const endQuickDrawing = () => {
    if (!isQuickDrawingRef.current) return
    isQuickDrawingRef.current = false
    const canvas = quickCanvasRef.current
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
      if (quickAttachmentTarget === 'answer') {
        setQuickAnswerDrawingUrl(dataUrl)
      } else {
        setQuickDrawingUrl(dataUrl)
      }
    }
  }

  const clearQuickDrawing = () => {
    const canvas = quickCanvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    if (quickAttachmentTarget === 'answer') {
      setQuickAnswerDrawingUrl('')
    } else {
      setQuickDrawingUrl('')
    }
  }

  const imageFileToDataUrl = (file: File, callback: (url: string) => void) => {
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const maxSide = 900
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        if (!context) {
          callback(String(reader.result || ''))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        callback(canvas.toDataURL('image/jpeg', 0.78))
      }
      image.onerror = () => callback(String(reader.result || ''))
      image.src = String(reader.result || '')
    }
    reader.readAsDataURL(file)
  }

  const startStudy = () => {
    const due = activeDeck.cards.filter((card: any) => {
      if (!card.progress) return true
      return new Date(card.progress.next_review_date) <= new Date()
    })

    if (due.length === 0) {
      toast.success('Everything is reviewed for today!', { icon: '⭐' })
      return
    }

    setStudyCards(due)
    setCurrentCardIndex(0)
    setIsFlipped(false)
    setStudyMode(true)
  }

  const rateCard = async (quality: number) => {
    const card = studyCards[currentCardIndex]
    try {
      await submitCardReview(student!.id, card.id, quality)

      if (currentCardIndex < studyCards.length - 1) {
        setCurrentCardIndex((prev) => prev + 1)
        setIsFlipped(false)
      } else {
        setStudyMode(false)
        openDeck(activeDeck.id)
        toast.success('Deck complete! You earned stars and gems.', { icon: '💎' })
        const supabase = getSupabaseBrowserClient()
        Promise.resolve(supabase.rpc('award_xp', { amount: 30, student_id: student?.id })).catch(console.error)
      }
    } catch {
      toast.error('Failed to save progress')
    }
  }

  const shareDeck = (deck: any) => {
    const code = deck.share_code || deck.id.slice(0, 7).toUpperCase()
    const text = `I created "${deck.title}" on Peak Performance. Import it with Deck Code: ${code}`
    incrementDeckShareMetric(deck.id, 'shares').catch(() => undefined)
    if (navigator.share) {
      navigator.share({ title: deck.title, text }).catch(() => undefined)
    } else {
      navigator.clipboard?.writeText(text)
        .then(() => toast.success('Share text copied.'))
        .catch(() => toast.success(`Share code: ${code}`))
    }
  }

  const shareToWhatsApp = (deck: any) => {
    const code = deck.share_code || deck.id.slice(0, 7).toUpperCase()
    const text = encodeURIComponent(`I created a flashcard deck on Peak Performance: ${deck.title}. Deck Code: ${code}`)
    incrementDeckShareMetric(deck.id, 'shares').catch(() => undefined)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const handleDeckStatusAction = async (action: 'submit_review' | 'publish_class' | 'publish_marketplace' | 'keep_private') => {
    if (!student?.id || !activeDeck?.id) return
    try {
      const updatedDeck = await updateDeckPublishingStatus(activeDeck.id, student.id, action)
      setActiveDeck((current: any) => ({ ...current, ...updatedDeck }))
      await loadDecks()
      const messages = {
        submit_review: 'Submitted to Teacher Review Center.',
        publish_class: 'Submitted for teacher approval before class discovery.',
        publish_marketplace: 'Submitted for teacher approval before marketplace.',
        keep_private: 'Deck is private again.',
      }
      toast.success(messages[action])
    } catch (error: any) {
      toast.error(error?.message || 'Could not update publishing status.')
    }
  }

  const handleDeckDesignUpdate = async (themeId: string, packName = stickerPack) => {
    if (!student?.id || !activeDeck?.id) return
    const theme = THEME_STYLES.find((item) => item.id === themeId) || THEME_STYLES[0]
    try {
      const updatedDeck = await updateDeckDesign(activeDeck.id, student.id, {
        themeColor: theme.id,
        themeStyle: theme.id,
        stickerPack: packName,
        mascotId,
        coverConfig: {
          themeName: theme.name,
          stickerPack: packName,
          emoji: coverEmoji,
          background: coverBackground,
          presetId: coverPresetId,
          presetClass: selectedCoverSurface,
          font: coverFont,
          imageUrl: coverImageUrl || null,
        },
      })
      setThemePrompt(theme.wizard)
      setStickerPack(packName)
      setActiveDeck((current: any) => ({ ...current, ...updatedDeck, cards: current.cards }))
      await loadDecks()
      toast.success('Deck look updated.')
    } catch {
      toast.error('Could not update deck design.')
    }
  }

  const filteredDecks = decks.filter((deck) => {
    const title = (deck.title || deck.name || '').toLowerCase()
    return title.includes(search.toLowerCase())
  })

  if (loading && !activeDeck) {
    return <div className="p-6 flex justify-center items-center h-64"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
  }

  if (studyMode && studyCards.length > 0) {
    const currentCard = studyCards[currentCardIndex]
    const activeStyle = THEME_STYLES.find((style) => style.id === activeDeck.theme_color || style.id === activeDeck.theme_style) || THEME_STYLES[0]

    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto pb-32 flex flex-col min-h-[calc(100vh-80px)]">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setStudyMode(false)}>Exit</Button>
          <div className="text-sm font-black text-muted">Card {currentCardIndex + 1} of {studyCards.length}</div>
          <div className="w-24 h-2 bg-[var(--input)] rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${((currentCardIndex + 1) / studyCards.length) * 100}%` }} />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative perspective-[1000px]">
          <motion.div
            className="w-full max-w-xl aspect-[4/3] cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Card className={`absolute inset-0 p-6 md:p-8 flex flex-col items-center justify-center text-center ${activeStyle.frontClass}`} style={{ backfaceVisibility: 'hidden' }}>
              <div className="absolute top-4 right-5 text-3xl">{activeStyle.emoji}</div>
              {currentCard.visual_config?.imageUrl && (
                <div className="mb-4 h-28 w-full max-w-sm rounded-2xl bg-cover bg-center border border-white/30" style={{ backgroundImage: `url(${currentCard.visual_config.imageUrl})` }} />
              )}
              {(currentCard.drawing_url || currentCard.visual_config?.questionDrawingUrl || currentCard.visual_config?.drawingUrl) && (
                <img src={currentCard.drawing_url || currentCard.visual_config.questionDrawingUrl || currentCard.visual_config.drawingUrl} alt="Question drawing" className="mb-4 h-32 w-full max-w-sm rounded-2xl bg-white object-contain p-2" />
              )}
              <h2 className="text-3xl md:text-4xl font-black leading-tight">{currentCard.front_content}</h2>
              <p className="absolute bottom-6 text-xs uppercase font-black opacity-60 flex items-center gap-1"><RotateCcw size={14} /> Tap to flip</p>
            </Card>
            <Card className={`absolute inset-0 p-8 flex flex-col items-center justify-center text-center ${activeStyle.backClass}`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <p className="text-xs uppercase font-black opacity-50 tracking-widest mb-4">Answer</p>
              {currentCard.visual_config?.answerImageUrl && (
                <div className="mb-4 h-28 w-full max-w-sm rounded-2xl bg-cover bg-center border border-black/10" style={{ backgroundImage: `url(${currentCard.visual_config.answerImageUrl})` }} />
              )}
              {currentCard.visual_config?.answerDrawingUrl && (
                <img src={currentCard.visual_config.answerDrawingUrl} alt="Answer drawing" className="mb-4 h-32 w-full max-w-sm rounded-2xl bg-white object-contain p-2" />
              )}
              <h2 className="text-2xl md:text-3xl font-bold">{currentCard.back_content}</h2>
            </Card>
          </motion.div>
        </div>

        <AnimatePresence>
          {isFlipped && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 grid grid-cols-3 gap-3">
              <Button onClick={() => rateCard(1)} className="bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-2xl py-6 flex flex-col gap-1"><X size={20} /><span className="text-[10px] font-black uppercase">Hard</span></Button>
              <Button onClick={() => rateCard(3)} className="bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white rounded-2xl py-6 flex flex-col gap-1"><BrainCircuit size={20} /><span className="text-[10px] font-black uppercase">Good</span></Button>
              <Button onClick={() => rateCard(5)} className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white rounded-2xl py-6 flex flex-col gap-1"><Check size={20} /><span className="text-[10px] font-black uppercase">Easy</span></Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (activeDeck) {
    const dueCount = activeDeck.cards.filter((card: any) => !card.progress || new Date(card.progress.next_review_date) <= new Date()).length
    const code = activeDeck.share_code || activeDeck.id.slice(0, 7).toUpperCase()
    const activeStyle = THEME_STYLES.find((style) => style.id === activeDeck.theme_color || style.id === activeDeck.theme_style) || THEME_STYLES[0]
    const cover = activeDeck.cover_config || {}
    const deckCoverBackground = BACKGROUND_STYLES.find((background) => background.id === cover.background) || selectedCoverBackground
    const deckCoverPreset = cover.presetClass || COVER_IMAGE_PRESETS.find((preset) => preset.id === cover.presetId)?.className || ''
    const deckCoverFont = FONT_STYLES.find((font) => font.id === cover.font) || selectedCoverFont

    return (
      <div className="p-4 md:p-6 space-y-6 pb-32">
        <Button variant="ghost" onClick={() => setActiveDeck(null)} className="-ml-4 text-muted"><ArrowRight className="mr-2 rotate-180" size={16} /> Back to Studio</Button>

        <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
          <Card className={`p-6 md:p-8 overflow-hidden relative ${cover.imageUrl || deckCoverPreset ? 'text-white' : activeStyle.frontClass} ${!cover.imageUrl ? (deckCoverPreset || deckCoverBackground.className) : ''} ${deckCoverFont.className}`}>
            {cover.imageUrl && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${cover.imageUrl})` }} />}
            {(cover.imageUrl || deckCoverPreset) && <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/25 to-black/75" />}
            <div className="absolute -right-10 -top-10 text-9xl opacity-20">{cover.emoji || activeStyle.emoji}</div>
            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-[0.25em] opacity-70">Share Code {code}</p>
              <h1 className="text-3xl md:text-5xl font-black mt-3 max-w-2xl">{activeDeck.title || activeDeck.name}</h1>
              <p className="mt-3 text-sm font-bold opacity-80">{activeDeck.topic || 'Premium flashcard deck'} • {activeDeck.cards.length} cards</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" className="rounded-2xl bg-white text-slate-950 hover:bg-white/90" onClick={startStudy}><Play size={16} className="mr-2 fill-current" /> Study Deck</Button>
                <Button variant="secondary" className="rounded-2xl bg-white/15 text-white border-white/20" onClick={() => shareToWhatsApp(activeDeck)}><Share2 size={16} className="mr-2" /> WhatsApp</Button>
                <Button variant="secondary" className="rounded-2xl bg-white/15 text-white border-white/20" onClick={() => shareDeck(activeDeck)}><QrCode size={16} className="mr-2" /> Share Code</Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {[
              ['Views', activeDeck.views || 0, ImageIcon],
              ['Saves', activeDeck.saves || 0, Star],
              ['Shares', activeDeck.shares || 0, Share2],
              ['Downloads', activeDeck.downloads || 0, Download],
            ].map(([label, value, Icon]: any) => (
              <Card key={label} className="p-4">
                <Icon size={18} className="text-primary mb-3" />
                <p className="text-2xl font-black" style={{ color: 'var(--text)' }}>{value}</p>
                <p className="text-[10px] uppercase font-black text-muted tracking-wider">{label}</p>
              </Card>
            ))}
            <Card className="col-span-2 p-4 bg-gradient-to-r from-amber-500/10 to-pink-500/10 border-amber-500/20">
              <p className="text-xs font-black uppercase text-amber-600 mb-1">Creator tools</p>
              <p className="text-sm text-muted">Export as image, PDF, ZIP, A4 poster, Instagram story, or Flashcard of the Day.</p>
            </Card>
            <Card className="col-span-2 p-4">
              <p className="text-xs font-black uppercase text-primary mb-1">Publishing workflow</p>
              <p className="text-sm text-muted mb-3">
                Review: {activeDeck.review_status || 'draft'} • Visibility: {activeDeck.publishing_status || activeDeck.visibility || 'private'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => handleDeckStatusAction('submit_review')}>Ask Teacher Review</Button>
                <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => handleDeckStatusAction('publish_class')}>Request Class Reel</Button>
                <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => handleDeckStatusAction('publish_marketplace')}>Request Marketplace</Button>
                <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => handleDeckStatusAction('keep_private')}>Keep Private</Button>
              </div>
            </Card>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card)] p-4">
          <details>
            <summary className="cursor-pointer list-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] uppercase font-black text-primary tracking-widest">Deck Look</p>
              <h2 className="font-black" style={{ color: 'var(--text)' }}>Change theme, stickers, and cover mood anytime</h2>
            </div>
            <span className="text-xs font-bold text-muted">Current: {activeStyle.name} • {selectedPack.name}</span>
          </div>
            </summary>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {THEME_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => handleDeckDesignUpdate(style.id)}
                className={`min-w-[150px] rounded-2xl border p-2 text-left ${activeDeck.theme_color === style.id || activeDeck.theme_style === style.id ? 'border-primary bg-primary/10' : 'border-[var(--card-border)]'}`}
              >
                <div className={`h-16 rounded-xl flex items-center justify-center text-2xl ${style.frontClass}`}>{style.emoji}</div>
                <p className="mt-2 text-xs font-black" style={{ color: 'var(--text)' }}>{style.name}</p>
                <p className="text-[10px] text-muted">{style.category}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase font-black text-muted mb-2">Cover emoji</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {COVER_EMOJIS.map((emoji) => (
                    <button key={emoji} onClick={() => setCoverEmoji(emoji)} className={`min-w-10 h-10 rounded-2xl border text-lg ${coverEmoji === emoji ? 'border-primary bg-primary/10' : 'border-[var(--card-border)] bg-[var(--input)]'}`}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {BACKGROUND_STYLES.slice(0, 8).map((background) => (
                  <button key={background.id} onClick={() => setCoverBackground(background.id)} className={`rounded-2xl border p-2 text-left ${coverBackground === background.id ? 'border-primary bg-primary/10' : 'border-[var(--card-border)]'}`}>
                    <div className={`h-9 rounded-xl border border-black/10 ${background.className}`} />
                    <span className="mt-1 block text-[10px] font-black text-muted">{background.name}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {COVER_IMAGE_PRESETS.slice(0, 8).map((preset) => (
                  <button key={preset.id} onClick={() => { setCoverPresetId(preset.id); setCoverImageUrl('') }} className={`rounded-2xl border p-2 text-left ${coverPresetId === preset.id && !coverImageUrl ? 'border-primary bg-primary/10' : 'border-[var(--card-border)]'}`}>
                    <div className={`h-12 rounded-xl border border-black/10 ${preset.className}`} />
                    <span className="mt-1 block text-[10px] font-black text-muted">{preset.name}</span>
                  </button>
                ))}
              </div>
              <Input value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} placeholder="Custom cover image URL" className="rounded-xl" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {FONT_STYLES.map((font) => (
                  <button key={font.id} onClick={() => setCoverFont(font.id)} className={`rounded-2xl border p-3 text-left ${coverFont === font.id ? 'border-primary bg-primary/10' : 'border-[var(--card-border)]'}`}>
                    <span className={`block text-sm ${font.className}`} style={{ color: 'var(--text)' }}>Aa {font.name}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {STICKER_PACKS.map((pack) => (
                  <button key={pack.name} onClick={() => setStickerPack(pack.name)} className={`rounded-2xl border p-2 text-left ${stickerPack === pack.name ? 'border-primary bg-primary/10' : 'border-[var(--card-border)]'}`}>
                    <span className="text-xl">{pack.emoji}</span>
                    <span className="block text-[10px] font-black text-muted">{pack.name}</span>
                  </button>
                ))}
              </div>
              <Button className="w-full rounded-2xl" onClick={() => handleDeckDesignUpdate(activeDeck.theme_color || activeStyle.id, stickerPack)}>
                <Palette size={16} className="mr-2" /> Save Cover Style
              </Button>
            </div>
            <Card className={`relative overflow-hidden min-h-[240px] p-5 ${selectedCoverSurface} ${selectedCoverFont.className}`}>
              {coverImageUrl && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coverImageUrl})` }} />}
              <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/25 to-black/75" />
              <div className="relative z-10 h-full flex flex-col justify-between text-white">
                <div className="flex justify-between">
                  <span className="text-[10px] uppercase font-black tracking-[0.25em] opacity-80">Cover preview</span>
                  <span className="text-4xl">{coverEmoji}</span>
                </div>
                <div>
                  <span className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur">{selectedTheme.name}</span>
                  <h3 className="text-2xl font-black leading-tight">{activeDeck.title || activeDeck.name}</h3>
                  <div className="mt-4 flex gap-2">
                    {coverAccentStickers.map((sticker) => (
                      <span key={sticker} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl backdrop-blur">{sticker}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
          </details>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-sm uppercase tracking-widest text-muted flex items-center gap-2"><BookOpen size={16} /> Cards ({activeDeck.cards.length})</h3>
              <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-xs font-black">{dueCount} due today</span>
            </div>

            {activeDeck.cards.length === 0 ? (
              <Card className="p-10 text-center border-dashed">
                <Layers size={40} className="mx-auto text-muted opacity-30 mb-4" />
                <p className="text-sm text-muted font-bold">Add the first card. A beautiful deck deserves something to show off.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeDeck.cards.map((card: any) => (
                  <Card key={card.id} className="overflow-hidden">
                    <div className={`p-4 ${BACKGROUND_STYLES.find((background) => background.id === card.visual_config?.background)?.className || 'bg-[var(--card)]'} ${FONT_STYLES.find((font) => font.id === card.visual_config?.font)?.className || ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black text-muted tracking-wider">{card.card_type || 'qa'} card</span>
                        <div className="flex gap-1 text-lg">
                          {(card.stickers || selectedPack.stickers || [activeStyle.emoji]).slice(0, 6).map((sticker: string) => <span key={sticker}>{sticker}</span>)}
                        </div>
                      </div>
                      {card.visual_config?.imageUrl && (
                        <div className="mt-3 h-28 rounded-2xl bg-cover bg-center border border-black/10" style={{ backgroundImage: `url(${card.visual_config.imageUrl})` }} />
                      )}
                      {(card.drawing_url || card.visual_config?.questionDrawingUrl || card.visual_config?.drawingUrl) && (
                        <div className="mt-3 rounded-2xl border border-black/10 bg-white p-2">
                          <img src={card.drawing_url || card.visual_config.questionDrawingUrl || card.visual_config.drawingUrl} alt="Question drawing" className="h-28 w-full object-contain" />
                        </div>
                      )}
                      <div className="mt-4 rounded-2xl bg-white/80 p-3 text-slate-950">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Front / Question</p>
                        <p className="font-black mt-1">{card.front_content}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-black uppercase text-muted tracking-wider">Back / Answer</p>
                      {card.visual_config?.answerImageUrl && (
                        <div className="mt-3 h-28 rounded-2xl bg-cover bg-center border border-[var(--card-border)]" style={{ backgroundImage: `url(${card.visual_config.answerImageUrl})` }} />
                      )}
                      {card.visual_config?.answerDrawingUrl && (
                        <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-white p-2">
                          <img src={card.visual_config.answerDrawingUrl} alt="Answer drawing" className="h-28 w-full object-contain" />
                        </div>
                      )}
                      <p className="text-sm mt-1" style={{ color: 'var(--text)' }}>{card.back_content}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase text-muted">
                        <span className="rounded-full bg-[var(--input)] px-2 py-1">Bg: {BACKGROUND_STYLES.find((background) => background.id === card.visual_config?.background)?.name || 'Default'}</span>
                        <span className="rounded-full bg-[var(--input)] px-2 py-1">Font: {FONT_STYLES.find((font) => font.id === card.visual_config?.font)?.name || 'Default'}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Card className="p-4 md:p-5 h-fit lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase font-black text-primary tracking-widest">Card Designer</p>
                <h3 className="font-black" style={{ color: 'var(--text)' }}>Make the next card beautiful</h3>
              </div>
              <Palette size={22} className="text-primary" />
            </div>

            <div className={`mb-4 rounded-3xl border border-[var(--card-border)] p-4 min-h-[170px] overflow-hidden ${selectedBackground.className} ${selectedFont.className}`}>
              {cardImageUrl && (
                <div className="mb-3 h-24 rounded-2xl bg-cover bg-center border border-black/10" style={{ backgroundImage: `url(${cardImageUrl})` }} />
              )}
              {drawingUrl && (
                <div className="mb-3 rounded-2xl border border-black/10 bg-white p-2">
                  <img src={drawingUrl} alt="Drawing preview" className="h-24 w-full object-contain" />
                </div>
              )}
              <div className="flex justify-between gap-3">
                <p className="text-[10px] font-black uppercase opacity-60">{newCardType} preview</p>
                <div className="flex flex-wrap justify-end gap-1 text-lg max-w-[140px]">
                  {selectedPack.stickers.slice(0, 4).map((sticker) => <span key={sticker}>{sticker}</span>)}
                </div>
              </div>
              <p className="mt-5 text-lg font-black text-slate-900">{newCardFront || 'Question preview'}</p>
              <p className="mt-2 text-sm text-slate-700">{newCardBack || 'Answer preview'}</p>
            </div>

            <details className="mb-3 rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
              <summary className="cursor-pointer text-xs font-black uppercase text-muted flex items-center gap-2"><Wallpaper size={14} /> Background</summary>
              <div className="grid grid-cols-2 gap-2">
                {BACKGROUND_STYLES.map((background) => (
                  <button key={background.id} onClick={() => setCardBackground(background.id)} className={`rounded-2xl border p-2 text-left ${cardBackground === background.id ? 'border-primary bg-primary/10' : 'border-[var(--card-border)]'}`}>
                    <div className={`h-9 rounded-xl border border-black/10 ${background.className}`} />
                    <span className="mt-1 block text-[10px] font-black text-muted">{background.name}</span>
                  </button>
                ))}
              </div>
            </details>

            <details className="mb-3 rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
              <summary className="cursor-pointer text-xs font-black uppercase text-muted flex items-center gap-2"><Type size={14} /> Font</summary>
              <div className="grid grid-cols-2 gap-2">
                {FONT_STYLES.map((font) => (
                  <button key={font.id} onClick={() => setCardFont(font.id)} className={`rounded-2xl border p-3 text-left ${cardFont === font.id ? 'border-primary bg-primary/10' : 'border-[var(--card-border)]'}`}>
                    <span className={`block text-sm ${font.className}`} style={{ color: 'var(--text)' }}>Aa {font.name}</span>
                  </button>
                ))}
              </div>
            </details>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                ['qa', BookOpen, 'Text'],
                ['voice', Mic, 'Voice'],
                ['draw', Paintbrush, 'Draw'],
                ['match', Users, 'Match'],
              ].map(([type, Icon, label]: any) => (
                <button key={type} onClick={() => setNewCardType(type)} className={`rounded-2xl border p-3 text-left transition ${newCardType === type ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--card-border)] text-muted'}`}>
                  <Icon size={18} />
                  <span className="block mt-2 text-xs font-black">{label}</span>
                </button>
              ))}
            </div>
            {newCardType === 'draw' && (
              <div className="mb-4 rounded-3xl border border-primary/20 bg-primary/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase font-black text-primary tracking-widest">Draw mode</p>
                    <p className="text-xs text-muted">Perfect for geometry, circuits, leaf diagrams, and CBC creativity tasks.</p>
                  </div>
                  <Button variant="ghost" size="sm" className="rounded-xl" onClick={clearDrawing}><RotateCcw size={14} className="mr-1" /> Clear</Button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={720}
                  height={420}
                  className="h-48 w-full touch-none rounded-2xl border border-[var(--card-border)] bg-white shadow-inner"
                  onMouseDown={beginDrawing}
                  onMouseMove={moveDrawing}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  onTouchStart={beginDrawing}
                  onTouchMove={moveDrawing}
                  onTouchEnd={endDrawing}
                />
              </div>
            )}
            <details className="mb-4 rounded-3xl border border-[var(--card-border)] bg-[var(--input)] p-3" open={newCardType === 'draw'}>
              <summary className="cursor-pointer text-xs font-black uppercase text-muted flex items-center gap-2">
                <Type size={14} /> Formula & equation writer
              </summary>
              <div className="mt-3 space-y-3">
                <Input
                  value={formulaDraft}
                  onChange={(event) => setFormulaDraft(event.target.value)}
                  placeholder="Type x^2 + sqrt(16), H2O, CO2, a_1, theta, pi..."
                  className="rounded-xl font-mono"
                />
                <div className="flex flex-wrap gap-1.5">
                  {FORMULA_SYMBOLS.map((symbol) => (
                    <button
                      key={symbol}
                      type="button"
                      onClick={() => setFormulaDraft((current) => `${current}${symbol}`)}
                      className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-black"
                      style={{ color: 'var(--text)' }}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
                  <p className="text-[10px] uppercase font-black text-primary mb-1">Clean preview</p>
                  <p className="min-h-7 text-xl font-black font-mono" style={{ color: 'var(--text)' }}>{formattedFormula || 'x² + √(16)'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-xl"
                    disabled={!formattedFormula}
                    onClick={() => setNewCardFront(formattedFormula)}
                  >
                    Use as question
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-xl"
                    disabled={!formattedFormula}
                    onClick={() => setNewCardBack(formattedFormula)}
                  >
                    Use as answer
                  </Button>
                </div>
              </div>
            </details>
            <div className="space-y-3">
              <Input value={newCardFront} onChange={(event) => setNewCardFront(event.target.value)} placeholder="Question or prompt" className="rounded-xl" />
              <textarea value={newCardBack} onChange={(event) => setNewCardBack(event.target.value)} className="w-full min-h-[110px] p-3 text-sm bg-[var(--input)] border border-[var(--card-border)] rounded-xl focus:ring-2 focus:ring-primary/50 outline-none resize-none" placeholder="Answer, match pair, or drawing instruction" style={{ color: 'var(--text)' }} />
              <Input value={cardImageUrl} onChange={(event) => setCardImageUrl(event.target.value)} placeholder="Optional image URL for this card" className="rounded-xl" />
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--input)] px-3 py-3 text-xs font-black text-muted hover:text-primary">
                Upload image from device
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) imageFileToDataUrl(file, setCardImageUrl)
                  }}
                />
              </label>
              <details className="rounded-2xl bg-[var(--input)] p-3">
                <summary className="cursor-pointer text-[10px] uppercase font-black text-muted">Sticker pack: {selectedPack.name}</summary>
                <div className="grid grid-cols-4 gap-2">
                  {STICKER_PACKS.map((pack) => (
                    <button key={pack.name} onClick={() => setStickerPack(pack.name)} className={`rounded-xl border p-2 text-left ${stickerPack === pack.name ? 'border-primary bg-primary/10' : 'border-[var(--card-border)]'}`}>
                      <span className="block text-xl">{pack.emoji}</span>
                      <span className="text-[9px] font-black text-muted">{pack.name}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1 text-xl">{selectedPack.stickers.map((sticker) => <span key={sticker}>{sticker}</span>)}</div>
              </details>
              <Button className="w-full rounded-xl" onClick={handleCreateCard} disabled={!newCardFront || !newCardBack}><Plus size={16} className="mr-2" /> Save Card</Button>
            </div>
          </Card>
        </section>
      </div>
    )
  }

  return (
    <div className="p-3 md:p-6 space-y-5 md:space-y-8 pb-32">
      <section className="relative overflow-hidden rounded-[1.6rem] md:rounded-[2rem] border border-[var(--card-border)] bg-[var(--card)] p-4 md:p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -right-8 -top-8 text-[6rem] md:text-[9rem] opacity-10">{selectedMascot.emoji}</div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4 md:gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-primary">Peak Performance Creator Hub</p>
            <h1 className="text-2xl md:text-5xl font-black mt-2 leading-tight" style={{ color: 'var(--text)' }}>Design beautiful study packs fast.</h1>
            <p className="text-sm md:text-base text-muted mt-3 max-w-2xl">Pick a registered subject, style the cover, add stickers, then create a deck that feels worth sharing.</p>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary"><BadgeCheck size={14} /> Curriculum locked: {creatorMeta.curriculumName}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-600"><Compass size={14} /> {creatorMeta.className}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">Your subjects only</span>
            </div>
          </div>
          <Button onClick={() => setIsCreatingDeck(!isCreatingDeck)} size="lg" className="rounded-2xl shadow-lg shadow-primary/20"><Sparkles size={18} className="mr-2" /> Create Flashcard</Button>
        </div>
      </section>

      <AnimatePresence>
        {isCreatingDeck && (
          <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-1 gap-6">
              <Card className="p-5 md:p-6 border-primary/20">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Sparkles size={24} /></div>
                  <div>
                    <h2 className="font-black text-xl" style={{ color: 'var(--text)' }}>Quick Create</h2>
                    <p className="text-sm text-muted">Answer four things, then let Peak make it beautiful.</p>
                  </div>
                </div>

                <div className="mb-4 rounded-2xl bg-primary/10 border border-primary/20 p-4">
                  <p className="text-[10px] uppercase font-black text-primary mb-1">Curriculum is automatic</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{creatorMeta.curriculumName} • {creatorMeta.className}</p>
                  <p className="text-xs text-muted mt-1">Students create packs only for their assigned curriculum. No separate curriculum picker is shown.</p>
                </div>

                <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                    <p className="text-[10px] uppercase font-black text-muted">Cover</p>
                    <p className="mt-1 text-sm font-black" style={{ color: 'var(--text)' }}>{selectedCoverSurfaceName}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                    <p className="text-[10px] uppercase font-black text-muted">Vibe</p>
                    <p className="mt-1 text-sm font-black" style={{ color: 'var(--text)' }}>{selectedTheme.emoji} {selectedTheme.name}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                    <p className="text-[10px] uppercase font-black text-muted">Stickers</p>
                    <p className="mt-1 text-sm font-black" style={{ color: 'var(--text)' }}>{selectedPack.emoji} {selectedPack.name}</p>
                  </div>
                </div>

                <div className="mb-6 rounded-3xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-[10px] uppercase font-black text-primary mb-3 tracking-widest">1. Start here</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium" style={{ color: 'var(--text)' }}>Subject</label>
                      <select
                        value={selectedSubjectId}
                      onChange={(event) => {
                        const subject = creatorMeta.subjects.find((item) => item.id === event.target.value)
                        setSelectedSubjectId(event.target.value)
                        setQuickSubject(subject?.name || '')
                        if (subject?.name) {
                          setQuickTopic(getSubjectTopics(subject.name, creatorMeta.curriculumName)[0])
                        }
                      }}
                        className="w-full rounded-xl bg-[var(--input)] border border-[var(--card-border)] px-4 py-2.5 text-sm"
                        style={{ color: 'var(--text)' }}
                      >
                        {creatorMeta.subjects.length === 0 && <option value="">No registered subjects found</option>}
                        {creatorMeta.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                      </select>
                    </div>
                    <Input label="Topic" value={quickTopic} onChange={(event) => setQuickTopic(event.target.value)} placeholder="Plants" />
                    <Input label="Question" value={quickQuestion} onChange={(event) => setQuickQuestion(event.target.value)} placeholder="What do leaves use to make food?" />
                    <Input label="Answer" value={quickAnswer} onChange={(event) => setQuickAnswer(event.target.value)} placeholder="Sunlight, carbon dioxide, and water" />
                  </div>
                  <details className="mt-4 rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                    <summary className="cursor-pointer text-sm font-black" style={{ color: 'var(--text)' }}>Draw, formula, or image for this card</summary>
                    <div className="mt-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase font-black text-primary tracking-widest">Draw, formula, or image</p>
                        <p className="text-xs text-muted">Choose whether the drawing/image belongs to the question or the answer.</p>
                      </div>
                      <Button variant="ghost" size="sm" className="rounded-xl" onClick={clearQuickDrawing}><RotateCcw size={14} className="mr-1" /> Clear</Button>
                    </div>
                    <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--input)] p-1">
                      {(['question', 'answer'] as const).map((target) => (
                        <button
                          key={target}
                          type="button"
                          onClick={() => setQuickAttachmentTarget(target)}
                          className={`rounded-xl px-3 py-2 text-xs font-black uppercase ${quickAttachmentTarget === target ? 'bg-primary text-white' : 'text-muted'}`}
                        >
                          {target === 'question' ? 'Draw question' : 'Draw answer'}
                        </button>
                      ))}
                    </div>
                    <canvas
                      ref={quickCanvasRef}
                      width={720}
                      height={420}
                      className="h-48 w-full touch-none rounded-2xl border border-[var(--card-border)] bg-white shadow-inner"
                      onMouseDown={beginQuickDrawing}
                      onMouseMove={moveQuickDrawing}
                      onMouseUp={endQuickDrawing}
                      onMouseLeave={endQuickDrawing}
                      onTouchStart={beginQuickDrawing}
                      onTouchMove={moveQuickDrawing}
                      onTouchEnd={endQuickDrawing}
                    />
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Input
                          value={quickFormulaDraft}
                          onChange={(event) => setQuickFormulaDraft(event.target.value)}
                          placeholder="Formula: x^2 + sqrt(16), H2O, CO2..."
                          className="rounded-xl font-mono"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {FORMULA_SYMBOLS.slice(0, 14).map((symbol) => (
                            <button
                              key={symbol}
                              type="button"
                              onClick={() => setQuickFormulaDraft((current) => `${current}${symbol}`)}
                              className="rounded-xl border border-[var(--card-border)] bg-[var(--input)] px-2.5 py-1.5 text-xs font-black"
                              style={{ color: 'var(--text)' }}
                            >
                              {symbol}
                            </button>
                          ))}
                        </div>
                        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
                          <p className="text-[10px] uppercase font-black text-primary mb-1">Clean formula preview</p>
                          <p className="min-h-7 text-xl font-black font-mono" style={{ color: 'var(--text)' }}>{formattedQuickFormula || 'x² + √(16)'}</p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full rounded-xl"
                          disabled={!formattedQuickFormula}
                          onClick={() => {
                            if (quickAttachmentTarget === 'answer') {
                              setQuickAnswer((current) => current ? `${current} ${formattedQuickFormula}` : formattedQuickFormula)
                            } else {
                              setQuickQuestion((current) => current ? `${current} ${formattedQuickFormula}` : formattedQuickFormula)
                            }
                          }}
                        >
                          Add formula to {quickAttachmentTarget}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Input
                          value={quickAttachmentTarget === 'answer' ? quickAnswerImageUrl : quickImageUrl}
                          onChange={(event) => {
                            if (quickAttachmentTarget === 'answer') setQuickAnswerImageUrl(event.target.value)
                            else setQuickImageUrl(event.target.value)
                          }}
                          placeholder={`Paste image URL for this ${quickAttachmentTarget}`}
                          className="rounded-xl"
                        />
                        <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--input)] px-3 py-3 text-xs font-black text-muted hover:text-primary">
                          Upload image from device
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file) imageFileToDataUrl(file, quickAttachmentTarget === 'answer' ? setQuickAnswerImageUrl : setQuickImageUrl)
                            }}
                          />
                        </label>
                        {(quickImageUrl || quickDrawingUrl || quickAnswerImageUrl || quickAnswerDrawingUrl) && (
                          <div className="grid grid-cols-2 gap-2">
                            {quickImageUrl && <div className="relative h-24 rounded-2xl border border-[var(--card-border)] bg-cover bg-center" style={{ backgroundImage: `url(${quickImageUrl})` }}><span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-black text-white">Question image</span></div>}
                            {quickDrawingUrl && <img src={quickDrawingUrl} alt="Question drawing preview" className="h-24 w-full rounded-2xl border border-[var(--card-border)] bg-white object-contain p-1" />}
                            {quickAnswerImageUrl && <div className="relative h-24 rounded-2xl border border-[var(--card-border)] bg-cover bg-center" style={{ backgroundImage: `url(${quickAnswerImageUrl})` }}><span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-black text-white">Answer image</span></div>}
                            {quickAnswerDrawingUrl && <img src={quickAnswerDrawingUrl} alt="Answer drawing preview" className="h-24 w-full rounded-2xl border border-[var(--card-border)] bg-white object-contain p-1" />}
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                  </details>
                </div>

                <details className="mb-6 rounded-3xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                  <summary className="cursor-pointer px-1 py-2 text-sm font-black" style={{ color: 'var(--text)' }}>2. Style the cover • {selectedCoverSurfaceName}</summary>
                <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase font-black text-muted mb-2">Cover emoji</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {COVER_EMOJIS.map((emoji) => (
                          <button key={emoji} onClick={() => setCoverEmoji(emoji)} className={`min-w-11 h-11 rounded-2xl border text-xl ${coverEmoji === emoji ? 'border-primary bg-primary/10' : 'border-[var(--card-border)] bg-[var(--input)]'}`}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black text-muted mb-2">Cover background</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {BACKGROUND_STYLES.map((background) => (
                          <button key={background.id} onClick={() => setCoverBackground(background.id)} className={`rounded-2xl border p-2 text-left ${coverBackground === background.id ? 'border-primary bg-primary/10' : 'border-[var(--card-border)]'}`}>
                            <div className={`h-10 rounded-xl border border-black/10 ${background.className}`} />
                            <span className="mt-1 block text-[10px] font-black text-muted">{background.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black text-muted mb-2">Beautiful cover images</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {COVER_IMAGE_PRESETS.map((preset) => (
                          <button key={preset.id} onClick={() => { setCoverPresetId(preset.id); setCoverImageUrl('') }} className={`rounded-2xl border p-2 text-left ${coverPresetId === preset.id && !coverImageUrl ? 'border-primary bg-primary/10' : 'border-[var(--card-border)]'}`}>
                            <div className={`h-14 rounded-xl border border-black/10 ${preset.className}`} />
                            <span className="mt-1 block text-[10px] font-black text-muted">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                      <Input value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} placeholder="Or paste your own cover image URL" className="mt-2 rounded-xl" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black text-muted mb-2">Cover font</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {FONT_STYLES.map((font) => (
                          <button key={font.id} onClick={() => setCoverFont(font.id)} className={`rounded-2xl border p-3 text-left ${coverFont === font.id ? 'border-primary bg-primary/10' : 'border-[var(--card-border)]'}`}>
                            <span className={`block text-sm ${font.className}`} style={{ color: 'var(--text)' }}>Aa {font.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Card className={`relative overflow-hidden min-h-[260px] p-5 ${selectedCoverSurface} ${selectedCoverFont.className}`}>
                    {coverImageUrl && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coverImageUrl})` }} />}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/25 to-black/70" />
                    <div className="relative z-10 h-full flex flex-col justify-between text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black tracking-[0.25em] opacity-80">{creatorMeta.curriculumName}</span>
                        <span className="text-4xl">{coverEmoji}</span>
                      </div>
                      <div>
                        <span className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur">{selectedTheme.name}</span>
                        <p className="text-xs font-black uppercase opacity-80">{quickSubject || 'Subject'} • {quickTopic || 'Topic'}</p>
                        <h3 className="mt-2 text-3xl font-black leading-tight">{quickSubject && quickTopic ? `${quickSubject}: ${quickTopic}` : 'Your premium cover'}</h3>
                        <div className="mt-5 flex gap-2">
                          {coverAccentStickers.map((sticker) => (
                            <span key={sticker} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl backdrop-blur">{sticker}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
                </details>

                <details className="mt-6 rounded-3xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                  <summary className="cursor-pointer px-1 py-2 text-sm font-black" style={{ color: 'var(--text)' }}>3. Pick the vibe • {selectedTheme.emoji} {selectedTheme.name}</summary>
                  <p className="mt-3 text-[10px] uppercase font-black text-muted mb-3">What do you like?</p>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {['Cute', 'Space', 'Sports', 'Gaming', 'Colorful', 'Academic'].map((prompt) => (
                      <button key={prompt} onClick={() => setThemePrompt(prompt)} className={`rounded-2xl border p-3 text-sm font-black transition ${themePrompt === prompt ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--card-border)] text-muted'}`}>
                        {THEME_STYLES.find((style) => style.wizard === prompt)?.emoji || '📚'} {prompt}
                      </button>
                    ))}
                  </div>
                </details>

                <details className="mt-6 rounded-3xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                  <summary className="cursor-pointer px-1 py-2 text-sm font-black" style={{ color: 'var(--text)' }}>4. Add stickers • {selectedPack.emoji} {selectedPack.name}</summary>
                  <p className="mt-3 text-[10px] uppercase font-black text-muted mb-3">Sticker-first design</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {STICKER_PACKS.map((pack) => (
                      <button key={pack.name} onClick={() => setStickerPack(pack.name)} className={`rounded-2xl border p-3 text-left transition ${stickerPack === pack.name ? 'border-primary bg-primary/10' : 'border-[var(--card-border)]'}`}>
                        <span className="text-2xl">{pack.emoji}</span>
                        <span className="block text-xs font-black mt-2" style={{ color: 'var(--text)' }}>{pack.name}</span>
                      </button>
                    ))}
                  </div>
                </details>

                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsCreatingDeck(false)}>Cancel</Button>
                  <Button onClick={handleMakeBeautiful} disabled={!selectedSubjectId || !quickSubject || !quickTopic || !hasQuickQuestionContent || !quickAnswer}><Sparkles size={16} className="mr-2" /> Make Beautiful</Button>
                </div>
              </Card>

            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-black text-xl" style={{ color: 'var(--text)' }}>Your Subjects</h2>
            <p className="text-sm text-muted">Creator Hub uses your onboarded subjects first, then your class subjects if an older profile has no readable registrations.</p>
          </div>
        </div>
        {creatorMeta.subjects.length === 0 ? (
          <Card className="p-5 border-dashed">
            <p className="font-black" style={{ color: 'var(--text)' }}>No subjects loaded for {creatorMeta.curriculumName || 'this curriculum'} yet.</p>
            <p className="text-sm text-muted mt-1">
              Creator Hub will not borrow subjects from another curriculum. Refresh after Settings/onboarding syncs, or ask an admin to confirm this class has subjects configured.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {creatorMeta.subjects.map((subject) => {
              const topics = getSubjectTopics(subject.name, creatorMeta.curriculumName)
              return (
                <Card key={subject.id} className="relative overflow-hidden p-5 bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-primary/10 hover:border-primary/40 transition-all">
                  <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase font-black text-primary tracking-widest">Registered subject</p>
                      <h3 className="font-black text-2xl mt-1" style={{ color: 'var(--text)' }}>{subject.name}</h3>
                      <p className="text-xs text-muted mt-1">{creatorMeta.curriculumName} • {creatorMeta.className}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <BookOpen size={22} />
                    </div>
                  </div>
                  <div className="relative mt-5 flex flex-wrap gap-2">
                    {topics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => {
                          setSelectedSubjectId(subject.id)
                          setQuickSubject(subject.name)
                          setQuickTopic(topic)
                          setIsCreatingDeck(true)
                        }}
                        className="px-3 py-1.5 rounded-full bg-[var(--input)] text-xs font-bold text-muted hover:text-primary hover:bg-primary/10 transition"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="relative mt-5 w-full rounded-2xl"
                    onClick={() => {
                      setSelectedSubjectId(subject.id)
                      setQuickSubject(subject.name)
                      setQuickTopic(topics[0])
                      setIsCreatingDeck(true)
                    }}
                  >
                    <Sparkles size={14} className="mr-2" /> Create {subject.name} Pack
                  </Button>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-12 py-6 rounded-3xl" placeholder="Search decks, codes, topics..." />
        </div>

        {filteredDecks.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <Layers size={40} className="mx-auto text-muted opacity-30 mb-4" />
            <p className="font-black" style={{ color: 'var(--text)' }}>No decks yet.</p>
            <p className="text-sm text-muted mt-1">Create one beautiful deck and this page stops feeling empty immediately.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredDecks.map((deck: any) => {
              const style = THEME_STYLES.find((theme) => theme.id === deck.theme_color || theme.id === deck.theme_style) || THEME_STYLES[0]
              const code = deck.share_code || deck.id.slice(0, 7).toUpperCase()
              const cover = deck.cover_config || {}
              const coverBg = BACKGROUND_STYLES.find((background) => background.id === cover.background)
              const coverFont = FONT_STYLES.find((font) => font.id === cover.font)
              const coverPreset = cover.presetClass || COVER_IMAGE_PRESETS.find((preset) => preset.id === cover.presetId)?.className || ''
              return (
                <motion.div key={deck.id} whileHover={{ y: -4 }}>
                  <Card className="overflow-hidden h-full flex flex-col group">
                    <button className={`relative overflow-hidden text-left p-5 min-h-[170px] ${cover.imageUrl || coverPreset ? 'text-white' : style.frontClass} ${coverPreset || coverBg?.className || ''} ${coverFont?.className || ''}`} onClick={() => openDeck(deck.id)}>
                      {cover.imageUrl && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${cover.imageUrl})` }} />}
                      {(cover.imageUrl || coverPreset) && <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/25 to-black/75" />}
                      <div className="relative z-10">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] uppercase font-black opacity-70">Deck Code {code}</p>
                          <span className="text-3xl">{cover.emoji || style.emoji}</span>
                        </div>
                        <h3 className="font-black text-2xl mt-5">{deck.title || deck.name}</h3>
                        <p className="text-xs font-bold opacity-75 mt-2">{deck.topic || deck.subject?.name || 'Flashcard deck'}</p>
                      </div>
                    </button>
                    <div className="p-5 flex-1 flex flex-col gap-4">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-2xl bg-[var(--input)] p-2"><p className="font-black text-primary">{deck.cards?.[0]?.count || 0}</p><p className="text-[9px] uppercase font-black text-muted">Cards</p></div>
                        <div className="rounded-2xl bg-[var(--input)] p-2"><p className="font-black text-primary">{deck.saves || 0}</p><p className="text-[9px] uppercase font-black text-muted">Saves</p></div>
                        <div className="rounded-2xl bg-[var(--input)] p-2"><p className="font-black text-primary">{deck.shares || 0}</p><p className="text-[9px] uppercase font-black text-muted">Shares</p></div>
                      </div>
                      <div className="mt-auto flex gap-2">
                        <Button variant="secondary" size="sm" className="rounded-xl flex-1" onClick={() => shareToWhatsApp(deck)}>WhatsApp</Button>
                        <Button size="sm" className="rounded-xl flex-1" onClick={() => openDeck(deck.id)}>Open</Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
