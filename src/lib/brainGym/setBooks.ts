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
    author: 'Paul B. Vitta',
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
    title: 'An Artist of the Floating World',
    author: 'Kazuo Ishiguro',
    genre: 'novel',
    curriculum: 'kcse_844',
    status: 'school_configurable',
    notes: 'Optional/approved English novel used by some schools in the 2022-2026 cycle.',
  },
  {
    subject: 'English',
    title: 'A Parliament of Owls',
    author: "Adipo Sidang'",
    genre: 'play',
    curriculum: 'kcse_844',
    status: 'school_configurable',
    notes: 'Optional/approved English play used by some schools in the 2022-2026 cycle.',
  },
  {
    subject: 'Kiswahili',
    title: 'Nguu za Jadi',
    author: 'Kithaka wa Mberia',
    genre: 'novel',
    curriculum: 'kcse_844',
    status: 'current_candidate',
    notes: 'Compulsory Kiswahili riwaya for the 2022-2026 KCSE Fasihi cycle.',
  },
  {
    subject: 'Kiswahili',
    title: 'Bembea ya Maisha',
    author: 'Ken Walibora',
    genre: 'play',
    curriculum: 'kcse_844',
    status: 'current_candidate',
    notes: 'Compulsory Kiswahili tamthilia for the 2022-2026 KCSE Fasihi cycle.',
  },
  {
    subject: 'Kiswahili',
    title: 'Mapambazuko ya Machweo na Hadithi Nyingine',
    author: 'Kahigi na wengine',
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
System role for this lane: Peak Coach is an elite Kenyan literature teacher, KNEC examiner, curriculum specialist and KCSE paper setter. Questions must look like authentic KCSE Literature examination practice, not generic AI questions.
Curriculum discipline:
- Use 8-4-4 KCSE only for Form 3/Form 4 set-book tasks.
- Never generate set-book questions from CBC, Cambridge, IGCSE, IB or foreign curricula.
- Determine subject, selected book, practice mode, difficulty, student history and weak areas before generating.
- Never mix characters, plot events, settings, authors or themes between different books.
- Never generate questions outside the selected book when a selected book is specified.
Use the school/current 8-4-4 set book if it is known from the subject name or teacher setup. If not known, use these configurable candidates carefully:
${lines.join('\n')}

For English and Kiswahili:
- Include set-book questions where class level is Form 3 or Form 4.
- Excerpt practice must use ORIGINAL PRACTICE PASSAGES inspired by the selected prescribed text. Do not reproduce long copyrighted passages, do not fabricate quotations, and do not claim the passage is from the original text.
- Original practice passages should be 200-350 words for Set Books Gym excerpt mode, with believable atmosphere, setting, dialogue, conflict, narration, theme, character interaction, mood, tone and stylistic devices.
- Excerpt questions may ask about context, speaker, character, theme, tone, style, irony, conflict, language use, or what happens before/after.
- Essay tasks must resemble KCSE Paper 3 wording: "Using illustrations from the text...", "Drawing examples from the text...", "With close reference to...", "Discuss...", "Examine...", "Assess...", "Show how...", "Explain...", "Evaluate...", "Analyse...".
- Essay tasks must carry correct KCSE marks and include expected points, strict marking rubric and grade bands.
- Award marks for content, relevance, correct illustrations, depth of analysis, organisation, language and conclusion. Do not reward unsupported points, invented events or wrong character references.
- Include poetry/ushairi practice where appropriate: persona/nafsi neni, tone/tahakiki hisia, theme/maudhui, imagery/taswira, rhyme/urari, rhythm/mizani, alliteration/takriri, metaphor/sitiari, simile/tashbihi, symbolism/ishara, diction/uteuzi wa maneno, structure/muundo, mood/mandhari ya kihisia, and message/ujumbe.
- For poem or ushairi questions, do not use a tiny two-line snippet. Generate a complete original exam-style passage:
  - English poem: 3-4 stanzas, each with 3-4 lines.
  - Kiswahili ushairi: 3-4 beti, preferably 4 mishororo per ubeti where suitable.
  - Keep it original, age-appropriate and exam-like, then ask interpretation questions from that passage.
- For set-book practice, rotate essay practice, excerpt practice, character analysis, theme analysis, style analysis, context questions, character relationships, plot revision, timed mock, KCSE prediction and random challenge.
- Kiswahili tasks should use Kiswahili instructions and terminology: dondoo, maudhui, wahusika, mbinu, tamathali, mandhari, muundo, mtindo.
- English tasks should use KCSE language: excerpt, context, characterisation, theme, style, tone, irony, conflict, essay.
`
}

export function getSelectedSetBookPrompt(selectedSetBook?: string | null) {
  if (!selectedSetBook) return ''

  const book = KCSE_844_SET_BOOKS.find(item =>
    item.title.toLowerCase() === selectedSetBook.toLowerCase()
  )

  if (!book) {
    return `SELECTED SET BOOK:\n${selectedSetBook}\nUse only this selected book. Do not mix characters, plot, setting or author details with any other text.`
  }

  return `SELECTED SET BOOK:
${book.subject}: ${book.title}${book.author ? ` by ${book.author}` : ''} (${book.genre}).
Hard rule: generate practice only from ${book.title}. Do not mix characters, plot events, settings, themes or author details with any other prescribed text.`
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
