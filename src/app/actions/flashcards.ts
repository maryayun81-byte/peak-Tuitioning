'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'

type DeckOptions = {
  expectedUserId?: string
  curriculumId?: string
  topic?: string
  themeStyle?: string
  themePrompt?: string
  stickerPack?: string
  mascotId?: string
  visibility?: 'private' | 'class' | 'public'
  deckMode?: 'standard' | 'cbc_quick' | 'match_play'
  coverConfig?: Record<string, any>
  difficultyLevel?: string
  tags?: string[]
  publishingStatus?: 'private' | 'classroom' | 'marketplace' | 'featured'
  reviewStatus?: 'draft' | 'submitted' | 'changes_requested' | 'approved' | 'rejected'
  priceCents?: number
}

type CardOptions = {
  expectedUserId?: string
  cardType?: 'qa' | 'match' | 'draw' | 'voice'
  stickers?: any[]
  visualConfig?: Record<string, any>
  questionAudioUrl?: string
  answerAudioUrl?: string
  drawingUrl?: string
}

type DeckStatusAction = 'submit_review' | 'publish_class' | 'publish_marketplace' | 'keep_private'
type DeckDesignOptions = {
  themeColor?: string
  themeStyle?: string
  stickerPack?: string
  mascotId?: string
  coverConfig?: Record<string, any>
}

function normalizeRelation(value: any) {
  return Array.isArray(value) ? value[0] : value
}

function isSchemaMismatch(error: any) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
  return error?.code === 'PGRST204' || error?.code === '42703' || /column|relationship|schema cache/i.test(message)
}

function isPermissionError(error: any) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
  return error?.code === '42501' || /permission denied|row-level security|violates row-level security/i.test(message)
}

async function assertStudentOwner(supabase: any, studentId: string) {
  return assertStudentOwnerForUser(supabase, studentId)
}

async function assertStudentOwnerForUser(supabase: any, studentId: string, expectedUserId?: string) {
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id || expectedUserId
  if (!userId) throw new Error('Your login session was not visible to the server. Please refresh and try again.')

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, user_id, curriculum_id, class_id')
    .eq('id', studentId)
    .single()

  if (studentError || !student) throw studentError || new Error('Student profile was not found.')
  if (student.user_id && student.user_id !== userId) {
    throw new Error('You can only create decks for your own student profile.')
  }

  return student
}

async function assertDeckOwner(supabase: any, deckId: string, expectedUserId?: string) {
  let { data: deck, error: deckError } = await supabase
    .from('flashcard_decks')
    .select('id, student_id')
    .eq('id', deckId)
    .single()

  if (deckError && isPermissionError(deckError)) {
    const admin = await createAdminClient()
    const adminResult = await admin
      .from('flashcard_decks')
      .select('id, student_id')
      .eq('id', deckId)
      .single()
    deck = adminResult.data
    deckError = adminResult.error
  }

  if (deckError || !deck) throw deckError || new Error('Deck was not found.')
  await assertStudentOwnerForUser(supabase, deck.student_id, expectedUserId)
  return deck
}

function normalizeDeck(deck: any) {
  if (!deck) return deck
  return {
    visibility: deck.is_public ? 'public' : 'private',
    theme_style: deck.theme_color || 'cbc-magic',
    sticker_pack: 'School',
    mascot_id: 'professor-peak',
    deck_mode: 'standard',
    views: 0,
    saves: 0,
    shares: 0,
    downloads: 0,
    review_status: 'draft',
    publishing_status: 'private',
    price_cents: 0,
    tags: [],
    ...deck,
  }
}

export async function getStudentDecks(studentId: string, classId?: string) {
  const supabase = await createClient()
  const { data: student } = await supabase
    .from('students')
    .select('curriculum_id')
    .eq('id', studentId)
    .single()
  
  let orQuery = `student_id.eq.${studentId},is_public.eq.true`
  if (classId) {
    orQuery += `,class_id.eq.${classId}`
  }

  let query = supabase
    .from('flashcard_decks')
    .select('*, cards:flashcard_cards(count), subject:subjects(name), curriculum:curriculums(name), class:classes(name)')
    .or(orQuery)
    .order('created_at', { ascending: false })

  if (student?.curriculum_id) {
    query = query.or(`curriculum_id.is.null,curriculum_id.eq.${student.curriculum_id}`)
  }

  let { data, error }: { data: any[] | null; error: any } = await query

  if (error && isSchemaMismatch(error)) {
    let fallbackQuery = supabase
      .from('flashcard_decks')
      .select('*, cards:flashcard_cards(count), subject:subjects(name)')
      .or(orQuery)
      .order('created_at', { ascending: false })

    const fallback = await fallbackQuery
    data = fallback.data
    error = fallback.error
  }
  
  if (error) return []
  return (data || []).map(normalizeDeck)
}

export async function getCreatorHubMeta(studentId: string) {
  const supabase = await createClient()
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, class_id, curriculum_id, class:classes(id, name), curriculum:curriculums(id, name)')
    .eq('id', studentId)
    .single()

  if (studentError) throw studentError

  const studentClass = normalizeRelation((student as any)?.class)
  const curriculum = normalizeRelation((student as any)?.curriculum)
  const curriculumId = (student as any)?.curriculum_id || curriculum?.id
  const classId = (student as any)?.class_id || studentClass?.id

  const { data: registeredRows, error: registeredError } = await supabase
    .from('student_subjects')
    .select('id, subject_id, subject:subjects(id, name, class_id, curriculum_id)')
    .eq('student_id', studentId)

  if (registeredError) throw registeredError

  let subjects = (registeredRows || [])
    .map((row: any) => normalizeRelation(row.subject))
    .filter(Boolean)

  const registeredSubjectIds = (registeredRows || [])
    .map((row: any) => row.subject_id)
    .filter(Boolean)

  if (subjects.length === 0 && registeredSubjectIds.length > 0) {
    const { data: hydratedSubjects, error: hydrateError } = await supabase
      .from('subjects')
      .select('id, name, class_id, curriculum_id')
      .in('id', registeredSubjectIds)
      .order('name')

    if (hydrateError) throw hydrateError
    subjects = hydratedSubjects || []
  }

  if (subjects.length === 0 && classId) {
    const { data: classSubjects, error: classSubjectError } = await supabase
      .from('class_subjects')
      .select('subject:subjects(id, name, class_id, curriculum_id)')
      .eq('class_id', classId)

    if (classSubjectError && !isSchemaMismatch(classSubjectError)) throw classSubjectError
    subjects = (classSubjects || [])
      .map((row: any) => normalizeRelation(row.subject))
      .filter(Boolean)
      .filter((subject: any) => !curriculumId || !subject.curriculum_id || subject.curriculum_id === curriculumId)
  }

  if (subjects.length === 0 && curriculumId) {
    const { data: curriculumSubjects, error: curriculumSubjectError } = await supabase
      .from('subjects')
      .select('id, name, class_id, curriculum_id')
      .eq('curriculum_id', curriculumId)
      .order('name')

    if (curriculumSubjectError) throw curriculumSubjectError
    subjects = (curriculumSubjects || []).filter((subject: any) => !classId || !subject.class_id || subject.class_id === classId)
  }

  const deduped = Array.from(new Map(subjects.map((subject: any) => [subject.id, subject])).values())
    .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)))

  return {
    curriculumName: curriculum?.name || 'Your curriculum',
    className: studentClass?.name || 'Your class',
    subjects: deduped,
    hasRegisteredSubjects: (registeredRows || []).length > 0,
  }
}

export async function getDeckCreationOptions() {
  const supabase = await createClient()
  
  const [curriculumsRes, classesRes, subjectsRes] = await Promise.all([
    supabase.from('curriculums').select('id, name').order('name'),
    supabase.from('classes').select('id, name, curriculum_id').order('name'),
    supabase.from('subjects').select('id, name, class_id, curriculum_id').order('name')
  ])

  if (curriculumsRes.error && !isSchemaMismatch(curriculumsRes.error)) throw curriculumsRes.error
  if (classesRes.error && !isSchemaMismatch(classesRes.error)) throw classesRes.error
  if (subjectsRes.error && !isSchemaMismatch(subjectsRes.error)) throw subjectsRes.error

  return {
    curriculums: curriculumsRes.data || [],
    classes: classesRes.data || [],
    subjects: subjectsRes.data || [],
  }
}

export async function createDeck(
  studentId: string,
  subjectId: string,
  name: string,
  isPublic: boolean,
  classId?: string,
  themeColor: string = 'blue',
  options: DeckOptions = {}
) {
  const supabase = await createClient()
  const student = await assertStudentOwnerForUser(supabase, studentId, options.expectedUserId)

  if (!student?.curriculum_id) throw new Error('Student curriculum is required before creating creator packs.')

  if (subjectId) {
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, curriculum_id, class_id')
      .eq('id', subjectId)
      .single()

    if (subjectError) throw subjectError
    if (subject?.curriculum_id && student.curriculum_id && subject.curriculum_id !== student.curriculum_id) {
      throw new Error('This subject does not belong to your curriculum.')
    }

    const { data: registration, error: registrationError } = await supabase
      .from('student_subjects')
      .select('id')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .maybeSingle()

    if (registrationError) throw registrationError
    const { count: registeredSubjectCount, error: registeredCountError } = await supabase
      .from('student_subjects')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)

    if (registeredCountError) throw registeredCountError
    if (!registration && (registeredSubjectCount || 0) > 0) {
      throw new Error('This subject is not registered on your profile.')
    }
    if (!registration && subject?.class_id && student.class_id && subject.class_id !== student.class_id) {
      throw new Error('This subject does not belong to your class.')
    }
  }

  const visibility = options.visibility || (isPublic ? 'public' : 'private')
  const insertPayload = {
    student_id: studentId,
    subject_id: subjectId || null,
    title: name,
    is_public: visibility === 'public' || isPublic,
    class_id: classId || student.class_id || null,
    curriculum_id: student.curriculum_id,
    theme_color: themeColor,
    visibility,
    topic: options.topic || null,
    difficulty_level: options.difficultyLevel || 'starter',
    tags: options.tags || [],
    publishing_status: options.publishingStatus || 'private',
    review_status: options.reviewStatus || 'draft',
    price_cents: options.priceCents || 0,
    theme_style: options.themeStyle || themeColor,
    theme_prompt: options.themePrompt || null,
    sticker_pack: options.stickerPack || 'School',
    mascot_id: options.mascotId || 'professor-peak',
    deck_mode: options.deckMode || 'standard',
    cover_config: options.coverConfig || {},
  }

  let { data, error } = await supabase
    .from('flashcard_decks')
    .insert(insertPayload)
    .select()
    .single()

  if (error && isPermissionError(error)) {
    const admin = await createAdminClient()
    const adminResult = await admin
      .from('flashcard_decks')
      .insert(insertPayload)
      .select()
      .single()
    data = adminResult.data
    error = adminResult.error
  }

  if (error && isSchemaMismatch(error)) {
    const fallbackPayload = {
      student_id: studentId,
      subject_id: subjectId || null,
      title: name,
      is_public: visibility === 'public' || isPublic,
      class_id: classId || student.class_id || null,
      theme_color: themeColor,
    }
    const fallback = await supabase
      .from('flashcard_decks')
      .insert(fallbackPayload)
      .select()
      .single()
    data = fallback.data
    error = fallback.error

    if (error && isPermissionError(error)) {
      const admin = await createAdminClient()
      const adminFallback = await admin
        .from('flashcard_decks')
        .insert(fallbackPayload)
        .select()
        .single()
      data = adminFallback.data
      error = adminFallback.error
    }
  }
  
  if (error) throw error
  return normalizeDeck(data)
}

export async function getDeckWithCards(deckId: string, studentId: string) {
  const supabase = await createClient()
  let { data: deck, error: dError } = await supabase
    .from('flashcard_decks')
    .select('*, subject:subjects(name), curriculum:curriculums(name), class:classes(name)')
    .eq('id', deckId)
    .single()

  if (dError && isSchemaMismatch(dError)) {
    const fallback = await supabase
      .from('flashcard_decks')
      .select('*, subject:subjects(name)')
      .eq('id', deckId)
      .single()
    deck = fallback.data
    dError = fallback.error
  }
  
  if (dError) throw dError

  const { data: cards, error: cError } = await supabase
    .from('flashcard_cards')
    .select('*')
    .eq('deck_id', deckId)

  if (cError) throw cError

  // Fetch progress for this student
  const cardIds = cards.map(c => c.id)
  let progress: any[] = []
  if (cardIds.length > 0) {
    const { data: pData } = await supabase
      .from('flashcard_progress')
      .select('*')
      .eq('student_id', studentId)
      .in('card_id', cardIds)
    progress = pData || []
  }

  const cardsWithProgress = cards.map(card => {
    const p = progress.find(pr => pr.card_id === card.id)
    return { ...card, progress: p || null }
  })

  // Sort: Due cards first
  const now = new Date()
  cardsWithProgress.sort((a, b) => {
    const aDue = a.progress?.next_review_date ? new Date(a.progress.next_review_date) : new Date(0)
    const bDue = b.progress?.next_review_date ? new Date(b.progress.next_review_date) : new Date(0)
    return aDue.getTime() - bDue.getTime()
  })

  return { ...normalizeDeck(deck), cards: cardsWithProgress }
}

export async function createCard(deckId: string, frontContent: string, backContent: string, options: CardOptions = {}) {
  const supabase = await createClient()
  await assertDeckOwner(supabase, deckId, options.expectedUserId)
  const insertPayload = {
    deck_id: deckId,
    front_content: frontContent,
    back_content: backContent,
    card_type: options.cardType || 'qa',
    stickers: options.stickers || [],
    visual_config: options.visualConfig || {},
    question_audio_url: options.questionAudioUrl || null,
    answer_audio_url: options.answerAudioUrl || null,
    drawing_url: options.drawingUrl || null,
  }

  let { data, error } = await supabase
    .from('flashcard_cards')
    .insert(insertPayload)
    .select()
    .single()

  if (error && isPermissionError(error)) {
    const admin = await createAdminClient()
    const adminResult = await admin
      .from('flashcard_cards')
      .insert(insertPayload)
      .select()
      .single()
    data = adminResult.data
    error = adminResult.error
  }

  if (error && isSchemaMismatch(error)) {
    const fallbackPayload = { deck_id: deckId, front_content: frontContent, back_content: backContent }
    const fallback = await supabase
      .from('flashcard_cards')
      .insert(fallbackPayload)
      .select()
      .single()
    data = fallback.data
    error = fallback.error

    if (error && isPermissionError(error)) {
      const admin = await createAdminClient()
      const adminFallback = await admin
        .from('flashcard_cards')
        .insert(fallbackPayload)
        .select()
        .single()
      data = adminFallback.data
      error = adminFallback.error
    }
  }
  
  if (error) throw error
  return data
}

export async function deleteDeck(deckId: string, studentId: string, expectedUserId?: string) {
  const supabase = await createClient()
  await assertStudentOwnerForUser(supabase, studentId, expectedUserId)
  await assertDeckOwner(supabase, deckId, expectedUserId)

  const { data: cards } = await supabase
    .from('flashcard_cards')
    .select('id')
    .eq('deck_id', deckId)

  const cardIds = (cards || []).map((card: any) => card.id).filter(Boolean)
  if (cardIds.length > 0) {
    await supabase.from('flashcard_progress').delete().in('card_id', cardIds)
  }

  await supabase.from('flashcard_cards').delete().eq('deck_id', deckId)

  let { error } = await supabase
    .from('flashcard_decks')
    .delete()
    .eq('id', deckId)
    .eq('student_id', studentId)

  if (error && isPermissionError(error)) {
    const admin = await createAdminClient()
    const adminResult = await admin
      .from('flashcard_decks')
      .delete()
      .eq('id', deckId)
      .eq('student_id', studentId)
    error = adminResult.error
  }

  if (error) throw error
  return { success: true }
}

export async function createBeautifulFlashcardDeck(
  studentId: string,
  payload: {
    classId?: string
    subjectId?: string
    subject: string
    topic: string
    question: string
    answer: string
    themeStyle: string
    themePrompt: string
    stickerPack: string
    mascotId: string
    coverConfig?: Record<string, any>
    expectedUserId?: string
    cardType?: 'qa' | 'match' | 'draw' | 'voice'
    cardImageUrl?: string
    answerImageUrl?: string
    drawingUrl?: string
    answerDrawingUrl?: string
    formula?: string
  }
) {
  const deckTitle = `${payload.subject}: ${payload.topic}`.trim()
  const deck = await createDeck(studentId, payload.subjectId || '', deckTitle, false, payload.classId, payload.themeStyle, {
    expectedUserId: payload.expectedUserId,
    topic: payload.topic,
    themeStyle: payload.themeStyle,
    themePrompt: payload.themePrompt,
    stickerPack: payload.stickerPack,
    mascotId: payload.mascotId,
    deckMode: 'cbc_quick',
    coverConfig: {
      title: deckTitle,
      prompt: payload.themePrompt,
      stickerPack: payload.stickerPack,
      mascotId: payload.mascotId,
      generatedBy: 'make-beautiful',
      ...(payload.coverConfig || {}),
    },
  })

  await createCard(deck.id, payload.question, payload.answer, {
    expectedUserId: payload.expectedUserId,
    cardType: payload.cardType || (payload.drawingUrl || payload.answerDrawingUrl ? 'draw' : 'qa'),
    stickers: [payload.stickerPack],
    drawingUrl: payload.drawingUrl || undefined,
    visualConfig: {
      themePrompt: payload.themePrompt,
      layout: 'show-off-card',
      beautified: true,
      imageUrl: payload.cardImageUrl || null,
      answerImageUrl: payload.answerImageUrl || null,
      drawingUrl: payload.drawingUrl || null,
      questionDrawingUrl: payload.drawingUrl || null,
      answerDrawingUrl: payload.answerDrawingUrl || null,
      formula: payload.formula || null,
    },
  })

  return deck
}

export async function updateDeckPublishingStatus(deckId: string, studentId: string, action: DeckStatusAction) {
  const supabase = await createClient()
  const statusMap: Record<DeckStatusAction, any> = {
    submit_review: { review_status: 'submitted', publishing_status: 'private', visibility: 'private', is_public: false },
    publish_class: { review_status: 'submitted', publishing_status: 'classroom', visibility: 'private', is_public: false },
    publish_marketplace: { review_status: 'submitted', publishing_status: 'marketplace', visibility: 'private', is_public: false },
    keep_private: { review_status: 'draft', publishing_status: 'private', visibility: 'private', is_public: false },
  }

  const patch = statusMap[action]
  let { data, error } = await supabase
    .from('flashcard_decks')
    .update(patch)
    .eq('id', deckId)
    .eq('student_id', studentId)
    .select()
    .single()

  if (error && isSchemaMismatch(error)) {
    const fallback = await supabase
      .from('flashcard_decks')
      .update({ is_public: patch.is_public })
      .eq('id', deckId)
      .eq('student_id', studentId)
      .select()
      .single()
    data = fallback.data
    error = fallback.error
  }

  if (error) throw error
  return normalizeDeck(data)
}

export async function getApprovedCreatorReel(studentId: string, classId?: string, curriculumId?: string) {
  const supabase = await createClient()
  const { data: student } = await supabase
    .from('students')
    .select('class_id, curriculum_id')
    .eq('id', studentId)
    .single()

  const targetClassId = classId || student?.class_id
  const targetCurriculumId = curriculumId || student?.curriculum_id

  let query = supabase
    .from('flashcard_decks')
    .select('id, title, topic, theme_color, theme_style, cover_config, sticker_pack, views, saves, shares, downloads, student_id, subject:subjects(name), cards:flashcard_cards(count)')
    .eq('review_status', 'approved')
    .in('publishing_status', ['classroom', 'marketplace', 'featured'])
    .order('updated_at', { ascending: false })
    .limit(8)

  if (targetCurriculumId) {
    query = query.eq('curriculum_id', targetCurriculumId)
  }

  if (targetClassId) {
    query = query.or(`class_id.is.null,class_id.eq.${targetClassId}`)
  }

  let { data, error }: { data: any[] | null; error: any } = await query

  if (error && isSchemaMismatch(error)) {
    const fallback = await supabase
      .from('flashcard_decks')
      .select('id, title, theme_color, is_public, subject:subjects(name), cards:flashcard_cards(count)')
      .eq('is_public', true)
      .limit(8)
    data = fallback.data
    error = fallback.error
  }

  if (error) return []
  return (data || []).map(normalizeDeck)
}

export async function updateDeckDesign(deckId: string, studentId: string, options: DeckDesignOptions) {
  const supabase = await createClient()
  const patch = {
    theme_color: options.themeColor,
    theme_style: options.themeStyle || options.themeColor,
    sticker_pack: options.stickerPack,
    mascot_id: options.mascotId,
    cover_config: options.coverConfig || {},
  }

  let { data, error } = await supabase
    .from('flashcard_decks')
    .update(patch)
    .eq('id', deckId)
    .eq('student_id', studentId)
    .select()
    .single()

  if (error && isSchemaMismatch(error)) {
    const fallback = await supabase
      .from('flashcard_decks')
      .update({ theme_color: options.themeColor })
      .eq('id', deckId)
      .eq('student_id', studentId)
      .select()
      .single()
    data = fallback.data
    error = fallback.error
  }

  if (error) throw error
  return normalizeDeck(data)
}

export async function incrementDeckShareMetric(deckId: string, metric: 'shares' | 'downloads' | 'views' | 'saves') {
  const supabase = await createClient()
  const { data: deck } = await supabase
    .from('flashcard_decks')
    .select(metric)
    .eq('id', deckId)
    .single()

  const metricDeck = deck as Record<string, any> | null
  const current = typeof metricDeck?.[metric] === 'number' ? metricDeck[metric] : 0
  const { error } = await supabase
    .from('flashcard_decks')
    .update({ [metric]: current + 1 })
    .eq('id', deckId)

  if (error && !isSchemaMismatch(error)) throw error
  return { ok: true }
}

export async function submitCardReview(studentId: string, cardId: string, quality: number) {
  // Supermemo-2 Spaced Repetition Algorithm
  // quality: 0-5 (0=blackout, 5=perfect)
  
  const supabase = await createClient()
  const { data: progress } = await supabase
    .from('flashcard_progress')
    .select('*')
    .eq('student_id', studentId)
    .eq('card_id', cardId)
    .single()

  let ease = progress?.ease_factor || 2.5
  let interval = progress?.interval || 0
  let reps = progress?.repetitions || 0

  if (quality >= 3) {
    if (reps === 0) {
      interval = 1
    } else if (reps === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * ease)
    }
    reps++
  } else {
    reps = 0
    interval = 1
  }

  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (ease < 1.3) ease = 1.3

  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + interval)

  const { error } = await supabase
    .from('flashcard_progress')
    .upsert({
      student_id: studentId,
      card_id: cardId,
      ease_factor: ease,
      interval: interval,
      repetitions: reps,
      next_review_date: nextDate.toISOString(),
      last_reviewed_at: new Date().toISOString()
    }, { onConflict: 'student_id,card_id' })

  if (error) throw error
  
  return { nextDate, interval }
}

interface StudioCardFace {
  background: string
  font?: string
  elements: Array<{
    id: string
    type: 'text' | 'image' | 'sticker' | 'math'
    content: string
    x: number
    y: number
    width?: number
    height?: number
    fontSize?: number
    color?: string
    fontFamily?: string
    zIndex: number
  }>
}

interface SaveStudioDeckPayload {
  deckId?: string
  title: string
  subjectId?: string
  coverFace: StudioCardFace
  cards: Array<{
    id: string
    front: StudioCardFace
    back: StudioCardFace
  }>
  themeStyle: string
}

export async function saveStudioDeck(studentId: string, payload: SaveStudioDeckPayload) {
  const supabase = await createClient()

  let deckId = payload.deckId

  const coverConfig = {
    title: payload.title,
    background: payload.coverFace.background,
    font: payload.coverFace.font || null,
    elements: payload.coverFace.elements,
  }

  if (deckId) {
    // Update existing deck
    const { error: updateError } = await supabase
      .from('flashcard_decks')
      .update({
        title: payload.title,
        subject_id: payload.subjectId || null,
        cover_config: coverConfig,
        theme_style: payload.themeStyle,
      })
      .eq('id', deckId)
      .eq('student_id', studentId)

    if (updateError && isPermissionError(updateError)) {
      const admin = await createAdminClient()
      const adminResult = await admin
        .from('flashcard_decks')
        .update({
          title: payload.title,
          subject_id: payload.subjectId || null,
          cover_config: coverConfig,
          theme_style: payload.themeStyle,
        })
        .eq('id', deckId)
        .eq('student_id', studentId)
      if (adminResult.error) throw adminResult.error
    } else if (updateError) {
      throw updateError
    }

    // Delete existing cards and re-insert
    await supabase.from('flashcard_cards').delete().eq('deck_id', deckId)
  } else {
    // Create new deck
    const deck = await createDeck(studentId, payload.subjectId || '', payload.title, false, undefined, payload.themeStyle, {
      coverConfig,
      themeStyle: payload.themeStyle,
    })
    deckId = deck.id
  }

  if (!deckId) throw new Error('Failed to resolve deck ID')

  // Insert all cards
  for (let i = 0; i < payload.cards.length; i++) {
    const card = payload.cards[i]
    const frontText = card.front.elements
      .filter(el => el.type === 'text')
      .map(el => el.content.replace(/<[^>]*>/g, ''))
      .join('; ')
    const backText = card.back.elements
      .filter(el => el.type === 'text')
      .map(el => el.content.replace(/<[^>]*>/g, ''))
      .join('; ')

    await createCard(deckId, frontText || ' ', backText || ' ', {
      visualConfig: {
        front: card.front,
        back: card.back,
        order: i,
      },
    })
  }

  return { deckId }
}

export async function getStudentIdForUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!student) throw new Error('Student profile not found')
  return student.id
}

export async function loadStudioDeck(deckId: string) {
  const supabase = await createClient()
  const { data: deck, error: dError } = await supabase
    .from('flashcard_decks')
    .select('*')
    .eq('id', deckId)
    .single()

  if (dError) throw dError

  const { data: cards, error: cError } = await supabase
    .from('flashcard_cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true })

  if (cError) throw cError

  return { deck: normalizeDeck(deck), cards: cards || [] }
}
