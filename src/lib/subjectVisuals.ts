import {
  GraduationCap, BookOpen, Calculator, Globe, Microscope, FlaskConical,
  Landmark, Palette, Dumbbell, Church, Sprout, Monitor, Briefcase,
  Atom, Dna, History, Map, Music, PenTool,
  Home, HeartPulse, Compass, Languages, NotebookPen, Lightbulb
} from 'lucide-react'

export interface SubjectVisual {
  Icon: typeof BookOpen
  gradient: string
  emoji: string
}

const SUBJECT_VISUALS: Array<{ match: string[]; visual: SubjectVisual }> = [
  { match: ['mathematics', 'math', 'numeracy', 'calculation'], visual: { Icon: Calculator, gradient: 'from-blue-500 to-indigo-600', emoji: '📐' } },
  { match: ['english', 'literacy', 'reading', 'literature'], visual: { Icon: BookOpen, gradient: 'from-rose-500 to-pink-600', emoji: '📖' } },
  { match: ['kiswahili', 'swahili', 'lusamia', 'sheng'], visual: { Icon: Languages, gradient: 'from-emerald-500 to-teal-600', emoji: '🌍' } },
  { match: ['science', 'general science'], visual: { Icon: Microscope, gradient: 'from-cyan-500 to-sky-600', emoji: '🔬' } },
  { match: ['chemistry'], visual: { Icon: FlaskConical, gradient: 'from-violet-500 to-purple-600', emoji: '🧪' } },
  { match: ['biology'], visual: { Icon: Dna, gradient: 'from-lime-500 to-green-600', emoji: '🧬' } },
  { match: ['physics'], visual: { Icon: Atom, gradient: 'from-amber-500 to-orange-600', emoji: '⚛️' } },
  { match: ['social studies', 'social'], visual: { Icon: Compass, gradient: 'from-teal-500 to-cyan-600', emoji: '🧭' } },
  { match: ['history'], visual: { Icon: History, gradient: 'from-amber-500 to-yellow-600', emoji: '🏛️' } },
  { match: ['geography', 'geog'], visual: { Icon: Map, gradient: 'from-green-500 to-emerald-600', emoji: '🗺️' } },
  { match: ['creative arts', 'art', 'craft'], visual: { Icon: Palette, gradient: 'from-pink-500 to-rose-600', emoji: '🎨' } },
  { match: ['physical education', 'physical', 'pe', 'games', 'sports'], visual: { Icon: Dumbbell, gradient: 'from-orange-500 to-red-600', emoji: '🏃' } },
  { match: ['religious', 'cre', 'ire', 'hre', 'islamic', 'christian'], visual: { Icon: Church, gradient: 'from-indigo-500 to-violet-600', emoji: '🕊️' } },
  { match: ['agriculture', 'agri'], visual: { Icon: Sprout, gradient: 'from-green-500 to-lime-600', emoji: '🌱' } },
  { match: ['computer', 'ict', 'information', 'technology', 'computing'], visual: { Icon: Monitor, gradient: 'from-slate-500 to-slate-700', emoji: '💻' } },
  { match: ['business', 'commerce', 'accounts', 'entrepreneurship'], visual: { Icon: Briefcase, gradient: 'from-blue-500 to-cyan-600', emoji: '💼' } },
  { match: ['music'], visual: { Icon: Music, gradient: 'from-fuchsia-500 to-purple-600', emoji: '🎵' } },
  { match: ['french'], visual: { Icon: Globe, gradient: 'from-blue-500 to-indigo-600', emoji: '🇫🇷' } },
  { match: ['german'], visual: { Icon: Globe, gradient: 'from-yellow-500 to-orange-600', emoji: '🇩🇪' } },
  { match: ['home science', 'home', 'nutrition'], visual: { Icon: Home, gradient: 'from-rose-500 to-red-600', emoji: '🏠' } },
  { match: ['life skills', 'psychology'], visual: { Icon: HeartPulse, gradient: 'from-red-500 to-pink-600', emoji: '💓' } },
  { match: ['writing', 'composition'], visual: { Icon: PenTool, gradient: 'from-slate-500 to-gray-700', emoji: '✍️' } },
  { match: ['language'], visual: { Icon: Languages, gradient: 'from-cyan-500 to-blue-600', emoji: '🗣️' } },
  { match: ['law', 'paralegal'], visual: { Icon: Landmark, gradient: 'from-stone-500 to-stone-700', emoji: '⚖️' } },
]

const FALLBACK_VISUALS: SubjectVisual[] = [
  { Icon: NotebookPen, gradient: 'from-sky-500 to-indigo-600', emoji: '📘' },
  { Icon: Lightbulb, gradient: 'from-amber-500 to-orange-600', emoji: '💡' },
  { Icon: BookOpen, gradient: 'from-violet-500 to-purple-600', emoji: '📚' },
  { Icon: GraduationCap, gradient: 'from-emerald-500 to-teal-600', emoji: '🎓' },
]

export function getSubjectVisual(name: string | null | undefined, category: string | null | undefined, index: number): SubjectVisual {
  const n = String(name || '').toLowerCase()
  const c = String(category || '').toLowerCase()
  for (const entry of SUBJECT_VISUALS) {
    if (entry.match.some((m) => n.includes(m) || c.includes(m))) {
      return entry.visual
    }
  }
  return FALLBACK_VISUALS[index % FALLBACK_VISUALS.length]
}
