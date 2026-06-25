export type LanguageSubject = 'English' | 'Kiswahili'

export interface SetBook {
  subject: LanguageSubject
  title: string
  author?: string
  genre: 'novel' | 'play' | 'short_stories' | 'poetry' | 'fasihi'
  curriculum: 'kcse_844'
  status: 'current_candidate' | 'school_configurable'
  notes: string
}

export const KCSE_844_SET_BOOKS: SetBook[] = [
  {
    subject: 'English',
    title: 'Fathers of Nations',
    genre: 'novel',
    curriculum: 'kcse_844',
    status: 'current_candidate',
    notes: 'Compulsory English novel for the 2022-2026 KCSE set book cycle.',
  },
  {
    subject: 'English',
    title: 'The Samaritan',
    author: 'John Lara',
    genre: 'play',
    curriculum: 'kcse_844',
    status: 'current_candidate',
    notes: 'Compulsory English play for the 2022-2026 KCSE set book cycle.',
  },
  {
    subject: 'English',
    title: 'A Silent Song and Other Stories',
    genre: 'short_stories',
    curriculum: 'kcse_844',
    status: 'current_candidate',
    notes: 'Approved English short story collection; use for short story analysis, character, theme, style and excerpt-based questions.',
  },
  {
    subject: 'English',
    title: 'Artist of the Floating World',
    genre: 'novel',
    curriculum: 'kcse_844',
    status: 'school_configurable',
    notes: 'Optional/approved English novel used by some schools in the 2022-2026 cycle.',
  },
  {
    subject: 'English',
    title: 'A Parliament of Owls',
    genre: 'play',
    curriculum: 'kcse_844',
    status: 'school_configurable',
    notes: 'Optional/approved English play used by some schools in the 2022-2026 cycle.',
  },
  {
    subject: 'Kiswahili',
    title: 'Nguu za Jadi',
    author: 'Clara Momanyi',
    genre: 'novel',
    curriculum: 'kcse_844',
    status: 'current_candidate',
    notes: 'Compulsory Kiswahili riwaya for the 2022-2026 KCSE Fasihi cycle.',
  },
  {
    subject: 'Kiswahili',
    title: 'Bembea',
    genre: 'play',
    curriculum: 'kcse_844',
    status: 'current_candidate',
    notes: 'Compulsory Kiswahili tamthilia for the 2022-2026 KCSE Fasihi cycle.',
  },
  {
    subject: 'Kiswahili',
    title: 'Mapambazuko ya Machweo na Hadithi Nyingine',
    genre: 'short_stories',
    curriculum: 'kcse_844',
    status: 'current_candidate',
    notes: 'Compulsory Kiswahili hadithi fupi collection for the 2022-2026 KCSE Fasihi cycle.',
  },
]

export function getLanguageSetBookPrompt(subjects: string[], className: string) {
  const normalizedSubjects = subjects.map(subject => subject.toLowerCase())
  const needsEnglish = normalizedSubjects.some(subject => subject.includes('english') || subject.includes('literature'))
  const needsKiswahili = normalizedSubjects.some(subject => subject.includes('kiswahili'))

  if (!needsEnglish && !needsKiswahili) return ''

  const selected = KCSE_844_SET_BOOKS.filter(book =>
    (needsEnglish && book.subject === 'English') ||
    (needsKiswahili && book.subject === 'Kiswahili')
  )

  const lines = selected.map(book =>
    `- ${book.subject}: ${book.title}${book.author ? ` by ${book.author}` : ''} (${book.genre}; ${book.status}). ${book.notes}`
  )

  return `
LANGUAGE SET BOOK AND WRITING INSTRUCTIONS:
Class context: ${className || 'Unknown class'}.
Use the school/current 8-4-4 set book if it is known from the subject name or teacher setup. If not known, use these configurable candidates carefully:
${lines.join('\n')}

For English and Kiswahili:
- Include set-book questions where class level is Form 3 or Form 4.
- Use short original exam-style extracts or paraphrased situations. Do not reproduce long copyrighted passages from set books.
- Excerpt questions may ask about context, speaker, character, theme, tone, style, irony, conflict, language use, or what happens before/after.
- Essay tasks must include a clear prompt, expected points, marking rubric and grade bands.
- Include poetry/ushairi practice where appropriate: persona/nafsi neni, tone/tahakiki hisia, theme/maudhui, imagery/taswira, rhyme/urari, rhythm/mizani, alliteration/takriri, metaphor/sitiari, simile/tashbihi, symbolism/ishara, diction/uteuzi wa maneno, structure/muundo, mood/mandhari ya kihisia, and message/ujumbe.
- For poem or ushairi questions, do not use a tiny two-line snippet. Generate a complete original exam-style passage:
  - English poem: 3-4 stanzas, each with 3-4 lines.
  - Kiswahili ushairi: 3-4 beti, preferably 4 mishororo per ubeti where suitable.
  - Keep it original, age-appropriate and exam-like, then ask interpretation questions from that passage.
- For set-book practice, rotate chapter/scene context, character relationships, themes, style/literary devices, memorable quotation recognition, excerpt practice and KCSE-style essay prompts.
- Kiswahili tasks should use Kiswahili instructions and terminology: dondoo, maudhui, wahusika, mbinu, tamathali, mandhari, muundo, mtindo.
- English tasks should use KCSE language: excerpt, context, characterisation, theme, style, tone, irony, conflict, essay.
`
}

export function getCbcLanguagePrompt(subjects: string[], className: string) {
  const normalizedSubjects = subjects.map(subject => subject.toLowerCase())
  const hasLanguage = normalizedSubjects.some(subject =>
    subject.includes('english') || subject.includes('kiswahili') || subject.includes('literacy')
  )
  if (!hasLanguage) return ''

  return `
CBC LANGUAGE QUALITY FOR KPSEA/KJSEA:
Class context: ${className || 'Unknown class'}.
- For KPSEA Grade 4-6: use age-appropriate comprehension, grammar in context, vocabulary, functional writing, oral skills and everyday communication.
- For KJSEA Grade 7-9: use richer excerpts, inferencing, tone, register, summary, functional writing, oral literature, and short composition planning.
- Include simple poem/song/oral literature tasks for CBC where relevant: speaker, mood, repetition, rhyme, message, performance, audience and moral lesson.
- For CBC poem/song passages, use a complete short original piece, not two lines: 2-3 stanzas for KPSEA and 3-4 stanzas for KJSEA.
- Use Kenyan school, family, community, environment, digital safety, farming, market, sports and leadership contexts.
- Questions must train competence: reading, interpreting, communicating, justifying and improving a response.
- Avoid KCSE set-book demands for CBC unless the learner is explicitly in Form 3 or Form 4.
`
}
