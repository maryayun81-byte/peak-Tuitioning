'use server'

import { createClient } from '../../lib/supabase/server'
import { callGroqChat, hasGroqToken } from '../../lib/groq-chat'
import { callGeminiChat, hasGeminiToken } from '../../lib/gemini-chat'
import { callHuggingFaceChat, hasHuggingFaceToken } from '../../lib/huggingface-chat'
import { callGitHubModelsChat, hasGitHubModelsToken } from '../../lib/github-models-chat'
import { sanitizeQuestions, filterToRegisteredSubjects, getFallbackQuestions, normaliseText, questionFingerprint } from '../../lib/brainGymUtils'
import type { BrainGymQuestion, VisualQuestionScene } from '../../lib/brainGymUtils'
import { getBrainGymAdaptiveProfile, pickBrainGymDifficultyMix } from '../../lib/brainGym/adaptiveProfile'
import { getCbcLanguagePrompt, getLanguageSetBookPrompt, getSelectedSetBookPrompt } from '../../lib/brainGym/setBooks'

type CurriculumType = 'kcse' | 'kjsea' | 'kpsea' | 'unknown'
type BrainGymTrainingMode =
  | 'mixed'
  | 'setbook'
  | 'excerpt'
  | 'essay'
  | 'poetry'
  | 'ushairi'
  | 'biology_essay'
  | 'structured'
  | 'character_analysis'
  | 'theme_analysis'
  | 'style_analysis'
  | 'context_questions'
  | 'character_relationships'
  | 'plot_revision'
  | 'timed_mock'
  | 'kcse_prediction'
  | 'random_challenge'
  | 'cbc_visual_duel'

type QuestionStyle =
  | 'calculation'
  | 'graph_interpretation'
  | 'experiment_based'
  | 'common_mistake_correction'
  | 'application_scenario'
  | 'data_response'
  | 'concept_comparison'
  | 'prediction'
  | 'reason_giving'
  | 'exam_style_recall'
  | 'excerpt_analysis'
  | 'essay_response'
  | 'functional_writing'

export type PeakCoachMasterySignal = {
  curriculum?: string
  subject?: string
  topic?: string
  subtopic?: string
  syllabusOutcome?: string
  marksAvailable?: number
  marksEarned?: number
}

function buildOutcomeLabel(signal: PeakCoachMasterySignal) {
  return (signal.syllabusOutcome || [signal.topic, signal.subtopic].filter(Boolean).join(': ') || signal.subject || 'General mastery').slice(0, 220)
}

async function updateStudentSyllabusOutcomeMastery(supabase: any, studentId: string, signals: PeakCoachMasterySignal[]) {
  const cleanSignals = signals
    .map(signal => ({
      ...signal,
      syllabusOutcome: buildOutcomeLabel(signal),
      marksAvailable: Math.max(1, Number(signal.marksAvailable ?? 1)),
      marksEarned: Math.max(0, Number(signal.marksEarned ?? 0)),
    }))
    .filter(signal => signal.subject && signal.syllabusOutcome)

  if (cleanSignals.length === 0) return

  for (const signal of cleanSignals) {
    try {
      const { data: existing } = await supabase
        .from('student_syllabus_outcome_mastery')
        .select('attempts, marks_available, marks_earned')
        .eq('student_id', studentId)
        .eq('subject', signal.subject)
        .eq('syllabus_outcome', signal.syllabusOutcome)
        .maybeSingle()

      const attempts = Number(existing?.attempts || 0) + 1
      const marksAvailable = Number(existing?.marks_available || 0) + signal.marksAvailable
      const marksEarned = Number(existing?.marks_earned || 0) + Math.min(signal.marksEarned, signal.marksAvailable)
      const masteryEstimate = marksAvailable > 0 ? Math.max(0, Math.min(1, marksEarned / marksAvailable)) : 0

      await supabase
        .from('student_syllabus_outcome_mastery')
        .upsert({
          student_id: studentId,
          curriculum: signal.curriculum || 'Kenyan curriculum',
          subject: signal.subject,
          syllabus_outcome: signal.syllabusOutcome,
          attempts,
          marks_available: marksAvailable,
          marks_earned: marksEarned,
          mastery_estimate: masteryEstimate,
          last_seen_at: new Date().toISOString(),
        }, { onConflict: 'student_id,subject,syllabus_outcome' })
    } catch (error: any) {
      if (!/student_syllabus_outcome_mastery|schema cache|Could not find the table/i.test(error?.message || '')) {
        console.error('[PeakCoachMastery] skipped:', error?.message)
      }
      return
    }
  }
}

export async function recordPeakCoachMasterySignals(studentId: string, signals: PeakCoachMasterySignal[]) {
  const supabase = await createClient()
  await updateStudentSyllabusOutcomeMastery(supabase, studentId, signals)
}

function cleanJsonResponse(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return text

  let json = match[0]
  json = json.replace(/,\s*$/, '').replace(/,\s*(\]|\})/g, '$1')

  const openBraces = (json.match(/\{/g) || []).length - (json.match(/\}/g) || []).length
  const openBrackets = (json.match(/\[/g) || []).length - (json.match(/\]/g) || []).length

  for (let i = 0; i < openBrackets; i++) json += ']'
  for (let i = 0; i < openBraces; i++) json += '}'

  return json
}

function parseJsonWithRepair(text: string) {
  const cleaned = cleanJsonResponse(text)
  const attempts = [
    cleaned,
    cleaned
      .replace(/,\s*(\]|\})/g, '$1')
      .replace(/(["\]\}\d])\s+(?="[\w-]+"\s*:)/g, '$1,')
      .replace(/\}\s*\{/g, '},{')
      .replace(/\]\s*(?="[\w-]+"\s*:)/g, '],')
      .replace(/\}\s*(?="[\w-]+"\s*:)/g, '},'),
  ]

  let lastError: any
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt)
    } catch (error) {
      lastError = error
    }
  }

  const questionIndex = cleaned.search(/"questions"\s*:/)
  const arrayStart = cleaned.indexOf('[', questionIndex)
  if (questionIndex >= 0 && arrayStart >= 0) {
    const items: string[] = []
    let depth = 0
    let start = -1
    let inString = false
    let escaped = false

    for (let i = arrayStart + 1; i < cleaned.length; i++) {
      const char = cleaned[i]
      if (inString) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === '"') inString = false
        continue
      }
      if (char === '"') {
        inString = true
        continue
      }
      if (char === '{') {
        if (depth === 0) start = i
        depth += 1
      } else if (char === '}') {
        depth -= 1
        if (depth === 0 && start >= 0) {
          items.push(cleaned.slice(start, i + 1))
          start = -1
        }
      }
    }

    const questions = items
      .map(item => {
        try { return JSON.parse(item.replace(/,\s*(\]|\})/g, '$1')) } catch { return null }
      })
      .filter(Boolean)

    if (questions.length > 0) return { questions }
  }

  throw lastError
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      error => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

function detectCurriculumType(curriculumName: string, className: string): CurriculumType {
  const n = `${curriculumName} ${className}`.toLowerCase()

  if (
    n.includes('kpsea') ||
    n.includes('grade 6') ||
    n.includes('grade 5') ||
    n.includes('grade 4') ||
    n.includes('grade 3') ||
    n.includes('grade 2') ||
    n.includes('grade 1') ||
    n.includes('primary') ||
    n.includes('std') ||
    n.includes('standard') ||
    n.includes('pre-primary') ||
    n.includes('pp1') ||
    n.includes('pp2')
  ) return 'kpsea'

  if (
    n.includes('kjsea') ||
    n.includes('grade 7') ||
    n.includes('grade 8') ||
    n.includes('grade 9') ||
    n.includes('junior secondary') ||
    n.includes('jss')
  ) return 'kjsea'

  if (
    n.includes('kcse') ||
    n.includes('8-4-4') ||
    n.includes('844') ||
    n.includes('form')
  ) return 'kcse'

  return 'unknown'
}

function getFormNumber(className: string): number {
  const m = className.toLowerCase().match(/form\s*(\d)/)
  return m ? parseInt(m[1]) : 0
}

function getGradeNumber(className: string): number {
  const m = className.toLowerCase().match(/grade\s*(\d)/)
  return m ? parseInt(m[1]) : 0
}

function getFallbackSubjectsForLearner(curriculumType: CurriculumType, className: string): string[] {
  if (curriculumType === 'kpsea') {
    return ['Mathematics-CBC', 'English-CBC', 'Kiswahili-CBC', 'Science & Technology', 'Agriculture & Nutrition', 'Social Studies']
  }

  if (curriculumType === 'kjsea') {
    return ['Mathematics-CBC', 'English-CBC', 'Kiswahili-CBC', 'Integrated Science', 'Social Studies', 'Pre-Technical Studies', 'Agriculture & Nutrition']
  }

  if (curriculumType === 'kcse') {
    return ['Mathematics', 'English', 'Kiswahili']
  }

  const name = className.toLowerCase()
  if (name.includes('grade')) return ['Mathematics-CBC', 'English-CBC', 'Kiswahili-CBC', 'Integrated Science', 'Social Studies']
  return ['Mathematics', 'English', 'Kiswahili']
}

function subjectLooksCbc(subject: string) {
  return /cbc|kpsea|kjsea|integrated|science\s*&\s*technology|pre-technical|agriculture\s*&\s*nutrition/i.test(subject)
}

function resolveTopicKey(subject: string, keys: string[]) {
  const normalizedSubject = normaliseText(subject)
  const cbcPreferred: Record<string, string> = {
    mathematics: 'Mathematics (CBC)',
    mathematicscbc: 'Mathematics (CBC)',
    englishcbc: 'English (CBC)',
    kiswahilicbc: 'Kiswahili (CBC)',
    agricultureandnutrition: 'Agriculture & Nutrition',
    agriculturenutrition: 'Agriculture & Nutrition',
    pretechnicalstudies: 'Pre-Technical Studies',
  }

  if (subjectLooksCbc(subject)) {
    const preferred = cbcPreferred[normalizedSubject]
    if (preferred && keys.includes(preferred)) return preferred
    const cbcKey = keys.find(key => {
      const normalizedKey = normaliseText(key)
      return normalizedKey.includes('cbc') && (
        normalizedKey.includes(normalizedSubject.replace(/cbc/g, '')) ||
        normalizedSubject.includes(normalizedKey.replace(/cbc/g, ''))
      )
    })
    if (cbcKey) return cbcKey
  }

  return keys.find(key => {
    const a = normaliseText(key)
    const b = normalizedSubject
    return a === b || a.includes(b) || b.includes(a)
  })
}

const QUESTION_STYLES: QuestionStyle[] = [
  'calculation',
  'graph_interpretation',
  'experiment_based',
  'common_mistake_correction',
  'application_scenario',
  'data_response',
  'concept_comparison',
  'prediction',
  'reason_giving',
  'exam_style_recall',
  'excerpt_analysis',
  'essay_response',
  'functional_writing',
]

const KCSE_PRIORITY_TOPICS: Record<string, string[]> = {
  Chemistry: [
    'Atomic Structure',
    'Chemical Bonding and Structure',
    'Structure and Bonding',
    'Formulae and Equations',
    'Mole Concept',
    'Electrochemistry',
    'Reaction Rates',
    'Chemical Equilibrium',
    'Organic Chemistry',
    'Enthalpy Changes',
    'Extraction of Metals',
    'Industrial Chemistry',
    'Salts',
    'Acids, Bases and Indicators',
    'Carbon and its Compounds',
    'Periodic Table',
  ],
  Mathematics: [
    'Indices',
    'Logarithms',
    'Quadratic Expressions and Equations',
    'Linear Inequalities',
    'Simultaneous Equations',
    'Trigonometry',
    'Matrices',
    'Vectors',
    'Calculus',
    'Differentiation',
    'Nature of Turning Points',
    'Area Under a Curve',
    'Probability',
    'Statistics',
    'Commercial Arithmetic',
    'Transformations',
    'Circle Theorems',
    'Linear Programming',
    'Longitudes and Latitudes',
    'Graphs',
  ],
  Biology: [
    'Genetics',
    'Ecology',
    'Reproduction',
    'Homeostasis',
    'Excretion',
    'Transport',
    'Respiration',
    'Photosynthesis',
    'Nervous Coordination',
  ],
  Physics: [
    'Electricity',
    'Waves',
    'Light',
    'Forces',
    'Pressure',
    'Motion',
    'Work Energy Power',
    'Magnetism',
    'Electromagnetic Induction',
    'Radioactivity',
  ],
  English: [
    'Grammar',
    'Functional Writing',
    'Comprehension',
    'Summary',
    'Poetry',
    'Poetry Analysis',
    'Oral Poetry',
    'Set Texts',
    'Fathers of Nations',
    'The Samaritan',
    'A Silent Song and Other Stories',
    'Artist of the Floating World',
    'A Parliament of Owls',
    'Oral Skills',
  ],
  Kiswahili: [
    'Sarufi',
    'Ufahamu',
    'Muhtasari',
    'Insha',
    'Ushairi',
    'Uchanganuzi wa Ushairi',
    'Fasihi Simulizi',
    'Fasihi Andishi',
    'Nguu za Jadi',
    'Bembea',
    'Mapambazuko ya Machweo na Hadithi Nyingine',
    'Methali na Semi',
  ],
  Geography: [
    'Map Work',
    'Weather and Climate',
    'Vegetation',
    'Soil Formation',
    'Internal Landforming Processes',
    'Altitude and Relief',
    'Glaciation',
    'Population',
    'Urbanisation',
    'Agriculture',
    'Wildlife and Tourism',
    'Environmental Management',
    'GIS',
  ],
  'History & Government': [
    'The Constitution of Kenya',
    'Devolution',
    'Nationalism and Independence',
    'World Wars',
    'Government Structures',
    'International Relations',
    'Trade',
    'Rights and Responsibilities',
  ],
  'Business Studies': [
    'Demand and Supply',
    'Money and Banking',
    'Financial Statements',
    'Entrepreneurship',
    'Forms of Business Units',
    'Taxation',
    'Consumer Protection',
    'National Income',
  ],
  'CRE': [
    'Sinai Covenant',
    'Amos and Social Justice',
    'Jeremiah and Suffering',
    'Miracles of Jesus',
    'The Passion and Resurrection',
    'The Early Church in Acts',
    'Christian Ethics',
    'Marriage and Family',
  ],
  'IRE': [
    'Pillars of Iman and Islam',
    'Quran Revelation',
    'Devotions (Salah, Sawm, Zakah, Hajj)',
    'Sirah of the Prophet',
    'Islamic Law (Shariah)',
    'Marriage and Family',
    'Islamic Ethics',
    'Muamalat',
  ],
  Agriculture: [
    'Soil Fertility',
    'Crop Production',
    'Livestock Breeds',
    'Animal Nutrition',
    'Livestock Diseases',
    'Farm Accounts',
    'Agribusiness',
    'Soil Conservation',
  ],
  'Computer Studies': [
    'Data Representation',
    'Logic Gates',
    'Programming Concepts',
    'Algorithms and Flowcharts',
    'Networking',
    'Data Communication',
    'Internet Technologies',
    'System Development',
  ],
}

const SUBJECT_TOPICS: Record<string, string> = {
  Chemistry: `
KCSE Chemistry mastery scope:
Form 1: introduction to chemistry, laboratory safety, apparatus and uses, Bunsen burner, methods of separation, classification of substances, acids/bases/indicators, air and combustion, water and hydrogen, atom structure, periodic table introduction, chemical families, formulae and equations.
Form 2: structure and bonding, alkali metals, alkaline earth metals, halogens, nitrogen family, oxygen family, carbon compounds, oxides of carbon, organic chemistry introduction, hydrocarbons, salts, electric current on substances, electrolysis, mole concept and chemical calculations.
Form 3: gas laws, mole and Avogadro law, organic chemistry II, alkanes, alkenes, alkynes, alcohols, carboxylic acids, esters, nitrogen/sulphur/chlorine compounds, acids bases and salts II, solubility and crystallisation, energy changes, reaction rates, reversible reactions and equilibrium.
Form 4: electrochemistry, redox reactions, electrochemical cells, electrolysis applications, metals and extraction of sodium/aluminium/zinc/iron/copper, organic chemistry III, polymers, radioactivity, Haber/Contact/Ostwald/Solvay processes, environmental chemistry, water pollution, air pollution and practical chemistry skills.
Question angles: experiments, observations, bonding diagrams described in text, equations, calculations, graph interpretation, industrial conditions, prediction and explanation.
Hard syllabus guard: do not ask equilibrium constant expression/value questions; do not ask molecular potential-energy graph questions; do not ask vague "what happens if temperature/pressure changes" unless the balanced equation and whether the forward reaction is exothermic/endothermic or gas mole counts are provided. Industrial chemistry must ask KCSE details: raw materials, catalyst, optimum temperature/pressure, conditions, yield compromise, products, observations, reagents and equations.
`,

  Mathematics: `
KCSE Mathematics mastery scope:
Form 1: natural numbers, factors, divisibility tests, GCD, LCM, integers, fractions, decimals, squares/square roots, algebraic expressions, rates/ratio/proportion/percentages, length, area, volume/capacity, mass/density/weight, time, linear equations, commercial arithmetic, coordinates and graphs, angles and plane figures, constructions, scale drawing, common solids, reflection/congruence, rotation, statistics and simple probability.
Form 2: cubes and cube roots, reciprocals, indices and logarithms, equations and straight lines, reflection/congruence, rotation, similarity/enlargement, Pythagoras theorem, trigonometry, area of triangles/polygons/circles, volume and surface area of solids, quadratic expressions, linear inequalities, linear motion, bearing, vectors, statistics, probability, commercial arithmetic, hire purchase, taxation, simple interest and compound interest.
Form 3: quadratic equations, approximations and errors, trigonometry II, further logarithms, surds, commercial arithmetic II, circles/chords/tangents, matrices, formulae and variations, sequences and series, vectors II, binomial expansion, probability II, statistics II, earth geometry, longitudes and latitudes, linear programming, loci, similarity and enlargement II.
Form 4: matrices and transformations, statistics III, loci III, trigonometry III, three-dimensional geometry, longitudes and latitudes II, linear programming II, differentiation, applications of differentiation, integration, area under curves, trapezium rule, vectors III, probability III, commercial arithmetic III, compound interest, depreciation, annuities, trial and improvement, graphical methods.
Question angles: multi-step calculations, proof, table completion, graph drawing, interpretation, word problems, optimisation, exact KCSE-style reasoning.
Hard syllabus guard: do not generate trigonometric calculus such as differentiating x^2 sin x, product rule with sin/cos, or derivatives of trigonometric functions. KCSE calculus should focus on polynomial functions, gradients, tangents, normals, rates of change and turning points. Do not generate 3D vector questions using k components such as 2i + 3j - 4k; use KCSE position vectors, column vectors, magnitude in 2D, ratio and geometry-style vector problems.
Statistics engine:
- Before generating a statistics question, validate curriculum -> class -> paper -> topic -> subtopic -> question type -> required tools.
- Form 3 statistics may test frequency tables, grouped/ungrouped data, mean, median, mode, modal class, range, frequency polygons, bar graphs, pie charts, histograms, ogives, graph interpretation, construction of frequency tables and real Kenyan school/agriculture/business/rainfall/temperature/population data.
- Form 4 statistics may test grouped frequency tables, mean, median, modal class, variance, standard deviation, quartiles, quartile deviation, interquartile range, percentiles, deciles, cumulative frequency, ogives, histograms, frequency polygons, comparison and interpretation of large data sets.
- Never ask "What is mean?", "What is variance?", "What is standard deviation?" or tiny isolated data questions for Form 3/4.
- Use realistic data tables and KCSE subparts (a), (b), (c), (d) with mark allocation whenever answerMode is essay/structured.
- For graph questions, ask the learner to construct the graph from data: histogram, ogive, cumulative frequency curve, frequency polygon, bar graph, pie chart or scatter graph. Include scale/axes expectations in the rubric.
`,

  Biology: `
KCSE Biology mastery scope:
Form 1: introduction to biology, classification I, the cell, cell physiology, nutrition in plants, nutrition in animals, transport in plants and animals, gaseous exchange and respiration.
Form 2: excretion and homeostasis, classification II, ecology, reproduction in plants, reproduction in animals, growth and development, support and movement in plants, support and movement in animals.
Form 3: coordination and response, nervous coordination, endocrine system, sense organs, tropisms and tactic responses, reproduction II, fertilisation, pregnancy and birth, genetics, variation and evolution.
Form 4: genetics II, inheritance, monohybrid inheritance, sex-linked traits, mutation, evolution II, ecology II, population studies, human impact on environment, pollution, conservation, practical skills, food tests, microscopy, field work, biological drawings and data interpretation.
Question angles: diagrams, experiments, adaptations, processes, comparisons, graph/data interpretation and explanation.
`,

  Physics: `
KCSE Physics mastery scope:
Form 1: introduction to physics, measurement, force, pressure, particulate nature of matter, thermal expansion, heat transfer, rectilinear propagation of light, electrostatics I, cells and simple circuits.
Form 2: magnetism, measurement II, turning effect of a force, equilibrium and centre of gravity, reflection at curved surfaces, magnetic effect of electric current, Hooke law, waves I, sound, fluid flow, machines, work/energy/power.
Form 3: linear motion, refraction of light, Newton laws of motion, friction, circular motion, floating and sinking, thermal effects, gas laws, current electricity, quantity of heat, waves II and electromagnetic spectrum.
Form 4: thin lenses, uniform circular motion, simple harmonic motion, electromagnetic induction, mains electricity, cathode rays, X-rays, photoelectric effect, radioactivity, electronics, semiconductors, logic gates, practical physics skills, graph work and error analysis.
Question angles: calculations, units, graphs, circuits, ray diagrams, apparatus, laws and real-life applications.
`,

  English: `
KCSE English mastery scope:
Form 1: listening and speaking, pronunciation, stress and intonation, listening comprehension, grammar, parts of speech, nouns, pronouns, verbs, adjectives, adverbs, prepositions, conjunctions, sentence structure, punctuation, reading comprehension, intensive/extensive reading, functional writing, personal writing, composition writing, oral literature introduction, poetry introduction and set book introduction.
Form 2: listening and speaking II, oral narratives, proverbs, riddles, tongue twisters, songs, grammar II, tenses, active/passive voice, direct/indirect speech, clauses, phrases, sentence patterns, comprehension II, summary writing, functional writing II, letters, reports, notices, speeches, narrative/descriptive writing, poetry II, drama and novel study.
Form 3: listening and speaking III, debate, interviews, public speaking, grammar III, conditional sentences, relative clauses, inversion, concord, sentence transformation, comprehension III, summary III, oral literature III, poetry analysis, stylistic devices, essay writing, argumentative writing, imaginative composition, functional writing III, set texts: novel/play/short stories.
Form 4: listening and speaking IV, advanced oral skills, grammar revision, error correction, sentence transformation, comprehension mastery, summary mastery, literary appreciation, poetry mastery, oral literature mastery, essay writing mastery, functional writing mastery, KCSE paper practice, set book revision, character analysis, themes, style, plot and context questions.
Question angles: sentence correction, best option, tone, inference, register, functional writing errors, literary analysis.
`,

  Kiswahili: `
KCSE Kiswahili mastery scope:
Kidato cha 1: kusikiliza na kuzungumza, matamshi bora, salamu, maagizo, sarufi, nomino, viwakilishi, vivumishi, vitenzi, vielezi, viunganishi, vihusishi, sentensi, ufahamu, kusoma kwa sauti/kimya, insha za kawaida, barua ya kirafiki, fasihi simulizi, methali, vitendawili, nyimbo, hadithi na ushairi wa awali.
Kidato cha 2: mazungumzo, midahalo, majadiliano, sarufi II, nyakati, hali, ngeli za nomino, upatanisho wa kisarufi, ukanushaji, usemi halisi na taarifa, ufahamu II, ufupisho, insha II, barua rasmi, ripoti, hotuba, matangazo, fasihi simulizi II, ngano, miviga, soga, vitendawili, ushairi II, tamthilia na riwaya.
Kidato cha 3: kusikiliza na kuzungumza III, mahojiano, mjadala, uwasilishaji, sarufi III, sentensi changamano, virai, vishazi, uakifishaji, msamiati, rejesta, ufahamu III, ufupisho III, insha za hoja/maelezo/masimulizi, barua rasmi zaidi, kumbukumbu, risala, fasihi andishi, riwaya, tamthilia, hadithi fupi, ushairi, wahusika, dhamira, maudhui na mbinu za lugha.
Kidato cha 4: marudio ya sarufi, ngeli zote, upatanisho, mnyambuliko wa vitenzi, ubadilishaji wa sentensi, usemi halisi na taarifa, ukanushaji, rejesta, misemo, nahau, methali, ufahamu wa KCSE, ufupisho wa KCSE, insha za KCSE, barua rasmi, ripoti, hotuba, tawasifu, kumbukumbu, matangazo, fasihi simulizi/andishi ya KCSE, uchambuzi wa wahusika, maudhui, dhamira, mtindo, mandhari, ploti na ushairi wa KCSE.
Question angles: kusahihisha makosa, kubaini mbinu, kueleza maana, kuchagua jibu sahihi, matumizi ya lugha.
`,

  'Integrated Science': `
CBC Integrated Science:
Grade 9 scope: living things, cell structure, cell division, tissues, organs, organ systems, digestive/respiratory/circulatory/excretory/nervous/reproductive systems, photosynthesis, transpiration, plant transport/reproduction/growth, states of matter, atomic structure, elements, compounds, mixtures, acids, bases, indicators, neutralisation, chemical equations, heat, light, sound, electricity, magnetism, speed, velocity, acceleration, Newton laws, pressure, work, energy, power, solar system, moon, earth, weather, climate, environment, nutrition, diseases, hygiene, first aid, drug abuse, reproductive health, laboratory safety, scientific investigations, data recording, graph plotting and scientific drawing.
Questions must be practical, scenario-based, observation-based and age appropriate for KJSEA.
`,

  'Science & Technology': `
CBC Science and Technology:
Grade 4-6 KPSEA scope: plants, animals, human body, senses, hygiene, food groups, nutrition, materials, states of matter, weather, water, conservation, pollution, pushes and pulls, floating and sinking, magnets, simple circuits, tools, digital devices, safety and disease prevention.
Questions must be simple, practical, observable and familiar to the learner.
`,

  'Social Studies': `
CBC Social Studies:
Grade 9 scope: geography, maps, map interpretation, physical features, climate, vegetation, population, urbanisation, agriculture, industry, trade, transport, tourism, early humans, civilisations, colonisation, nationalism, independence, Kenyan/African/world history, constitution, human rights, democracy, leadership, governance, elections, national values, scarcity, resources, production, markets, entrepreneurship, saving, banking, taxes, conservation, pollution, climate change and sustainable development.
Use Kenyan community scenarios, maps, simple data and decision-making questions.
`,

  'Mathematics (CBC)': `
CBC Mathematics:
Grade 9 scope: integers, rational numbers, fractions, mixed numbers, decimals, recurring decimals, percentages, profit and loss, discount, commission, VAT, taxation, ratio, direct/inverse proportion, scale factors, unit rates, simple/compound interest, hire purchase, instalments, exchange rates, budgeting, algebraic expressions, expansion, factorisation, substitution, linear equations, simultaneous equations, inequalities, quadratic expressions, geometry, angles, constructions, congruence, similarity, circle geometry, measurement, speed, distance, acceleration, trigonometry, bearings, elevation/depression, statistics and probability.
Use practical Kenyan contexts and KJSEA/KPSEA competency tasks.
`,

  'English (CBC)': `
CBC English / Literacy:
Grade 9 scope: active listening, oral presentations, public speaking, debates, group discussions, interviews, pronunciation, intonation, stress, etiquette, comprehension, critical/intensive/extensive reading, vocabulary development, context clues, grammar, tenses, active/passive voice, direct/indirect speech, clauses, phrases, sentence patterns, concord, punctuation, word formation, narrative/descriptive/expository/argumentative essays, functional writing, reports, minutes, speeches, emails, notices, articles, poetry, drama, novel, short stories, oral literature, literary devices, themes, characterisation, plot and style.
Questions must train communication competence, inference, tone, audience, register and clear expression.
`,

  'Kiswahili (CBC)': `
CBC Kiswahili / Lugha:
Grade 9 scope: majadiliano, midahalo, mahojiano, hotuba, mazungumzo rasmi/yasiyo rasmi, sarufi, nomino, vitenzi, vivumishi, vielezi, viwakilishi, viunganishi, sentensi, vishazi, virai, upatanisho, nyakati, ufahamu, ufupisho, msamiati, matini, insha, barua rasmi, barua ya kirafiki, ripoti, wasifu, tawasifu, matangazo, fasihi, riwaya, tamthilia, ushairi, hadithi fupi, fasihi simulizi, methali, nahau, vitendawili, wahusika, dhamira na mtindo.
Maswali yajenge umahiri wa mawasiliano, uelewa, matumizi ya lugha na kufikiri kwa kina.
`,

  'Agriculture & Nutrition': `
CBC Agriculture and Nutrition:
Grade 4-9 scope: food groups, balanced diet, hygiene, food safety, kitchen safety, preservation, meal planning, gardening, soil, compost, crop care, pests, domestic animals, water conservation, value addition, simple agribusiness and environmental care.
Use home, school garden, farm and community scenarios.
`,

  'Pre-Technical Studies': `
CBC Pre-Technical Studies:
Grade 9 scope: engineering drawing, sketching, orthographic projection, dimensioning, isometric drawing, materials technology, wood, metals, plastics, ceramics, composites, measuring/marking/cutting/holding tools, safety equipment, workshop safety, bench work, joining techniques, finishing techniques, structures, frames, bridges, roof structures, stability, forces, electrical technology, electric circuits, conductors, insulators, switches, series and parallel circuits, electronics, LEDs, resistors, capacitors, simple electronic circuits, ICT integration, operating systems, word processing, spreadsheets, internet, cyber safety, digital citizenship, manufacturing, product design, quality control, entrepreneurship, innovation and project work.
Questions should test practical reasoning, safe tool use, design choices and interpretation of simple drawings.
`,

  Geography: `
KCSE Geography mastery scope:
Form 1: Earth, weather, climate, vegetation, minerals, rocks, soil, map work.
Form 2: internal landforming processes, folding, faulting, vulcanicity, earthquakes, denudation, rivers, oceans, glaciation.
Form 3: population, settlement, land use, agriculture, industry, transport, trade, energy, tourism.
Form 4: wildlife, forestry, fishing, mining, industry, urbanisation, environmental management, GIS.
Question angles: map reading, graph interpretation, photograph analysis, explanation of processes, case studies, field work methods.
`,

  'History & Government': `
KCSE History & Government mastery scope:
Form 1: introduction to history, early man, development of agriculture, Kenyan peoples, contacts with the outside world.
Form 2: trade, transport, industrial revolution, urbanisation, constitutions, British and French administration, democracy and human rights.
Form 3: colonial administration in Kenya, colonial economy, social changes, the struggle for independence, rise of nationalism.
Form 4: independent Kenya, government structures, devolution, the Constitution, international relations, Africa and the world, national integration.
Question angles: chronology, causes and effects, treaty terms, government structure, rights and responsibilities, comparison across regions.
`,

  'Business Studies': `
KCSE Business Studies mastery scope:
Form 1: introduction to business, trade, business environment, entrepreneurship, office practice, home trade, foreign trade.
Form 2: demand, supply, inflation, taxation, money and banking, financial institutions, insurance, savings and investments.
Form 3: capital, labour, production, forms of business units, business finance, financial statements, elements of accounting.
Form 4: management functions, marketing, product promotion, consumer protection, international trade, economic development, national income.
Question angles: calculation of ratios, interpretation of financial statements, business terminology, effects of economic trends, legal requirements for businesses.
`,

  'CRE': `
KCSE Christian Religious Education mastery scope:
Form 1: meaning of CRE, creation, the Bible, early humans, faith, covenants, leadership (Moses, David), Sinai covenant, worship.
Form 2: prophets, Gikuyu traditional religion, Old Testament prophets (Elijah, Amos, Hosea, Jeremiah), teachings on righteousness and justice.
Form 3: the life and ministry of Jesus, the Gospel, birth, baptism, temptations, miracles, parables, disciples, passion, resurrection and ascension.
Form 4: early church in Acts, gifts of the Spirit, Paul's teaching, Christian ethics, marriage, family, HIV/AIDS, drugs, human sexuality, conflict resolution.
Question angles: Bible knowledge, application to modern life, comparison of teachings, significance of events, moral decision-making.
`,

  'IRE': `
KCSE Islamic Religious Education mastery scope:
Form 1: pillars of Iman, pillars of Islam, Quran revelation and compilation, tawheed, angels, prophets, holy books, day of judgement.
Form 2: devotions (salah, sawn, zakah, hajj), hadith, sirah of the Prophet, expansion of Islam, Islamic civilisation.
Form 3: Islamic law, sources of shariah, ibadah, muamalat, marriage and family life, Islamic economics and finance.
Form 4: Islamic ethics, moral teachings, current issues, HIV/AIDS, drugs, environment, peace and conflict resolution, Islamic culture in Kenya.
Question angles: Islamic rulings, Quran and hadith references, application of fiqh, comparisons with other traditions, moral reasoning.
`,

  Agriculture: `
KCSE Agriculture mastery scope:
Form 1: introduction, land preparation, soil fertility, water supply, irrigation, farm tools and equipment, crop production.
Form 2: soil science, soil erosion, crop pests and diseases, livestock breeds, animal nutrition, livestock health, farm structures.
Form 3: livestock production (dairy, beef, poultry, sheep, goats), forage crops, pasture management, farm accounts, agricultural economics.
Form 4: farm planning, land tenure, agricultural marketing, agribusiness, agroforestry, range management, farm mechanisation, agricultural policy.
Question angles: practical farming situations, disease symptoms, treatment, management practices, calculations of yields and profits, soil conservation methods.
`,

  'Computer Studies': `
KCSE Computer Studies mastery scope:
Form 1: introduction to computers, parts of a computer, input/output devices, storage, computer systems, operating systems.
Form 2: word processing, spreadsheets, databases, desktop publishing, internet and email, data security and privacy.
Form 3: data representation, logic gates, programming (BASIC/Pascal), algorithms, flowcharting, system development.
Form 4: networking, data communication, internet technologies, web development, emerging trends, impact of ICT on society.
Question angles: hardware identification, programming concepts, networking protocols, data representation, algorithmic thinking, ICT applications.
`,
}

const COMMON_MISCONCEPTIONS: Record<string, string[]> = {
  Chemistry: [
    'Confusing oxidation with reduction',
    'Thinking hydrogen is produced at the anode',
    'Ignoring concentration when predicting electrolysis products',
    'Forgetting mole ratios from balanced equations',
    'Using molecular mass instead of molar ratio',
    'Confusing endothermic and exothermic signs',
    'Writing unbalanced equations',
    'Confusing catalyst effect with equilibrium yield',
  ],
  Mathematics: [
    'Using simple interest instead of compound interest',
    'Wrong sign when transposing',
    'Using sine rule where cosine rule is needed',
    'Forgetting square root in distance or magnitude',
    'Multiplying matrices in the wrong order',
    'Reading the wrong quartile from an ogive',
    'Differentiating instead of integrating',
    'Using wrong trigonometric identity',
  ],
  Biology: [
    'Confusing diffusion and osmosis',
    'Confusing mitosis and meiosis',
    'Confusing xylem and phloem',
    'Thinking all respiration needs oxygen',
    'Confusing phenotype and genotype',
    'Confusing filtration and reabsorption in the kidney',
  ],
  Physics: [
    'Confusing mass and weight',
    'Using wrong units',
    'Confusing current direction and electron flow',
    'Confusing series and parallel circuits',
    'Using power formula where energy is required',
    'Confusing transverse and longitudinal waves',
  ],
  English: [
    'Confusing theme and subject matter',
    'Wrong question tag',
    'Wrong tense shift in reported speech',
    'Confusing tone and mood',
    'Misidentifying metaphor and simile',
  ],
  Kiswahili: [
    'Makosa ya ngeli',
    'Makosa ya upatanisho wa kisarufi',
    'Kuchanganya tashbihi na sitiari',
    'Matumizi mabaya ya wakati',
    'Kuchanganya methali na maana yake',
  ],
  Geography: [
    'Confusing weather and climate',
    'Confusing weathering and erosion',
    'Thinking all igneous rocks are the same',
    'Confusing folding and faulting',
    'Forgetting bearing is measured clockwise from north',
    'Confusing population density and population distribution',
    'Thinking greenhouse effect is always harmful',
  ],
  'History & Government': [
    'Confusing the roles of the three arms of government',
    'Thinking the Senate and National Assembly have the same functions',
    'Confusing the causes of World War I and II',
    'Thinking devolution abolished the national government',
    'Confusing democracy and constitutional monarchy',
    'Misremembering the year key independence events happened',
  ],
  'Business Studies': [
    'Confusing demand and quantity demanded',
    'Thinking inflation always means prices decrease',
    'Confusing assets and liabilities',
    'Thinking a current account is the same as a savings account',
    'Confusing a sole proprietorship and partnership liability',
    'Thinking all taxes are direct taxes',
  ],
  'CRE': [
    'Confusing the Sinai covenant and the Abrahamic covenant',
    'Thinking all prophets had the same message',
    'Confusing the synoptic Gospels',
    'Thinking only Judas betrayed Jesus',
    'Confusing the gifts of the Holy Spirit and the fruits of the Spirit',
    'Misunderstanding the difference between justification and sanctification',
  ],
  'IRE': [
    'Confusing the five pillars of Islam and the six articles of faith',
    'Thinking Zakah is the same as Sadaqah',
    'Confusing the revelation periods of the Quran',
    'Thinking Shariah only covers criminal law',
    'Misunderstanding the conditions for valid tayammum',
    'Confusing the types of tawheed',
  ],
  Agriculture: [
    'Confusing weathering and soil erosion',
    'Thinking all fertilisers are the same',
    'Confusing composting and mulching',
    'Thinking livestock diseases have the same symptoms',
    'Confusing runoff and infiltration',
    'Thinking cash crops are always more profitable than food crops',
  ],
  'Computer Studies': [
    'Confusing RAM and ROM',
    'Thinking the internet and the world wide web are the same',
    'Confusing system software and application software',
    'Thinking all networks are wireless',
    'Confusing a virus and a worm',
    'Misunderstanding the difference between a compiler and an interpreter',
  ],
}

const KCSE_CLASS_TOPIC_COVERAGE: Record<string, Record<number, string[]>> = {
  Mathematics: {
    1: [
      'Natural numbers, factors, divisibility tests, greatest common divisor and least common multiple',
      'Integers, fractions, decimals, squares and square roots',
      'Algebraic expressions, rates, ratio, proportion and percentages',
      'Length, area, volume and capacity, mass, density, weight and time',
      'Linear equations, commercial arithmetic, coordinates and graphs',
      'Angles and plane figures, geometrical constructions, scale drawing and common solids',
      'Reflection and congruence, rotation, statistics and simple probability',
    ],
    2: [
      'Cubes and cube roots, reciprocals, indices and logarithms',
      'Equations and straight lines, quadratic expressions and linear inequalities',
      'Reflection and congruence, rotation, similarity and enlargement',
      'Pythagoras theorem, trigonometry, bearing and vectors',
      'Area of triangles, polygons and circles; volume and surface area of solids',
      'Linear motion, statistics and probability',
      'Commercial arithmetic: hire purchase, taxation, simple interest and compound interest',
    ],
    3: [
      'Quadratic equations, approximations and errors',
      'Trigonometry II, further logarithms and surds',
      'Commercial arithmetic II, circles, chords and tangents',
      'Matrices, formulae and variations',
      'Sequences and series, vectors II and binomial expansion',
      'Probability II, statistics II, earth geometry, longitudes and latitudes',
      'Linear programming, loci, similarity and enlargement II',
    ],
    4: [
      'Matrices and transformations, statistics III and loci III',
      'Trigonometry III, three-dimensional geometry and longitudes/latitudes II',
      'Linear programming II',
      'Differentiation and applications of differentiation',
      'Integration, area under curves and trapezium rule',
      'Vectors III and probability III',
      'Commercial arithmetic III: compound interest, depreciation and annuities',
      'Trial and improvement, graphical methods and cumulative KCSE problem solving',
    ],
  },
  Chemistry: {
    1: [
      'Introduction to chemistry, laboratory safety, apparatus and their uses',
      'Bunsen burner, methods of separation and classification of substances',
      'Acids, bases and indicators',
      'Air and combustion, water and hydrogen',
      'Structure of the atom and periodic table introduction',
      'Chemical families, chemical formulae and chemical equations',
    ],
    2: [
      'Structure and bonding',
      'Chemical families: alkali metals, alkaline earth metals, halogens, nitrogen family and oxygen family',
      'Carbon and some compounds, oxides of carbon',
      'Organic chemistry introduction and hydrocarbons',
      'Salts',
      'Effect of electric current on substances and electrolysis',
      'Mole concept and chemical calculations',
    ],
    3: [
      'Gas laws, the mole and Avogadro law',
      'Organic chemistry II: alkanes, alkenes, alkynes, alcohols, carboxylic acids and esters',
      'Nitrogen and its compounds, sulphur and its compounds, chlorine and its compounds',
      'Acids, bases and salts II',
      'Solubility and crystallisation',
      'Energy changes in chemical reactions',
      'Reaction rates, reversible reactions and equilibrium',
    ],
    4: [
      'Electrochemistry, redox reactions, electrochemical cells and electrolysis applications',
      'Metals and extraction of sodium, aluminium, zinc, iron and copper',
      'Organic chemistry III and polymers',
      'Radioactivity',
      'Industrial processes: Haber process, Contact process, Ostwald process and Solvay process',
      'Environmental chemistry: water pollution and air pollution',
      'KCSE practical chemistry skills',
    ],
  },
  English: {
    1: [
      'Listening and speaking, pronunciation, stress and intonation, listening comprehension',
      'Grammar: parts of speech, nouns, pronouns, verbs, adjectives, adverbs, prepositions and conjunctions',
      'Sentence structure and punctuation',
      'Reading comprehension, intensive reading and extensive reading',
      'Functional writing, personal writing and composition writing',
      'Oral literature introduction, poetry introduction and set book introduction',
    ],
    2: [
      'Listening and speaking II: oral narratives, proverbs, riddles, tongue twisters and songs',
      'Grammar II: tenses, active/passive voice, direct/indirect speech, clauses, phrases and sentence patterns',
      'Comprehension II and summary writing',
      'Functional writing II: letters, reports, notices and speeches',
      'Narrative writing and descriptive writing',
      'Poetry II, drama and novel study',
    ],
    3: [
      'Listening and speaking III: debate, interviews and public speaking',
      'Grammar III: conditional sentences, relative clauses, inversion, concord and sentence transformation',
      'Comprehension III and summary III',
      'Oral literature III, poetry analysis and stylistic devices',
      'Essay writing, argumentative writing and imaginative composition',
      'Functional writing III',
      'Set texts: novel, play and short stories',
    ],
    4: [
      'Listening and speaking IV and advanced oral skills',
      'Grammar revision, error correction and sentence transformation',
      'Comprehension mastery and summary mastery',
      'Literary appreciation, poetry mastery and oral literature mastery',
      'Essay writing mastery and functional writing mastery',
      'KCSE paper practice',
      'Set book revision: character analysis, themes, style, plot and context questions',
    ],
  },
  Kiswahili: {
    1: [
      'Kusikiliza na kuzungumza, matamshi bora, salamu na maagizo',
      'Sarufi: nomino, viwakilishi, vivumishi, vitenzi, vielezi, viunganishi, vihusishi na sentensi',
      'Ufahamu, kusoma kwa sauti na kusoma kwa kimya',
      'Insha za kawaida na barua ya kirafiki',
      'Fasihi simulizi: methali, vitendawili, nyimbo na hadithi',
      'Ushairi wa awali',
    ],
    2: [
      'Mazungumzo, midahalo na majadiliano',
      'Sarufi II: nyakati, hali, ngeli za nomino, upatanisho wa kisarufi, ukanushaji, usemi halisi na taarifa',
      'Ufahamu II na ufupisho',
      'Insha II: barua rasmi, ripoti, hotuba na matangazo',
      'Fasihi simulizi II: ngano, miviga, soga na vitendawili',
      'Ushairi II, tamthilia na riwaya',
    ],
    3: [
      'Kusikiliza na kuzungumza III: mahojiano, mjadala na uwasilishaji',
      'Sarufi III: sentensi changamano, virai, vishazi, uakifishaji, msamiati na rejesta',
      'Ufahamu III na ufupisho III',
      'Insha za hoja, maelezo na masimulizi',
      'Barua rasmi zaidi, kumbukumbu na risala',
      'Fasihi andishi: riwaya, tamthilia, hadithi fupi, ushairi, wahusika, dhamira, maudhui na mbinu za lugha',
      'Vitabu teule: Nguu za Jadi, Bembea, Mapambazuko ya Machweo na Hadithi Nyingine',
    ],
    4: [
      'Marudio ya sarufi: ngeli zote, upatanisho, mnyambuliko wa vitenzi, ubadilishaji wa sentensi, usemi halisi na taarifa, ukanushaji na rejesta',
      'Misemo, nahau na methali',
      'Ufahamu wa KCSE na ufupisho wa KCSE',
      'Insha za KCSE: barua rasmi, ripoti, hotuba, tawasifu, kumbukumbu na matangazo',
      'Fasihi simulizi ya KCSE na fasihi andishi ya KCSE',
      'Uchambuzi wa wahusika, maudhui, dhamira, mtindo, mandhari, ploti na ushairi wa KCSE',
      'Vitabu teule: dondoo, muktadha, msemaji, anayesemewa, mbinu na majibu yenye ushahidi',
    ],
  },
  Biology: {
    1: [
      'Introduction to biology and classification I',
      'The cell and cell physiology',
      'Nutrition in plants and nutrition in animals',
      'Transport in plants and animals',
      'Gaseous exchange and respiration',
    ],
    2: [
      'Excretion and homeostasis',
      'Classification II',
      'Ecology',
      'Reproduction in plants and reproduction in animals',
      'Growth and development',
      'Support and movement in plants and animals',
    ],
    3: [
      'Coordination and response',
      'Nervous coordination, endocrine system and sense organs',
      'Tropisms and tactic responses',
      'Reproduction II: fertilisation, pregnancy and birth',
      'Genetics, variation and evolution',
    ],
    4: [
      'Genetics II: inheritance, monohybrid inheritance, sex-linked traits and mutation',
      'Evolution II',
      'Ecology II: population studies, human impact on environment, pollution and conservation',
      'Practical biology skills: food tests, microscopy, field work, biological drawings and data interpretation',
    ],
  },
  Physics: {
    1: [
      'Introduction to physics and measurement',
      'Force and pressure',
      'Particulate nature of matter',
      'Thermal expansion and heat transfer',
      'Rectilinear propagation of light',
      'Electrostatics I, cells and simple circuits',
    ],
    2: [
      'Magnetism and measurement II',
      'Turning effect of a force, equilibrium and centre of gravity',
      'Reflection at curved surfaces',
      'Magnetic effect of electric current',
      'Hooke law',
      'Waves I and sound',
      'Fluid flow, machines, work, energy and power',
    ],
    3: [
      'Linear motion, Newton laws of motion, friction and circular motion',
      'Refraction of light',
      'Floating and sinking',
      'Thermal effects, gas laws and quantity of heat',
      'Current electricity',
      'Waves II and electromagnetic spectrum',
    ],
    4: [
      'Thin lenses, uniform circular motion and simple harmonic motion',
      'Electromagnetic induction and mains electricity',
      'Cathode rays, X-rays and photoelectric effect',
      'Radioactivity',
      'Electronics: semiconductors and logic gates',
      'Practical physics skills, graph work and error analysis',
    ],
  },
  Geography: {
    1: [
      'Earth, solar system, weather, climate and field work',
      'Map work: scale, direction, bearing, grid references, relief and altitude',
      'Rocks, minerals, soil formation and vegetation',
    ],
    2: [
      'Internal landforming processes: folding, faulting, vulcanicity and earthquakes',
      'Denudation: weathering, mass wasting, rivers, lakes and oceans',
      'Glaciation, arid and semi-arid landforms',
      'Map interpretation, altitude, contours, cross-sections and drainage patterns',
    ],
    3: [
      'Population, settlement, land use and agriculture',
      'Industry, transport, trade, energy and tourism',
      'Statistical methods, photograph interpretation and fieldwork analysis',
    ],
    4: [
      'Wildlife, forestry, fishing, mining and environmental management',
      'Urbanisation, world trade, GIS and remote sensing',
      'Case studies, comparative geography and advanced map interpretation',
    ],
  },
  'History & Government': {
    1: [
      'Introduction to History and Government, sources of information',
      'Early man, development of agriculture and early civilisations',
      'Peoples of Kenya, migration, settlement and social organisation',
      'Contacts between East Africa and the outside world',
    ],
    2: [
      'Trade, transport, communication and industrial revolution',
      'Constitution and democracy, human rights and citizenship',
      'European invasion and colonisation of Africa',
      'British and French administration in Africa',
    ],
    3: [
      'Colonial administration in Kenya and Africa',
      'Colonial economy, social developments and resistance',
      'The struggle for independence and nationalism in Kenya',
      'Lives and contributions of nationalist leaders',
    ],
    4: [
      'Independent Kenya, national philosophies and development',
      'The Constitution, devolution and arms of government',
      'International relations, African cooperation and world organisations',
      'KCSE cause-effect, comparison and significance questions',
    ],
  },
  'Business Studies': {
    1: [
      'Introduction to business, business environment and entrepreneurship',
      'Office practice, trade, home trade and forms of business units',
      'Business calculations, documents and simple transactions',
    ],
    2: [
      'Demand and supply, inflation, taxation and public finance',
      'Money, banking, financial institutions, insurance and investments',
      'Warehousing, transport and communication',
    ],
    3: [
      'Production, factors of production and product markets',
      'Business finance, sources of capital and financial statements',
      'Ledger, trial balance, cash book and final accounts basics',
    ],
    4: [
      'Management, marketing, product promotion and consumer protection',
      'International trade, economic development and national income',
      'Advanced accounting interpretation and business decision-making',
    ],
  },
  CRE: {
    1: [
      'Introduction to CRE, the Bible and creation accounts',
      'Faith and promises to Abraham, Moses and the Sinai covenant',
      'Leadership in Israel, judges, kings and prophets',
      'African traditional religious beliefs, practices and values',
    ],
    2: [
      'The birth and early life of Jesus Christ',
      'Jesus teachings, miracles, parables and discipleship',
      'Passion, death, resurrection and ascension of Jesus',
      'The early church, Pentecost and the work of the Holy Spirit',
    ],
    3: [
      'Christian ethics: life skills, work, leisure, wealth and poverty',
      'Marriage, family, responsible parenthood and human sexuality',
      'Justice, law, order, peace, reconciliation and conflict resolution',
      'Selected Old Testament prophets and their relevance today',
    ],
    4: [
      'Christian approaches to social, economic and political issues',
      'Science, technology, environment and contemporary moral questions',
      'Church history, ecumenism and Christian unity',
      'KCSE source-based interpretation, application and essay questions',
    ],
  },
  IRE: {
    1: [
      'Introduction to Islam, tawheed and articles of faith',
      'The Quran: revelation, compilation, selected surahs and lessons',
      'Hadith and Sunnah as sources of guidance',
      'Pillars of Islam, purification, salah and basic worship',
    ],
    2: [
      'Prophethood, seerah of Prophet Muhammad and early Muslim community',
      'Zakah, sawm, hajj and their social importance',
      'Akhlaq: Islamic manners, family life and social relations',
      'Islamic festivals, practices and moral lessons',
    ],
    3: [
      'Shariah, fiqh, halal and haram in daily life',
      'Islamic economic principles, trade, wealth and charity',
      'Marriage, family, inheritance basics and social responsibility',
      'Islam in East Africa and contribution of Muslims to society',
    ],
    4: [
      'Advanced Quran and Hadith interpretation for KCSE',
      'Islamic law, contemporary issues, ethics and leadership',
      'Comparative application of Islamic teachings to modern challenges',
      'KCSE structured responses, evidence, examples and essay organisation',
    ],
  },
  Agriculture: {
    1: [
      'Introduction to agriculture, branches and importance',
      'Soil formation, soil profile, soil properties and soil fertility',
      'Farm tools and equipment, safety and maintenance',
      'Crop production basics, land preparation and planting',
    ],
    2: [
      'Soil water, irrigation, drainage and soil conservation',
      'Manures, fertilisers, composting and nutrient management',
      'Crop pests, diseases, weeds and control methods',
      'Livestock production basics, feeds and feeding',
    ],
    3: [
      'Crop production enterprises, harvesting, storage and marketing',
      'Livestock health, breeding, housing and production records',
      'Farm power, machinery, structures and farm layout',
      'Agricultural economics: production, budgeting and risk management',
    ],
    4: [
      'Advanced livestock and crop management for KCSE',
      'Farm management, records, accounts and entrepreneurship',
      'Agricultural marketing, cooperatives and extension services',
      'KCSE practical skills, calculations, diagrams and field problem solving',
    ],
  },
  'Computer Studies': {
    1: [
      'Computer systems, hardware, software, input, output and storage',
      'Operating systems, file management and basic troubleshooting',
      'Keyboarding, word processing and document formatting',
      'Computer laboratory safety, ethics and data security basics',
    ],
    2: [
      'Spreadsheets, formulas, functions, charts and data analysis',
      'Databases: tables, fields, records, queries, forms and reports',
      'Desktop publishing, graphics and presentation software',
      'Internet, email, search skills, privacy and cybersecurity',
    ],
    3: [
      'Data representation, number systems and binary arithmetic',
      'Logic gates, truth tables and Boolean logic',
      'Algorithms, flowcharts, pseudocode and programming basics',
      'System development, documentation and problem analysis',
    ],
    4: [
      'Networking, data communication, protocols and transmission media',
      'Web design, HTML basics and internet technologies',
      'Programming problem solving and KCSE trace-table questions',
      'Emerging trends, ICT impact, ethics and exam practical skills',
    ],
  },
}

const CBC_GRADE_TOPIC_COVERAGE: Record<string, Record<number, string[]>> = {
  'Mathematics (CBC)': {
    9: [
      'Numbers: integers, rational numbers, fractions, mixed numbers, decimals, recurring decimals, percentages and real-life applications',
      'Commercial and financial mathematics: percentage increase/decrease, profit and loss, discount, commission, VAT, taxation, simple interest, compound interest, hire purchase, instalments, exchange rates and budgeting',
      'Ratio and proportion: direct proportion, inverse proportion, sharing ratios, scale factors and unit rates',
      'Algebra: simplifying expressions, expansion, factorisation, substitution, linear equations, simultaneous equations, inequalities and quadratic expressions',
      'Geometry: parallel-line angles, polygon angles, circle angles, constructions, congruence, similarity, enlargement, scale drawings, chords, tangents, arcs, sectors and segments',
      'Measurement: perimeter, area, surface area, volume, capacity, density, time, speed, distance and acceleration',
      'Trigonometry: Pythagoras theorem, sine, cosine, tangent, bearings, angles of elevation and depression',
      'Statistics and probability: data collection, sampling, frequency tables, histograms, pie charts, line graphs, scatter diagrams, mean, median, mode, range and probability',
    ],
  },
  'English (CBC)': {
    9: [
      'Listening and speaking: active listening, oral presentations, public speaking, debates, group discussions, interviews, pronunciation, intonation, stress and etiquette',
      'Reading: comprehension, critical reading, intensive reading, extensive reading, vocabulary development and context clues',
      'Grammar: parts of speech, tenses, active/passive voice, direct/indirect speech, clauses, phrases, sentence patterns, concord, punctuation and word formation',
      'Writing: narrative, descriptive, expository and argumentative essays plus functional writing, reports, minutes, speeches, emails, notices and articles',
      'Literature: poetry, drama, novel, short stories, oral literature, literary devices, themes, characterisation, plot and style',
    ],
  },
  'Kiswahili (CBC)': {
    9: [
      'Kusikiliza na kuzungumza: majadiliano, midahalo, mahojiano, hotuba, mazungumzo rasmi na yasiyo rasmi',
      'Sarufi: nomino, vitenzi, vivumishi, vielezi, viwakilishi, viunganishi, sentensi, vishazi, virai, upatanisho na nyakati',
      'Kusoma: ufahamu, ufupisho, msamiati na matini',
      'Kuandika: insha, barua rasmi, barua ya kirafiki, ripoti, wasifu, tawasifu, matangazo na hotuba',
      'Fasihi: riwaya, tamthilia, ushairi, hadithi fupi, fasihi simulizi, methali, nahau, vitendawili, wahusika, dhamira na mtindo',
    ],
  },
  'Integrated Science': {
    9: [
      'Living things: cell structure, cell division, tissues, organs and organ systems',
      'Human body systems: digestive, respiratory, circulatory, excretory, nervous and reproductive systems',
      'Plants: photosynthesis, transpiration, plant transport, reproduction and growth',
      'Matter: states of matter, atomic structure, elements, compounds and mixtures',
      'Chemical reactions: acids, bases, indicators, neutralisation and chemical equations',
      'Energy: heat, light, sound, electricity and magnetism',
      'Force and motion: speed, velocity, acceleration, Newton laws, pressure, work, energy and power',
      'Earth and space: solar system, moon, earth, weather, climate and environment',
      'Health: nutrition, diseases, hygiene, first aid, drug abuse and reproductive health',
      'Practical skills: laboratory safety, scientific investigations, data recording, graph plotting and scientific drawing',
    ],
  },
  'Social Studies': {
    9: [
      'Geography: maps, map interpretation, physical features, climate, vegetation, population, urbanisation, agriculture, industry, trade, transport and tourism',
      'History: early humans, civilisations, colonisation, nationalism, independence, Kenyan history, African history and world history',
      'Citizenship: constitution, human rights, democracy, leadership, governance, elections and national values',
      'Economics: scarcity, resources, production, markets, entrepreneurship, saving, banking and taxes',
      'Environment: conservation, pollution, climate change and sustainable development',
    ],
  },
  'Pre-Technical Studies': {
    9: [
      'Engineering drawing: sketching, orthographic projection, dimensioning and isometric drawing',
      'Materials technology: wood, metals, plastics, ceramics and composites',
      'Tools and equipment: measuring tools, marking tools, cutting tools, holding tools and safety equipment',
      'Workshop practice: workshop safety, bench work, joining techniques and finishing techniques',
      'Structures: frames, bridges, roof structures, stability and forces',
      'Electrical technology: electric circuits, conductors, insulators, switches, series circuits and parallel circuits',
      'Electronics: electronic components, LEDs, resistors, capacitors and simple electronic circuits',
      'ICT integration: computer systems, operating systems, word processing, spreadsheets, internet, cyber safety and digital citizenship',
      'Manufacturing: product design, production processes, quality control, entrepreneurship and innovation',
      'Project work: design, planning, construction, testing, evaluation and presentation',
    ],
  },
}

function getKcseClassCoverage(subjects: string[], className: string) {
  const form = getFormNumber(className)
  if (!form) return ''

  const blocks: string[] = []
  for (const subject of subjects) {
    if (subjectLooksCbc(subject)) continue
    const key = resolveTopicKey(subject, Object.keys(KCSE_CLASS_TOPIC_COVERAGE))

    if (!key) continue
    const levels = KCSE_CLASS_TOPIC_COVERAGE[key]
    const lines: string[] = []
    for (let f = 1; f <= Math.min(form, 4); f++) {
      if (levels[f]) lines.push(`Form ${f}: ${levels[f].join('; ')}`)
    }
    if (lines.length) blocks.push(`${subject} cumulative scope for ${className}:\n${lines.join('\n')}`)
  }

  return blocks.length
    ? `STRICT CLASS-BY-CLASS KCSE COVERAGE:\n${blocks.join('\n\n')}\nDo not test topics above the learner's form. For Form 3, use Form 1-3 only. For Form 4, use Form 1-4 cumulatively.`
    : ''
}

function getCbcGradeCoverage(subjects: string[], className: string) {
  const grade = getGradeNumber(className)
  if (!grade) return ''

  const blocks: string[] = []
  for (const subject of subjects) {
    if (!subjectLooksCbc(subject)) continue
    const key = resolveTopicKey(subject, Object.keys(CBC_GRADE_TOPIC_COVERAGE))

    if (!key) continue
    const levels = CBC_GRADE_TOPIC_COVERAGE[key]
    const lines: string[] = []
    for (let g = 1; g <= Math.min(grade, 9); g++) {
      if (levels[g]) lines.push(`Grade ${g}: ${levels[g].join('; ')}`)
    }
    if (lines.length) blocks.push(`${subject} CBC/KJSEA scope for ${className}:\n${lines.join('\n')}`)
  }

  return blocks.length
    ? `STRICT CBC GRADE COVERAGE:\n${blocks.join('\n\n')}\nDo not test above the learner's grade. For Grade 9, use the Grade 9 KJSEA topic tree and competency-based practical contexts.`
    : ''
}

function getSubjectTopics(registeredSubjects: string[]) {
  if (!registeredSubjects.length) return ''

  const lines: string[] = []

  for (const subject of registeredSubjects) {
    const key = resolveTopicKey(subject, Object.keys(SUBJECT_TOPICS))

    if (key) lines.push(`${subject}:\n${SUBJECT_TOPICS[key]}`)
  }

  return lines.length
    ? `SYLLABUS TOPIC DEPTH FOR REGISTERED SUBJECTS:\n${lines.join('\n\n')}`
    : ''
}

function getPriorityTopics(registeredSubjects: string[]) {
  const lines: string[] = []

  for (const subject of registeredSubjects) {
    if (subjectLooksCbc(subject)) continue
    const key = resolveTopicKey(subject, Object.keys(KCSE_PRIORITY_TOPICS))

    if (key) {
      lines.push(`${subject}: ${KCSE_PRIORITY_TOPICS[key].join(', ')}`)
    }
  }

  return lines.length
    ? `HIGH-VALUE EXAM TOPICS TO PRIORITISE:\n${lines.join('\n')}`
    : ''
}

function getMisconceptions(registeredSubjects: string[]) {
  const lines: string[] = []

  for (const subject of registeredSubjects) {
    const key = resolveTopicKey(subject, Object.keys(COMMON_MISCONCEPTIONS))

    if (key) {
      lines.push(`${subject}: ${COMMON_MISCONCEPTIONS[key].join('; ')}`)
    }
  }

  return lines.length
    ? `COMMON STUDENT MISCONCEPTIONS TO USE AS DISTRACTORS:\n${lines.join('\n')}`
    : ''
}

function getTrainingModePrompt(mode: BrainGymTrainingMode, registeredSubjects: string[]) {
  const subjectText = registeredSubjects.join(', ')

  switch (mode) {
    case 'setbook':
      return `TRAINING LANE: 8-4-4 SET BOOK MASTERY
- Generate questions only for English/Kiswahili set books if those subjects are selected: Fathers of Nations, The Samaritan, A Silent Song and Other Stories, Nguu za Jadi, Bembea, Mapambazuko ya Machweo na Hadithi Nyingine.
- Use chapter/scene/context, character relationships, themes, style, irony, conflict, quotation significance and excerpt-style reasoning.
- Include at least 4 close-reading excerpt questions and at least 1 essay_response task with a strict KCSE rubric.`
    case 'excerpt':
      return `TRAINING LANE: KCSE EXCERPT LAB
- Generate original excerpt practice for ${subjectText || 'English/Kiswahili literature'}.
- Every excerpt question must include a substantial original excerpt in the excerpt field, 120-220 words for prose/drama or a well-formed dialogue extract.
- Ask context, speaker/addressee, character, theme, style, tone, language technique and evidence questions.
- Include markingRubric for essay_response tasks and model the discipline of quoting or referring to exact evidence.`
    case 'essay':
      return `TRAINING LANE: KCSE ESSAY WRITING
- Generate only essay_response tasks.
- For English/Kiswahili, use examinable set books, poetry, oral literature, functional writing or composition prompts within the learner's form.
- Each task must include maxMarks 20 and a markingRubric covering content, evidence, organisation, language accuracy and conclusion.
- Prompts must be specific enough to mark strictly, not generic "write an essay" tasks.`
    case 'poetry':
      return `TRAINING LANE: ENGLISH POETRY GYM
- Generate original English poems only; do not copy copyrighted poems.
- Every poem excerpt must be complete: 3-4 stanzas, 3-4 lines per stanza.
- Test persona, tone, mood, imagery, symbolism, sound devices, structure, theme, attitude and evidence.
- Include at least one essay_response or structured response with a strict KCSE poetry rubric.`
    case 'ushairi':
      return `TRAINING LANE: KISWAHILI USHAIRI GYM
- Generate original Kiswahili mashairi only.
- Every shairi excerpt must be complete: 3-4 beti, preferably 4 mishororo per ubeti where suitable.
- Test vina, mizani, bahari, nafsi neni, dhamira, maudhui, toni, taswira, uhuru wa kishairi, mbinu za lugha and ushahidi kutoka shairini.
- Include at least one essay_response or structured response with a strict KCSE ushairi rubric.`
    case 'biology_essay':
      return `TRAINING LANE: BIOLOGY STRUCTURED ESSAY MASTERY
- Generate only essay_response tasks for Biology.
- Keep every prompt strictly inside the learner's cumulative Form 1-4 Biology coverage.
- Use examinable KCSE structured-answer prompts: explain processes, compare adaptations, describe experiments, interpret data, explain homeostasis/genetics/ecology/reproduction, or outline practical procedures.
- Rubrics must award marks for accurate biological points, sequence, key terms, labelled evidence/data interpretation where relevant, and exam clarity.`
    case 'character_analysis':
      return `TRAINING LANE: KCSE CHARACTER ANALYSIS
- Generate questions on major and minor characters, character growth, motivation, leadership, decision making, transformation, conflict and contribution to themes/plot.
- Require illustrations from the selected text. Do not reward invented events or unsupported traits.
- Include at least one essay_response with a strict KCSE rubric.`
    case 'theme_analysis':
      return `TRAINING LANE: KCSE THEME ANALYSIS
- Generate questions on examinable themes such as leadership, corruption, justice, family, power, identity, culture, religion, poverty, greed, education, conflict, love, gender, tradition, modernity, hope, nationalism, freedom and human rights.
- Require learners to support every point using illustrations from the selected text.
- Include at least one essay_response with a strict KCSE rubric.`
    case 'style_analysis':
      return `TRAINING LANE: KCSE STYLE ANALYSIS
- Generate questions on irony, symbolism, satire, humour, flashback, foreshadowing, dialogue, narration, suspense, imagery, metaphor, simile, contrast, characterisation and plot structure.
- Require students to explain the effectiveness of each device, not just name it.
- Include at least one excerpt or essay_response task.`
    case 'context_questions':
      return `TRAINING LANE: KCSE CONTEXT QUESTIONS
- Generate context questions asking what happens immediately before/after, why the event occurs, why the scene matters and how it develops theme, character or plot.
- Excerpt tasks must include an ORIGINAL PRACTICE PASSAGE inspired by the selected text, not copied text.
- Use KCSE-style mark allocations.`
    case 'character_relationships':
      return `TRAINING LANE: CHARACTER RELATIONSHIPS
- Generate questions on relationships, conflicts, alliances, family/social ties, power dynamics and how relationships reveal themes or character traits.
- Never mix characters from different books.
- Require text-based illustrations and avoid generic moralising.`
    case 'plot_revision':
      return `TRAINING LANE: PLOT REVISION
- Generate questions on sequence of events, causes and consequences, turning points, conflict development, climax, resolution and significance of scenes.
- Include context-before/context-after questions and plot-significance questions.`
    case 'timed_mock':
      return `TRAINING LANE: TIMED KCSE MOCK
- Generate a compact KCSE-style literature mock with authentic mark allocations.
- Use a mixture of excerpt/context questions and essay_response tasks.
- Questions should challenge a top candidate and look like a real examination paper.`
    case 'kcse_prediction':
      return `TRAINING LANE: KCSE PREDICTION
- Generate likely KCSE-style practice areas without claiming certainty.
- Focus on examinable themes, character traits, relationships, conflicts, style, context and author message from the selected text.
- Each item must demand critical thinking and illustrations.`
    case 'random_challenge':
      return `TRAINING LANE: RANDOM EXAMINER CHALLENGE
- Generate a varied, high-pressure literature workout from the selected text.
- Mix character, theme, style, context, plot and excerpt analysis.
- Avoid repetition and make the questions unique.`
    case 'structured':
      return `TRAINING LANE: STRUCTURED ANSWER MASTERY
- Generate structured KCSE/CBC questions requiring explanation, calculation, process steps, observations, data interpretation or reasoning.
- Avoid simple recall. Every question should train mastery through feedback: why the answer is right, how to avoid the common trap, and what examiner wording matters.
- For science subjects, include equations, apparatus, observations, variables, graph/table data or practical context whenever the concept requires it.`
    case 'cbc_visual_duel':
      return `TRAINING LANE: CBC VISUAL DUEL
- Generate fast CBC MCQ questions only, but make them visual-first.
- Use blackboard sketches, labelled diagrams, tables, maps, graph grids, simple circuits, food plates, farm layouts, tool drawings, safety symbols and investigation data in the question or excerpt field.
- Every question MUST include a visualScene object with sceneType, background, style, objects, diagram, interactionType, workingTools and visualPrompt.
- Never return a plain-text-only CBC duel item. The learner should feel like they are inside a classroom, lab, map room, library, darasa or workshop scene.
- Grade 6 should feel like KPSEA practice with friendly guided visuals. Grade 9 should feel like KJSEA academy practice with mature data, diagrams and case evidence.
- Distractors must represent real learner mistakes from reading the visual, choosing the wrong unit, reversing direction, misreading a graph/table, or applying an unsafe/practically wrong choice.
- Keep each question quick enough for a duel, but not shallow.`
    default:
      return `TRAINING LANE: MASTER MIX
- Generate a balanced mastery workout. Each item should feel like deliberate practice: one skill, one trap, one clear improvement point.
- Explanations must teach how to improve, not merely state the answer.`
  }
}

function getLanguageLiteratureCoverage(registeredSubjects: string[], className: string) {
  const normalized = registeredSubjects.map(subject => normaliseText(subject))
  const form = getFormNumber(className)
  const needsEnglish = normalized.some(subject => subject.includes('english') || subject.includes('literature'))
  const needsKiswahili = normalized.some(subject => subject.includes('kiswahili'))

  if (!needsEnglish && !needsKiswahili) return ''

  const level = form >= 3
    ? 'Form 3-4 KCSE literature level'
    : form > 0
      ? `Form ${form} language foundation level`
      : 'Kenyan language assessment level'

  const english = needsEnglish ? `
ENGLISH LITERATURE AND POETRY COVERAGE (${level}):
- Set books for 2022-2026 KCSE: Fathers of Nations, The Samaritan, A Silent Song and Other Stories.
- Approved optional texts where configured: Artist of the Floating World, A Parliament of Owls.
- Test chapter/scene context, character relationships, themes, conflict, style, tone, irony, symbolism, setting and quotation significance.
- Poetry: persona, tone, mood, theme, imagery, rhyme, rhythm, repetition, alliteration, metaphor, simile, diction, structure and message.
- Include KCSE essay prompts that demand argument, evidence and organised paragraphs.
` : ''

  const kiswahili = needsKiswahili ? `
KISWAHILI FASIHI NA USHAIRI COVERAGE (${level}):
- Vitabu teule vya KCSE 2022-2026: Nguu za Jadi, Bembea, Mapambazuko ya Machweo na Hadithi Nyingine.
- Jaribu dondoo, muktadha, msemaji, anayesemewa, maudhui, wahusika, mbinu za uandishi, tamathali za semi, mandhari, muundo na mtindo.
- Ushairi: nafsi neni, bahari, vina, mizani, urari, takriri, tashbihi, sitiari, taswira, toni, dhamira, ujumbe na uhuru wa kishairi.
- Insha: hoja zenye mpangilio, msamiati mwafaka, mtiririko, sarufi na hitimisho.
` : ''

  return `${english}${kiswahili}`
}

function getKcseMathematicsStatisticsEngine(registeredSubjects: string[], className: string) {
  const normalized = registeredSubjects.map(subject => normaliseText(subject))
  const hasMath = normalized.some(subject => subject.includes('mathematics') && !subject.includes('cbc'))
  const form = getFormNumber(className)
  if (!hasMath || form < 3) return ''

  const scope = form >= 4
    ? `FORM 4 STATISTICS SCOPE:
- grouped frequency tables, mean, median, modal class, mode, variance, standard deviation, quartiles, quartile deviation, interquartile range, percentiles, deciles, cumulative frequencies, ogives, histograms, frequency polygons, comparison and interpretation.
- Use large realistic data sets from exam performance, population, business, agriculture, medicine, economics, rainfall, transport or manufacturing.`
    : `FORM 3 STATISTICS SCOPE:
- frequency tables, grouped data, ungrouped data, mean, median, mode, modal class, range, frequency polygons, bar graphs, pie charts, histograms, ogives, graph reading, graph drawing, comparison of data and construction of frequency tables.
- Use realistic data from school marks, rainfall, crop yields, business profits, sports, agriculture, weather or population.`

  return `
PEAK COACH KCSE MATHEMATICS STATISTICS ENGINE:
${scope}

Generation rules:
- Do not generate generic recall such as "What is standard deviation?", "What is mean?", "Define median" or "If mean is 70...".
- Do not use tiny repeated data sets for Form 3/4 statistics.
- Every statistics item must contain a realistic table, grouped intervals, frequencies, cumulative frequencies, graph-construction requirement or data interpretation task.
- Prefer structured KCSE wording with (a), (b), (c), (d) and mark allocation when the item is not a simple MCQ.
- If the session has 10 Mathematics questions for Form 3/4, include at least one rich statistics item unless the selected topic is explicitly not statistics.
- Graph questions must ask learners to construct, read or interpret the graph; do not merely describe a finished graph without data.
- Marking should award method marks, accuracy marks, presentation marks, graph scale/axis/plotting marks and interpretation marks.
`
}

function getCbcVisualLearningEngine(type: CurriculumType, registeredSubjects: string[], className: string, context?: 'brain_gym' | 'duel') {
  if (type !== 'kpsea' && type !== 'kjsea') return ''

  const grade = getGradeNumber(className)
  const subjectList = registeredSubjects.join(', ') || 'CBC subjects'
  const mode = context === 'duel' ? 'DUEL' : 'BRAIN GYM'

  const grade6 = grade <= 6 ? `
GRADE 6 / KPSEA VISUAL STYLE:
- Use friendly blackboard-style sketches, simple tables, labelled diagrams, picture clues, maps of familiar places, shopping/farm/home/school scenes and step-by-step visual reasoning.
- Language must be short, concrete and confidence-building.
- Avoid abstract Grade 9/KCSE content.
- Good visual prompts include: a blackboard fraction bar, a small shop price table, a simple food plate diagram, a weather chart, a school garden sketch, a county map clue, a simple circuit or magnet picture described in words.
` : ''

  const grade9 = grade >= 9 ? `
GRADE 9 / KJSEA VISUAL STYLE:
- Use mature blackboard boards, lab setups, circuit diagrams, graph/table interpretation, maps, engineering sketches, safety symbols, case files and data evidence.
- Require multi-step competency reasoning and explanation, but keep it inside Grade 9 CBC scope.
- Good visual prompts include: a blackboard graph grid, circuit with labelled components, food-web diagram, orthographic/isometric sketch, soil profile, climate graph, household budget table, map extract or investigation results table.
` : ''

  const junior = grade > 6 && grade < 9 ? `
GRADE ${grade || '7-8'} / JUNIOR SECONDARY VISUAL STYLE:
- Use diagrams, maps, tables, flow charts, simple investigation records, labelled drawings and practical school/community situations.
- Move from guided visual clues toward independent reasoning.
` : ''

  return `
CBC VISUAL LEARNING ENGINE FOR ${mode}:
Registered CBC subjects: ${subjectList}.
${grade6}${junior}${grade9}
Rules:
- In every CBC ${mode.toLowerCase()} session, every question should be visual, practical or data-rich; at least 4 must include diagrams, maps, tables, graphs, apparatus, scenes or visual evidence.
- Every CBC question MUST include a "visualScene" object:
  {
    "sceneType": "Modern Physics Classroom | Integrated Science Laboratory | Kenya Map Room | Library Reading Corner | Darasa la Kiswahili | Pre-Technical Workshop",
    "background": "Blackboard | whiteboard | graph paper | lab bench | Kenya map | notice board | workshop bench",
    "style": "Grade 6 colourful guided illustration | Grade 7 educational textbook | Grade 8 semi-realistic classroom | Grade 9 professional clean academy",
    "objects": ["2-6 concrete props such as chalk, ruler, circuit board, microscope, map pins, storybook, safety goggles"],
    "diagram": "motion diagram | circuit | coordinate grid | food plate | weather chart | timeline | poem board | none",
    "interactionType": "mcq | calculation | graph-reading | map-reading | drag-sort | short-working",
    "workingTools": ["formula helper", "answer box", "working area", "unit reminder"],
    "visualPrompt": "What should be drawn or displayed in the scene, including all labels, figures, data and text."
  }
- Use the "excerpt" field for blackboard sketches, tables, maps, diagrams, investigation results, food plates, circuits, farm layouts, tool sketches or poem/song texts when a visual/context block helps.
- If a question refers to a diagram, graph, map, table, experiment or blackboard, the full text description/data must be included. Never say "see diagram below" without rendering the information in text.
- For ${context === 'duel' ? 'duels, keep every question MCQ and fast, but make distractors reflect real learner misconceptions.' : 'Brain Gym, mix MCQ with short structured explanations where useful.'}
- Visuals must be curriculum-safe: Grade 6 prepares for KPSEA; Grade 7-9 prepares for KJSEA. Do not leak KCSE Form 3/4 content into CBC.
- Make the learner feel like they are solving on a smart blackboard: clear labels, small data blocks, visible steps, and practical Kenyan contexts.
- Subject environments:
  Mathematics uses blackboards, graph paper, coordinate grids, geometry boards, rulers, protractors and calculators.
  Integrated Science / Science & Technology uses laboratories, apparatus, microscopes, plant specimens, body models, circuits and investigation tables.
  Social Studies uses Kenya maps, globes, timelines, weather stations, population charts and community scenes.
  English uses libraries, reading corners, newspapers, storybooks, notice boards and school magazines.
  Kiswahili uses darasa scenes, ubao, fasihi notice boards, mazungumzo ya wahusika and shairi boards.
  Pre-Technical uses workshops, measuring tools, engineering drawing boards, safety signs and labelled tools.
`
}

function getExamBlueprint(type: CurriculumType, className: string) {
  const form = getFormNumber(className)
  const grade = getGradeNumber(className)

  if (type === 'kcse') {
    const scope =
      form >= 1 && form <= 4
        ? `This is ${className}. Test Form 1 up to Form ${form} only. For Form 4, test cumulatively from Form 1–4. For Form 3, test Form 1–3 only.`
        : 'Use KCSE 8-4-4 secondary school scope.'

    return `
KCSE / 8-4-4 EXAM BLUEPRINT:
${scope}

The questions must feel like real Kenyan KCSE preparation:
- Avoid lazy recall unless the question is easy.
- Use multi-step reasoning.
- Use data, tables, graph descriptions, experiments, observations, equations, maps, extracts, diagrams described in text or practical scenarios.
- Wrong options must be believable mistakes made by real students.
- For Mathematics, questions must require working.
- For Chemistry/Physics/Biology, questions must test explanation, prediction, process, calculation, observation or experimental skill.
- For English/Kiswahili, test grammar, comprehension, tone, register, literature, functional writing and language use.
- For English/Kiswahili Form 3-4, include set-book/excerpt/essay practice when appropriate.
`
  }

  if (type === 'kjsea') {
    return `
KJSEA / CBC JUNIOR SECONDARY BLUEPRINT:
Grade detected: ${grade || className || 'Grade 7–9'}.
- Test Grade 7–9 competencies only.
- Use practical Kenyan scenarios.
- Questions must assess what the learner can DO with knowledge.
- Include interpretation, application, community situations, simple data, tables, environmental awareness, communication and problem solving.
- Avoid senior KCSE-only content.
- For English/Kiswahili, train KJSEA language competencies using short extracts, oral/language tasks, functional writing and inferencing.
`
  }

  if (type === 'kpsea') {
    return `
KPSEA / CBC PRIMARY BLUEPRINT:
Grade detected: ${grade || className || 'Grade 4–6'}.
- Use simple clear language.
- Use home, school, market, farm and community examples.
- Avoid secondary-school abstract content.
- Questions must test practical understanding and everyday application.
- For English/Kiswahili/literacy, train KPSEA comprehension, grammar in context, vocabulary, oral skills and simple functional writing.
`
  }

  return `
KENYAN CURRICULUM BLUEPRINT:
- Adapt to the learner's class.
- Keep questions within the Kenyan syllabus.
- Use exam-style active recall.
`
}

function getQuestionQualityRules() {
  return `
QUESTION QUALITY RULES:
Every question must satisfy at least 4 of these:
1. Tests a specific subtopic, not a broad chapter.
2. Uses a Kenyan or school-life context.
3. Includes a common misconception as a distractor.
4. Requires reasoning, calculation, interpretation or explanation.
5. Has exactly one correct answer.
6. Explanation teaches the concept clearly.
7. Uses KCSE/KJSEA/KPSEA wording style.
8. For Math/Science, includes data, formula, observation, graph/table, diagram description or experiment.
9. Avoids "all of the above" and "none of the above".
10. Avoids generic textbook questions.
11. If a question says "graph", "table", "diagram", "experiment" or "reaction", the data/description/equation must be included in the question text or excerpt.
12. For Chemistry equilibrium questions, include the balanced equation and enough information to decide the shift.
13. For Chemistry industrial process questions, test KCSE process facts: raw materials, catalyst, optimum conditions, reactions, products, observations or yield compromise.
14. For Chemistry energy changes in Form 3-4, prefer KCSE-standard Hess law cycles, enthalpy of combustion calculations, enthalpy of neutralisation calorimetry, bond enthalpy calculations, hydration/lattice energy data interpretation, or fuel value calculations. Avoid one-step "energy level of reactants/products" MCQs unless it is only an introductory Form 2/3 item.

BAD:
"What is photosynthesis?"

STRONG:
"A destarched leaf was partly covered with black paper and exposed to sunlight. After iodine testing, only the uncovered part turned blue-black. Which conclusion is best supported?"

BAD MATH:
"Solve 2x + 3 = 7"

STRONG MATH:
"A trader bought 3 calculators and 2 geometrical sets for Ksh 1,450. Another bought 2 calculators and 5 geometrical sets for Ksh 1,900. Find the cost of one calculator."

BAD CHEMISTRY:
"The energy level of reactants is 220 kJ while products are 145 kJ. What is the enthalpy change?"

STRONG CHEMISTRY:
"The molar enthalpies of combustion of carbon, hydrogen and methane are -394 kJ mol^-1, -285 kJ mol^-1 and -890 kJ mol^-1 respectively. Use Hess law to calculate the enthalpy change for CH4(g) -> C(s) + 2H2(g)."
`
}

function buildSystemPrompt(type: CurriculumType, className: string, curriculumName: string) {
  return `
You are Peak Coach's KNEC Question Engine.

You are not a generic AI quiz generator.
You behave like:
- A KCSE chief examiner for 8-4-4 Form 1–4.
- A KJSEA assessment setter for CBC Junior Secondary.
- A KPSEA assessment setter for CBC Primary.

Your job:
Generate strong active recall questions that help Kenyan learners master the syllabus and prepare for KCSE, KJSEA or KPSEA.

Learner context:
Class: ${className || 'Unknown class'}
Curriculum: ${curriculumName || 'Kenyan curriculum'}
Detected assessment type: ${type}

Question philosophy:
- Test understanding, not shallow memorisation.
- Make distractors intelligent.
- Use Kenyan contexts.
- Keep content strictly within the learner's level.
- Prefer examiner-style questions.
- Avoid vague, childish or generic questions.
`
}

function buildUserPrompt(params: {
  curriculumType: CurriculumType
  className: string
  curriculumName: string
  curriculumContext: string
  registeredSubjects: string[]
  sessionSeed: string
  difficultyMix: string
  adaptiveProfile: ReturnType<typeof getBrainGymAdaptiveProfile>
  explicitSubjectFilter?: boolean
  excludeFingerprints?: string[]
  context?: 'brain_gym' | 'duel'
  trainingMode?: BrainGymTrainingMode
  selectedSetBook?: string
  learningMemoryPrompt?: string
}) {
  const {
    curriculumType,
    className,
    curriculumName,
    curriculumContext,
    registeredSubjects,
    sessionSeed,
    difficultyMix,
    adaptiveProfile,
    explicitSubjectFilter,
    context,
    trainingMode = 'mixed',
    selectedSetBook,
    learningMemoryPrompt,
  } = params

  const { excludeFingerprints } = params
  const styleRotation = context === 'duel'
    ? QUESTION_STYLES.filter(style => style !== 'essay_response' && style !== 'functional_writing')
    : trainingMode === 'essay' || trainingMode === 'biology_essay'
      ? ['essay_response']
    : ['excerpt', 'setbook', 'poetry', 'ushairi', 'character_analysis', 'theme_analysis', 'style_analysis', 'context_questions', 'character_relationships', 'plot_revision', 'timed_mock', 'kcse_prediction', 'random_challenge'].includes(trainingMode)
        ? ['excerpt_analysis', 'essay_response']
        : trainingMode === 'structured'
          ? ['data_response', 'experiment_based', 'reason_giving', 'concept_comparison']
    : QUESTION_STYLES
  const isSelectedSetBookEssay = Boolean(selectedSetBook && trainingMode === 'essay')
  const isSelectedSetBookExcerpt = Boolean(selectedSetBook && trainingMode === 'excerpt')
  const answerModeRule = context === 'duel'
    ? `DUEL MODE: every question MUST use answerMode "mcq"; do not generate essay_response, functional_writing, composition, long answer or marking-rubric tasks. Duels are fast scored MCQ battles only.`
    : isSelectedSetBookEssay
      ? `KCSE SET BOOK ESSAY MODE: generate exactly ONE answerMode "essay" task only. Include essayPrompt, markingRubric and maxMarks 20. The question must sound like an authentic KCSE Paper 3 examiner question, not a generic literature prompt.`
    : isSelectedSetBookExcerpt
      ? `KCSE SET BOOK EXCERPT MODE: generate exactly ONE structured excerpt-analysis task worth 20 marks. It MUST use answerMode "essay", include excerpt, essayPrompt, markingRubric and maxMarks 20. If the excerpt is AI-created, clearly label it as an original practice excerpt, not a verbatim extract from the book.`
    : trainingMode === 'essay' || trainingMode === 'biology_essay'
      ? `WRITING MODE: generate essay_response questions only. Every question MUST use answerMode "essay", include essayPrompt, markingRubric and maxMarks. Generate 3 strong writing tasks, not 10 short MCQs.`
      : ['excerpt', 'setbook', 'poetry', 'ushairi', 'character_analysis', 'theme_analysis', 'style_analysis', 'context_questions', 'character_relationships', 'plot_revision', 'timed_mock', 'kcse_prediction', 'random_challenge'].includes(trainingMode)
        ? `LITERATURE TRAINING MODE: mix close-reading MCQs and essay_response tasks. Every excerpt/poem/ushairi task must include a complete original passage or poem in excerpt and a strict markingRubric when answerMode is "essay".`
        : `Essay/writing practice is allowed only in Brain Gym. If essay_response is included, include answerMode "essay", essayPrompt, markingRubric and maxMarks. Use at most 1 essay_response in a 10-question session.`
  const countRule = isSelectedSetBookEssay
    ? 'Generate exactly 1 authentic KCSE set book essay question worth 20 marks.'
    : isSelectedSetBookExcerpt
      ? 'Generate exactly 1 authentic KCSE set book excerpt practice task worth 20 marks.'
    : trainingMode === 'essay' || trainingMode === 'biology_essay'
    ? 'Generate exactly 3 strong Peak Coach Brain Gym writing tasks.'
    : 'Generate exactly 10 strong Peak Coach Brain Gym questions.'
  const trainingModePrompt = getTrainingModePrompt(trainingMode, registeredSubjects)
  const modeLock = trainingMode === 'poetry'
    ? `ABSOLUTE MODE LOCK: ENGLISH POETRY ONLY.
- Every returned question.subject MUST be "English".
- Every returned question.topic MUST be "Poetry".
- Do not generate grammar, comprehension, set-book, oral literature or general English questions.
- Every item MUST include an original complete poem in excerpt: 3-4 stanzas, 3-4 lines per stanza.
- Questions must ask KCSE English Paper 2 poetry analysis: persona, tone, mood, imagery, symbolism, sound devices, structure, theme, attitude and evidence.
- If answerMode is "essay", use structured Questions with mark allocation, not the label "Essay Prompt". Rotate devices across imagery, symbolism, sound, repetition, contrast, irony, rhetorical questions, persona, tone, mood, structure and message.`
    : trainingMode === 'ushairi'
      ? `ABSOLUTE MODE LOCK: KISWAHILI USHAIRI ONLY.
- Every returned question.subject MUST be "Kiswahili".
- Every returned question.topic MUST be "Ushairi".
- Do not generate sarufi, ufahamu, insha, fasihi simulizi or general Kiswahili questions.
- Every item MUST include an original complete shairi in excerpt: 3-4 beti, preferably 4 mishororo per ubeti.
- Questions must ask KCSE Kiswahili Paper 2 ushairi analysis: vina, mizani, bahari, nafsi neni, dhamira, maudhui, toni, taswira, uhuru wa kishairi, mbinu za lugha and ushahidi kutoka shairini.
- If answerMode is "essay", use "Maswali" with parts and mark allocation, not "Essay Prompt". Rotate between kimapokeo, kisasa and huru where suitable. Rotate devices across takriri, tashibiha, sitiari, tanakali sauti, nahau, methali, kinaya, kejeli, maswali balagha, uhaishaji, tashhisi, tashtiti, jazanda, ishara, mandhari, muwala, muundo, mtiririko, mizani, vina, kibwagizo and mawimbi ya hisia.`
      : selectedSetBook
        ? `ABSOLUTE MODE LOCK: SELECTED SET BOOK ONLY.
- Generate from "${selectedSetBook}" only.
- Do not generate general ${registeredSubjects.join('/')} questions.
- Do not generate poetry or ushairi unless the selected text itself is being used through an original practice excerpt.
- If the lane is Excerpts, include an original practice passage inspired by "${selectedSetBook}" and clearly label it: "Original practice excerpt created for learning only (not a verbatim extract from the set book)" or "Dondoo la mazoezi lililobuniwa kwa madhumuni ya kujifunza (sio dondoo halisi kutoka kitabuni)".
- Excerpt mode must be a 20-mark structured task, not one MCQ. It must include parts similar to: identify the issue (2), link it to "${selectedSetBook}" with illustrations (6), discuss a relevant character (4), analyse one stylistic device (3), explain importance to the author's message (5).
- Excerpt answers must require knowledge of "${selectedSetBook}", not just general comprehension of the passage.
- If the lane is Essays, generate ONE authentic KCSE Paper 3/Fasihi essay question only.
- For English set books, output the essay prompt in this format inside question and essayPrompt: English Literature; Paper 3; Book: ${selectedSetBook}; Question: "Using illustrations from ${selectedSetBook}, ..."; (20 marks).
- For Kiswahili set books, output the essay prompt in this format inside question and essayPrompt: Kiswahili; Karatasi ya 3; Kitabu: ${selectedSetBook}; Swali: "Kwa kurejelea ${selectedSetBook}, ..."; (20 Alama).
- The essay question MUST test one specific arguable area: theme, character trait, character development, relationship, conflict, leadership, corruption, justice, family, betrayal, tradition, gender, identity, power, social responsibility, irony, symbolism, humour, satire, style, narrative technique, ujumbe, maudhui, wahusika, migogoro, mtindo, mandhari, ploti or msimamo wa mwandishi.
- Avoid vague prompts such as "character choices reveal the main concerns", "discuss the main themes", "write about the book", or "summarize the novel".
- Use authentic KCSE command wording: Using illustrations from, Drawing examples from, With close reference to, Discuss, Show how, Justify, Jadili, Fafanua, Eleza, Thibitisha, Tathmini, Bainisha.
- For character, theme, style, relationship, context and plot lanes, all questions must name or clearly refer to details from "${selectedSetBook}" only.`
        : ''

  const subjectConstraint = registeredSubjects.length
    ? `${explicitSubjectFilter ? 'SELECTED SUBJECT FILTER' : 'REGISTERED SUBJECTS'} - STRICTLY generate questions from these only:
${registeredSubjects.join(', ')}
Every returned question.subject MUST be one of: ${registeredSubjects.join(', ')}.
Do not include any other subject, even if it is related.`
    : `No registered subjects found. Generate balanced Kenyan curriculum questions for ${curriculumContext}.`

  const excludeBlock = excludeFingerprints && excludeFingerprints.length > 0
    ? `\nDO NOT generate these questions — the student has already seen them:\n${excludeFingerprints.join('\n')}\nEvery question MUST be completely different from the above.\n`
    : ''

  return `
${countRule}

LEARNER:
${curriculumContext}

CURRICULUM:
${curriculumName}

SESSION SEED:
${sessionSeed}

DIFFICULTY MIX:
${difficultyMix}

ADAPTIVE BRAIN GYM PROFILE:
${adaptiveProfile.label}
- Visual style: ${adaptiveProfile.visualStyle}
- Language tone: ${adaptiveProfile.languageTone}
- Question demand: ${adaptiveProfile.questionDemand}
- Reward tone: ${adaptiveProfile.rewardTone}
- Minimum quality bar: every question should meet at least ${adaptiveProfile.minimumQualityScore} quality signals.

${subjectConstraint}

${getExamBlueprint(curriculumType, className)}

${getSubjectTopics(registeredSubjects)}

${getKcseClassCoverage(registeredSubjects, className)}

${getCbcGradeCoverage(registeredSubjects, className)}

${getCbcVisualLearningEngine(curriculumType, registeredSubjects, className, context)}

${getLanguageSetBookPrompt(registeredSubjects, className)}

${getSelectedSetBookPrompt(selectedSetBook)}

${getCbcLanguagePrompt(registeredSubjects, className)}

${getLanguageLiteratureCoverage(registeredSubjects, className)}

${getKcseMathematicsStatisticsEngine(registeredSubjects, className)}

${getPriorityTopics(registeredSubjects)}

${getMisconceptions(registeredSubjects)}

${learningMemoryPrompt || ''}

${getQuestionQualityRules()}

${trainingModePrompt}

${modeLock}

QUESTION STYLE ROTATION:
Use a strong mix from:
${styleRotation.join(', ')}${excludeBlock}

SPECIAL INSTRUCTIONS:
- ${context === 'duel' ? 'This request is for a duel battle.' : 'This request is for Brain Gym practice.'}
- ${answerModeRule}
- Do not generate 10 questions of the same style.
- Do not overuse one topic. In a 10-question session, no topic should appear more than 2 times unless the student explicitly selected that exact topic.
- At least 3 questions must be application/scenario/data/experiment/graph/calculation based.
- If Mathematics is included, include at least one multi-step KCSE-style calculation. For Form 2, include indices/logarithms/quadratics where appropriate. For Form 3-4, make the calculation KCSE B/A standard.
- If Mathematics Form 3-4 includes Statistics, do not ask definitions. Use realistic data, grouped frequency tables, cumulative frequency, quartiles, standard deviation, histograms, ogives or interpretation with marks and working.
- If Chemistry is included, include structure and bonding, mole/equation skill, electrochemistry, rates, organic or energy changes as the class level allows. For Form 2, explicitly include chemical bonding and structure.
- Chemistry equation rule: if the question involves a reaction, equilibrium, electrolysis, redox, organic reaction, gas preparation, industrial process, acid/base neutralisation or displacement, the question text or excerpt MUST show the balanced or examinable equation using symbols such as CO2(g) + H2O(l) ⇌ H2CO3(aq). Do not ask learners to predict equilibrium shifts without the equation and state information.
- If Science is included, include at least one experiment, observation, graph/table, equation, diagram description or process-based question.
- If English/Kiswahili is included, include grammar or language-in-context, not only literature recall.
- If English/Kiswahili Form 3-4 is included, include at least 2 set-book/literature/excerpt questions across the 10 questions unless the selected topic is purely grammar.
- For duel language/literature/poetry/ushairi tasks, use MCQ excerpt analysis only; never ask the student to write an essay inside a timed duel.
- For language excerpts, write a short original extract of 60-120 words or a paraphrased situation. Do not copy long passages from set books.
- For English poem questions, the excerpt must be a complete original poem of 3-4 stanzas with 3-4 lines per stanza, not a two-line snippet.
- For Kiswahili ushairi questions, the excerpt must be a complete original shairi of 3-4 beti, preferably 4 mishororo per ubeti where suitable, not a two-line snippet.
- For CBC poem/song/oral literature tasks, use a complete age-appropriate original piece: 2-3 stanzas for KPSEA, 3-4 stanzas for KJSEA.
- If CBC is detected, use competency-based practical situations that prepare Grade 6 for KPSEA and Grade 7-9 for KJSEA.
- Do not exceed the learner's class level.
- For Form 3 and Form 4, avoid easy recall. Most questions must be hard, challenging, examiner-style and require careful reasoning.
- Use realistic Kenyan names, places, schools, farms, shops, labs, counties or daily life contexts.

OUTPUT RULES:
Return ONLY valid JSON.
No markdown.
No comments.
No backticks.

Format:
{
  "questions": [
    {
      "id": "q1",
      "subject": "Mathematics",
      "topic": "Trigonometry",
      "subtopic": "Trigonometric identities",
      "difficulty": "hard",
      "examStandard": "kcse_a",
      "questionStyle": "calculation",
      "answerMode": "mcq",
      "excerpt": "optional short original extract for language/literature questions",
      "sourceText": "optional set book or text label",
      "essayPrompt": "optional essay prompt when answerMode is essay",
      "markingRubric": ["optional marking point 1", "optional marking point 2"],
      "maxMarks": 20,
      "visualScene": {
        "sceneType": "Modern Physics Classroom",
        "background": "Blackboard",
        "style": "Grade 9 professional clean academy",
        "objects": ["teacher desk", "chalk", "car illustration", "motion arrows"],
        "diagram": "motion diagram",
        "interactionType": "mcq",
        "workingTools": ["formula helper", "working area", "answer box"],
        "visualPrompt": "Blackboard shows a car starting from rest, final velocity 40 m/s, time 8 s, and arrows showing motion from left to right."
      },
      "question": "...",
      "options": ["...","...","...","..."],
      "correctAnswer": "exact option text",
      "explanation": "..."
    }
  ]
}
`
}

function buildCompactBrainGymPrompt(params: {
  curriculumType: CurriculumType
  className: string
  curriculumName: string
  registeredSubjects: string[]
  sessionSeed: string
  difficultyMix: string
  explicitSubjectFilter?: boolean
  context?: 'brain_gym' | 'duel'
  trainingMode?: BrainGymTrainingMode
  selectedSetBook?: string
  excludeFingerprints?: string[]
}) {
  const {
    curriculumType,
    className,
    curriculumName,
    registeredSubjects,
    sessionSeed,
    difficultyMix,
    explicitSubjectFilter,
    context,
    trainingMode = 'mixed',
    selectedSetBook,
    excludeFingerprints = [],
  } = params
  const isCbc = curriculumType === 'kpsea' || curriculumType === 'kjsea' || registeredSubjects.some(subjectLooksCbc)
  const count = selectedSetBook && trainingMode === 'essay'
    ? 1
    : selectedSetBook && trainingMode === 'excerpt'
      ? 1
      : trainingMode === 'essay' || trainingMode === 'biology_essay'
        ? 3
        : 10
  const answerMode = context === 'duel'
    ? 'All questions MUST be answerMode "mcq".'
    : trainingMode === 'essay' || trainingMode === 'biology_essay'
      ? 'Generate answerMode "essay" writing tasks with essayPrompt, markingRubric and maxMarks.'
      : 'Use mostly answerMode "mcq"; use essay only when the selected lane demands writing.'
  const subjectLine = registeredSubjects.length
    ? `STRICT SUBJECTS: ${registeredSubjects.join(', ')}. Every question.subject MUST be exactly one of these.`
    : 'Use Kenyan curriculum subjects appropriate to the class.'
  const cbcLine = isCbc
    ? `CBC VISUAL REQUIREMENT: every question must be competency-based for ${className || 'the learner grade'} and include visualScene with sceneType, background, style, objects, diagram, interactionType, workingTools, visualPrompt. Use subject-relevant scenes: Mathematics uses graph paper/geometry board/calculator; Integrated Science uses lab/apparatus/circuits; Social Studies uses Kenya maps/charts; English uses reading corner; Kiswahili uses darasa/ubao; Pre-Technical uses workshop/tools. Do not generate KCSE/Form topics.`
    : 'KCSE REQUIREMENT: use examiner-style Kenyan 8-4-4 questions inside the learner class scope.'
  const setBookLine = selectedSetBook
    ? `SELECTED SET BOOK ONLY: ${selectedSetBook}. Generate only this text/lane; no general subject questions.`
    : ''
  const seenLine = excludeFingerprints.length
    ? `Avoid repeating questions similar to these fingerprints: ${excludeFingerprints.slice(-30).join(', ')}.`
    : ''

  return `
Generate ${count} Peak Coach ${context === 'duel' ? 'duel' : 'Brain Gym'} questions.

Learner: ${className || 'Unknown class'} / ${curriculumName || 'Kenyan curriculum'} / ${curriculumType}
Session seed: ${sessionSeed}
Difficulty mix: ${difficultyMix}
Training mode: ${trainingMode}
${subjectLine}
${explicitSubjectFilter ? 'The selected subject filter is strict. Do not add other subjects.' : ''}
${answerMode}
${cbcLine}
${setBookLine}
${seenLine}

Quality rules:
- Do not repeat a topic more than once unless absolutely necessary.
- Keep each question under 55 words and each explanation under 70 words.
- Keep visualPrompt under 35 words. It is internal and should only describe the diagram/scene data.
- For Mathematics-CBC, rotate Number, Algebra, Geometry, Measurement, Data handling, Probability and practical reasoning.
- For grouped statistics, put the intervals/frequencies in the question text as "20-29: 4, 30-39: 7..." and explain using midpoints or cumulative frequency step by step.
- Distractors must be realistic learner mistakes.
- Explanation must be a clear workout: formula or idea, substitution/working, final answer, and common trap.
- If a visualScene is included, it must match the actual question. No physics scene for geometry; no speed graph for a circle.
- Return valid JSON only. No markdown, no comments, no backticks.

Schema:
{
  "questions": [{
    "id": "q1",
    "subject": "${registeredSubjects[0] || 'Mathematics-CBC'}",
    "topic": "Specific topic",
    "subtopic": "Specific subtopic",
    "difficulty": "easy|medium|hard",
    "examStandard": "${isCbc ? 'cbc_standard' : 'exam_standard'}",
    "questionStyle": "calculation|data_response|application_scenario|experiment_based|excerpt_analysis|essay_response",
    "answerMode": "mcq",
    "excerpt": "",
    "visualScene": {
      "sceneType": "Subject-relevant scene",
      "background": "Board/lab/map/workshop",
      "style": "Grade-appropriate visual style",
      "objects": ["relevant prop"],
      "diagram": "relevant diagram",
      "interactionType": "mcq",
      "workingTools": ["formula helper", "working area", "answer box"],
      "visualPrompt": "Internal scene description matching the question only"
    },
    "question": "...",
    "options": ["A realistic option","A realistic option","A realistic option","A realistic option"],
    "correctAnswer": "exact option text",
    "explanation": "Step-by-step workout explanation."
  }]
}
`
}

function scoreQuestionQuality(q: BrainGymQuestion): number {
  let score = 0

  const text = `${q.question} ${q.explanation}`.toLowerCase()

  if (q.question.length >= 80) score += 1
  if (q.explanation.length >= 80) score += 1
  if (q.subtopic && q.subtopic.length > 2) score += 1
  if (q.questionStyle && q.questionStyle !== 'exam_style_recall') score += 1
  if (q.difficulty === 'hard') score += 1
  if (q.examStandard === 'kcse_a' || q.examStandard === 'kcse_b') score += 1
  if (/(calculate|determine|find|work out|solve|mass|volume|ratio|gradient|angle|probability|mean|moles|voltage|current)/i.test(q.question)) score += 1
  if (/(experiment|observed|apparatus|graph|table|diagram|data|sample|student|learner|farmer|trader|school|laboratory)/i.test(q.question)) score += 1
  if (/(blackboard|sketch|map|chart|labelled|labeled|grid|circuit|food plate|farm layout|soil profile|weather chart|budget table|tool diagram|safety symbol)/i.test(`${q.question} ${q.excerpt || ''}`)) score += 1
  if (/(because|therefore|this shows|this means|hence|since|ratio|equation|formula)/i.test(q.explanation)) score += 1
  if (/(kamau|wanjiku|otieno|akinyi|muthoni|nairobi|mombasa|kisumu|rift valley|kenya|county|shamba|market)/i.test(text)) score += 1

  return score
}

function violatesKenyanSyllabusGuard(q: BrainGymQuestion): boolean {
  const combined = `${q.subject} ${q.topic} ${q.subtopic || ''} ${q.question} ${q.excerpt || ''} ${q.explanation}`
  const text = combined.toLowerCase()

  if (/(differentiat|derivative|gradient function)/.test(text) && /(sin|cos|tan|product rule|quotient rule)/.test(text)) return true
  if (/(vector|magnitude)/.test(text) && /\bk\b|-\s*\d+\s*k|\+\s*\d+\s*k/.test(text)) return true
  if (/(equilibrium constant|\bkc\b|\bkp\b|constant for the reaction)/.test(text)) return true
  if (/(potential energy of a molecule|distance between its atoms|molecular potential)/.test(text)) return true
  if (/(graph below|diagram below|table below|shown below)/.test(text)) return true

  const saysGraph = /(graph|table|diagram)/.test(text)
  const hasData = /\d/.test(q.question) || Boolean(q.excerpt)
  if (saysGraph && !hasData) return true

  const isKcseMathStats = /mathematics/i.test(q.subject) && /statistics|mean|median|mode|variance|standard deviation|quartile|ogive|histogram|frequency|cumulative/i.test(combined)
  if (isKcseMathStats) {
    if (/^(what is|define|state the meaning of)\b/i.test(q.question.trim())) return true
    if (/(what is (the )?(mean|median|mode|variance|standard deviation|quartile)|define (mean|median|mode|variance|standard deviation))/i.test(text)) return true
    const numberCount = (combined.match(/\d+/g) || []).length
    const hasTableOrIntervals = /(\d+\s*-\s*\d+|frequency|class interval|cumulative|table|marks|rainfall|yield|profit|population|patients|household|income|score)/i.test(combined)
    if (numberCount < 4 && !hasTableOrIntervals) return true
  }

  const hasDisplayedEquation = /(?:[A-Z][a-z]?\d*(?:\([a-z]+\))?)\s*(?:\+|->|→|⇌|<=>|=)/.test(combined) ||
    /(?:->|→|⇌|<=>)/.test(combined)
  const needsChemistryEquation = /chemistry/i.test(q.subject) &&
    /(reaction|equilibrium|electrolysis|redox|oxidation|reduction|neutralisation|neutralization|displacement|organic|alkane|alkene|alkyne|alcohol|acid|ester|haber|contact|ostwald|solvay|industrial process|preparation of|reacts with|formed from)/i.test(text)
  if (needsChemistryEquation && !hasDisplayedEquation) return true

  const isEquilibrium = /equilibrium/.test(text)
  const hasEquation = /→|<-|⇌|=|\+\s*[a-z0-9(]/i.test(q.question) || /reaction/i.test(q.question)
  if (isEquilibrium && !hasEquation) return true

  return false
}

function improveQuestionOrder(questions: BrainGymQuestion[]) {
  const ranked = [...questions]
    .filter(q => !violatesKenyanSyllabusGuard(q))
    .sort((a, b) => scoreQuestionQuality(b) - scoreQuestionQuality(a))

  const selected: BrainGymQuestion[] = []
  const topicCounts = new Map<string, number>()
  const subtopicCounts = new Map<string, number>()

  const pickWithTopicCap = (maxPerTopic: number) => {
    for (const q of ranked) {
      if (selected.length >= 10) break
      if (selected.some(item => item.fingerprint && item.fingerprint === q.fingerprint)) continue
      const topicKey = normaliseText(`${q.subject}:${q.topic || 'general'}`)
      const subtopicKey = normaliseText(`${q.subject}:${q.topic || 'general'}:${q.subtopic || q.question.slice(0, 40)}`)
      const topicCount = topicCounts.get(topicKey) || 0
      const subtopicCount = subtopicCounts.get(subtopicKey) || 0
      if (topicCount >= maxPerTopic || subtopicCount >= 1) continue
      topicCounts.set(topicKey, topicCount + 1)
      subtopicCounts.set(subtopicKey, subtopicCount + 1)
      selected.push(q)
    }
  }

  pickWithTopicCap(1)
  if (selected.length < 8) pickWithTopicCap(2)

  return selected
    .slice(0, 10)
    .map((q, index) => ({ ...q, id: `q${index + 1}` }))
}

function getDifficultyMix(profile?: ReturnType<typeof getBrainGymAdaptiveProfile>) {
  if (profile) return pickBrainGymDifficultyMix(profile)

  const mixes = [
    '3 easy, 4 medium, 3 hard',
    '2 easy, 5 medium, 3 hard',
    '2 easy, 4 medium, 4 hard',
    '1 easy, 5 medium, 4 hard',
  ]

  return mixes[Math.floor(Math.random() * mixes.length)]
}

function questionLooksCbc(q: BrainGymQuestion) {
  const combined = `${q.subject} ${q.topic} ${q.subtopic || ''} ${q.examStandard || ''}`.toLowerCase()
  return q.examStandard === 'cbc_standard' || subjectLooksCbc(q.subject) || /(kpsea|kjsea|grade\s*[4-9]|cbc|integrated science|science & technology|social studies|pre-technical|agriculture & nutrition)/i.test(combined)
}

function getVisualSubjectEnvironment(subject: string) {
  const normalized = normaliseText(subject)

  if (normalized.includes('math')) {
    return {
      sceneType: 'Mathematics Smart Blackboard',
      background: 'Blackboard with graph paper side panel',
      objects: ['ruler', 'protractor', 'calculator', 'chalk', 'coordinate grid'],
      diagram: 'calculation board or geometry/grid sketch',
      workingTools: ['formula helper', 'working area', 'answer box', 'unit reminder'],
    }
  }

  if (normalized.includes('science') || normalized.includes('biology') || normalized.includes('chemistry') || normalized.includes('physics')) {
    return {
      sceneType: 'Integrated Science Laboratory',
      background: 'Laboratory bench and labelled investigation board',
      objects: ['beaker', 'circuit board', 'microscope', 'plant specimen', 'safety goggles'],
      diagram: 'apparatus sketch or investigation table',
      workingTools: ['observation table', 'formula helper', 'answer box', 'safety clue'],
    }
  }

  if (normalized.includes('social')) {
    return {
      sceneType: 'Kenya Map Room',
      background: 'Kenya map wall with data chart',
      objects: ['map pins', 'globe', 'timeline strip', 'weather chart', 'population graph'],
      diagram: 'map, timeline or chart evidence',
      workingTools: ['map key', 'evidence notes', 'answer box'],
    }
  }

  if (normalized.includes('kiswahili')) {
    return {
      sceneType: 'Darasa la Kiswahili',
      background: 'Ubao wa fasihi na mazungumzo',
      objects: ['ubao', 'daftari', 'kadi za msamiati', 'shairi board', 'wahusika cards'],
      diagram: 'fasihi notice board or shairi layout',
      workingTools: ['kidokezo cha msamiati', 'nafasi ya jibu', 'ushahidi wa matini'],
    }
  }

  if (normalized.includes('english') || normalized.includes('literacy')) {
    return {
      sceneType: 'Library Reading Corner',
      background: 'Notice board and reading table',
      objects: ['storybook', 'newspaper', 'school magazine', 'dictionary', 'notice board'],
      diagram: 'reading extract board',
      workingTools: ['vocabulary clue', 'evidence notes', 'answer box'],
    }
  }

  if (normalized.includes('pretechnical') || normalized.includes('technical')) {
    return {
      sceneType: 'Pre-Technical Workshop',
      background: 'Workshop bench and engineering drawing board',
      objects: ['ruler', 'measuring tape', 'spanner', 'safety sign', 'drawing board'],
      diagram: 'tool sketch or safety layout',
      workingTools: ['measurement helper', 'safety clue', 'answer box'],
    }
  }

  return {
    sceneType: 'CBC Learning Studio',
    background: 'Smart classroom board',
    objects: ['blackboard', 'notebook', 'label cards', 'teacher pointer'],
    diagram: 'labelled learning scene',
    workingTools: ['thinking clue', 'working area', 'answer box'],
  }
}

function getGradeVisualStyle(profile: ReturnType<typeof getBrainGymAdaptiveProfile>) {
  if (profile.band === 'grade6') return 'Grade 6 colourful guided illustration with big friendly icons'
  if (profile.band === 'grade7') return 'Grade 7 educational textbook style with clear labelled visuals'
  if (profile.band === 'grade8') return 'Grade 8 semi-realistic modern classroom style'
  if (profile.band === 'grade9') return 'Grade 9 professional clean academy style, not childish'
  return profile.visualStyle
}

function buildFallbackVisualScene(q: BrainGymQuestion, profile: ReturnType<typeof getBrainGymAdaptiveProfile>): VisualQuestionScene {
  const env = getVisualSubjectEnvironment(q.subject)
  const contextBlock = q.excerpt || q.sourceText || q.question

  return {
    sceneType: env.sceneType,
    background: env.background,
    style: getGradeVisualStyle(profile),
    objects: env.objects,
    diagram: env.diagram,
    interactionType: q.answerMode === 'essay' ? 'short-working' : 'mcq',
    workingTools: env.workingTools,
    visualPrompt: `Display a CBC ${q.subject || 'subject'} scene for ${q.topic || 'this skill'}. Put this on the board: ${contextBlock}`,
  }
}

function visualSceneFitsQuestion(q: BrainGymQuestion) {
  if (!q.visualScene) return false
  const subject = normaliseText(q.subject || '')
  const sceneText = `${q.visualScene.sceneType || ''} ${q.visualScene.background || ''} ${q.visualScene.diagram || ''} ${(q.visualScene.objects || []).join(' ')} ${q.visualScene.visualPrompt || ''}`.toLowerCase()
  const questionText = `${q.topic || ''} ${q.subtopic || ''} ${q.question || ''} ${q.excerpt || ''}`.toLowerCase()

  if (subject.includes('math') && /(physics|laboratory|lab|beaker|microscope|circuit|chemistry|biology)/i.test(sceneText)) return false
  if ((subject.includes('science') || subject.includes('chemistry') || subject.includes('physics') || subject.includes('biology')) && /(library|storybook|fasihi|darasa|map room|workshop)/i.test(sceneText)) return false
  if (subject.includes('kiswahili') && /(physics|laboratory|graph paper|calculator|science)/i.test(sceneText)) return false
  if (subject.includes('english') && /(physics|laboratory|calculator|circuit)/i.test(sceneText)) return false
  if (subject.includes('social') && /(physics|laboratory|calculator|circuit|microscope)/i.test(sceneText)) return false

  const asksCircle = /circle|radius|diameter|chord|circumference/.test(questionText)
  if (asksCircle && /(speed|velocity|acceleration|car|motion)/.test(sceneText)) return false
  const asksSpeed = /speed|velocity|acceleration|distance|time/.test(questionText)
  if (asksSpeed && /(circle|radius|diameter|chord)/.test(sceneText)) return false

  return true
}

function applyAdaptiveProfile(questions: BrainGymQuestion[], profile: ReturnType<typeof getBrainGymAdaptiveProfile>) {
  const isGradeCbcProfile = profile.band === 'grade6' || profile.band === 'grade7' || profile.band === 'grade8' || profile.band === 'grade9'

  return questions.map(q => ({
    ...q,
    examStandard: isGradeCbcProfile && q.examStandard !== 'cbc_standard' ? 'cbc_standard' : q.examStandard,
    visualScene: visualSceneFitsQuestion(q)
      ? q.visualScene
      : ((isGradeCbcProfile || questionLooksCbc(q)) ? buildFallbackVisualScene(q, profile) : undefined),
    adaptive: {
      profileLabel: profile.label,
      visualStyle: profile.visualStyle,
      languageTone: profile.languageTone,
      questionDemand: profile.questionDemand,
      rewardTone: profile.rewardTone,
      accentColor: profile.accentColor,
      cardClassName: profile.cardClassName,
    },
  }))
}

type EssayBlueprint = {
  category: string
  prompt: string
}

const ENGLISH_SET_BOOK_ESSAY_BLUEPRINTS: Record<string, EssayBlueprint[]> = {
  'fathers of nations': [
    { category: 'Power and suffering', prompt: 'Using illustrations from Fathers of Nations, discuss how abuse of political power contributes to suffering in society.' },
    { category: 'Greed and moral decay', prompt: "'Greed destroys both individuals and nations.' Using illustrations from Fathers of Nations, justify this statement." },
    { category: 'Leadership', prompt: 'With close reference to Fathers of Nations, show how poor leadership frustrates the dream of a better society.' },
    { category: 'Satire', prompt: 'Drawing examples from Fathers of Nations, examine how satire exposes moral decay among leaders.' },
    { category: 'Social responsibility', prompt: 'Using illustrations from Fathers of Nations, discuss the need for responsible leadership in solving social problems.' },
    { category: 'Women and change', prompt: 'With close reference to Fathers of Nations, discuss the role of women in challenging injustice and social decay.' },
    { category: 'Conflict', prompt: 'Using illustrations from Fathers of Nations, show how selfish interests create conflict in society.' },
    { category: 'Betrayal', prompt: 'Drawing examples from Fathers of Nations, discuss how betrayal undermines trust among individuals and communities.' },
  ],
  'the samaritan': [
    { category: 'Corruption', prompt: 'Using illustrations from The Samaritan, show how corruption damages public institutions and ordinary lives.' },
    { category: 'Youth and technology', prompt: 'With close reference to The Samaritan, discuss how young people can use technology to fight social evils.' },
    { category: 'Leadership', prompt: "'Bad leadership breeds fear and injustice.' Using illustrations from The Samaritan, justify this statement." },
    { category: 'Courage', prompt: 'Drawing examples from The Samaritan, examine how courage helps characters confront wrongdoing.' },
    { category: 'Justice', prompt: 'Using illustrations from The Samaritan, discuss the struggle for justice in a corrupt society.' },
  ],
  'a silent song and other stories': [
    { category: 'Human suffering', prompt: 'Using illustrations from A Silent Song and Other Stories, discuss how human suffering reveals the weaknesses of society.' },
    { category: 'Family', prompt: 'With close reference to A Silent Song and Other Stories, show how family relationships influence individual choices.' },
    { category: 'Betrayal', prompt: 'Drawing examples from A Silent Song and Other Stories, discuss the consequences of betrayal.' },
    { category: 'Social injustice', prompt: "'Injustice robs people of dignity.' Using illustrations from A Silent Song and Other Stories, justify this statement." },
  ],
  'an artist of the floating world': [
    { category: 'Memory and guilt', prompt: 'Using illustrations from An Artist of the Floating World, discuss how memory exposes guilt and regret.' },
    { category: 'Responsibility', prompt: 'With close reference to An Artist of the Floating World, show how personal choices can affect society.' },
    { category: 'Change', prompt: 'Drawing examples from An Artist of the Floating World, discuss how social change challenges personal identity.' },
    { category: 'Power of art', prompt: "'Art can serve both truth and propaganda.' Using illustrations from An Artist of the Floating World, justify this statement." },
  ],
  'artist of the floating world': [
    { category: 'Memory and guilt', prompt: 'Using illustrations from An Artist of the Floating World, discuss how memory exposes guilt and regret.' },
    { category: 'Responsibility', prompt: 'With close reference to An Artist of the Floating World, show how personal choices can affect society.' },
    { category: 'Change', prompt: 'Drawing examples from An Artist of the Floating World, discuss how social change challenges personal identity.' },
    { category: 'Power of art', prompt: "'Art can serve both truth and propaganda.' Using illustrations from An Artist of the Floating World, justify this statement." },
  ],
  'a parliament of owls': [
    { category: 'Leadership', prompt: 'Using illustrations from A Parliament of Owls, discuss how irresponsible leadership endangers society.' },
    { category: 'Satire', prompt: 'With close reference to A Parliament of Owls, show how satire is used to expose social weaknesses.' },
    { category: 'Power', prompt: "'Those in power often misuse authority for selfish gain.' Using illustrations from A Parliament of Owls, justify this statement." },
    { category: 'Social responsibility', prompt: 'Drawing examples from A Parliament of Owls, examine the importance of social responsibility.' },
  ],
}

const KISWAHILI_SET_BOOK_ESSAY_BLUEPRINTS: Record<string, EssayBlueprint[]> = {
  'nguu za jadi': [
    { category: 'Tamaa', prompt: 'Kwa kurejelea riwaya Nguu za Jadi, jadili namna tamaa inavyochangia migogoro katika jamii.' },
    { category: 'Uongozi mbaya', prompt: "'Uongozi mbaya hudumaza maendeleo ya jamii.' Jadili ukweli wa kauli hii kwa kurejelea riwaya Nguu za Jadi." },
    { category: 'Mamlaka', prompt: 'Kwa kutoa mifano kutoka Nguu za Jadi, thibitisha kuwa matumizi mabaya ya mamlaka husababisha dhuluma.' },
    { category: 'Utamaduni', prompt: 'Kwa kurejelea riwaya Nguu za Jadi, tathmini nafasi ya utamaduni katika kuunda maisha ya wahusika.' },
    { category: 'Migogoro', prompt: 'Kwa kutoa mifano kutoka Nguu za Jadi, eleza namna migogoro inavyoendeleza ploti ya riwaya.' },
    { category: 'Haki', prompt: "'Jamii isiyozingatia haki huwa chanzo cha mateso.' Jadili kauli hii kwa kurejelea Nguu za Jadi." },
  ],
  'bembea': [
    { category: 'Wanawake na maendeleo', prompt: 'Kwa kutoa mifano kutoka Bembea ya Maisha, thibitisha kuwa wanawake ni nguzo muhimu ya maendeleo ya jamii.' },
    { category: 'Familia', prompt: 'Kwa kurejelea tamthilia Bembea ya Maisha, jadili namna familia inavyoathiri maisha ya wahusika.' },
    { category: 'Mabadiliko', prompt: "'Mabadiliko ni lazima katika jamii inayotaka kusonga mbele.' Thibitisha kauli hii kwa kurejelea Bembea ya Maisha." },
    { category: 'Elimu', prompt: 'Kwa kutoa mifano kutoka Bembea ya Maisha, eleza nafasi ya elimu katika kubadilisha mtazamo wa jamii.' },
    { category: 'Mila', prompt: 'Kwa kurejelea Bembea ya Maisha, tathmini athari za mila katika maisha ya wahusika.' },
  ],
  'bembea ya maisha': [
    { category: 'Wanawake na maendeleo', prompt: 'Kwa kutoa mifano kutoka Bembea ya Maisha, thibitisha kuwa wanawake ni nguzo muhimu ya maendeleo ya jamii.' },
    { category: 'Familia', prompt: 'Kwa kurejelea tamthilia Bembea ya Maisha, jadili namna familia inavyoathiri maisha ya wahusika.' },
    { category: 'Mabadiliko', prompt: "'Mabadiliko ni lazima katika jamii inayotaka kusonga mbele.' Thibitisha kauli hii kwa kurejelea Bembea ya Maisha." },
    { category: 'Elimu', prompt: 'Kwa kutoa mifano kutoka Bembea ya Maisha, eleza nafasi ya elimu katika kubadilisha mtazamo wa jamii.' },
    { category: 'Mila', prompt: 'Kwa kurejelea Bembea ya Maisha, tathmini athari za mila katika maisha ya wahusika.' },
  ],
  'mapambazuko ya machweo na hadithi nyingine': [
    { category: 'Migogoro', prompt: "'Migogoro ndiyo msingi wa maendeleo ya ploti.' Jadili kauli hii kwa kurejelea hadithi fupi ulizosoma katika Mapambazuko ya Machweo na Hadithi Nyingine." },
    { category: 'Maudhui', prompt: 'Kwa kutoa mifano kutoka Mapambazuko ya Machweo na Hadithi Nyingine, jadili jinsi waandishi wanavyoangazia matatizo ya jamii ya kisasa.' },
    { category: 'Wahusika', prompt: 'Kwa kurejelea Mapambazuko ya Machweo na Hadithi Nyingine, thibitisha kuwa wahusika hutumiwa kuibua ujumbe muhimu katika jamii.' },
    { category: 'Mtindo', prompt: 'Kwa kutoa mifano kutoka Mapambazuko ya Machweo na Hadithi Nyingine, eleza namna mbinu za lugha zinavyoendeleza maudhui.' },
    { category: 'Haki na uwajibikaji', prompt: "'Ukosefu wa uwajibikaji husababisha mateso katika jamii.' Jadili ukweli wa kauli hii kwa kurejelea hadithi fupi ulizosoma." },
  ],
}

function normaliseBookKey(book: string) {
  return book.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function getSetBookSubject(selectedSetBook: string) {
  return /nguu|bembea|mapambazuko/i.test(selectedSetBook) ? 'Kiswahili' : 'English'
}

function pickSetBookEssayBlueprint(selectedSetBook: string): EssayBlueprint {
  const key = normaliseBookKey(selectedSetBook)
  const subject = getSetBookSubject(selectedSetBook)
  const blueprints = subject === 'Kiswahili'
    ? KISWAHILI_SET_BOOK_ESSAY_BLUEPRINTS[key]
    : ENGLISH_SET_BOOK_ESSAY_BLUEPRINTS[key]

  const fallback = subject === 'Kiswahili'
    ? [
        { category: 'Maudhui', prompt: `Kwa kurejelea ${selectedSetBook}, jadili namna uongozi mbaya unavyoathiri maendeleo ya jamii.` },
        { category: 'Wahusika', prompt: `Kwa kutoa mifano kutoka ${selectedSetBook}, thibitisha kuwa wahusika wakuu hutumiwa kufichua matatizo ya jamii.` },
        { category: 'Mtindo', prompt: `Kwa kurejelea ${selectedSetBook}, eleza namna mbinu za lugha zinavyoimarisha ujumbe wa mwandishi.` },
      ]
    : [
        { category: 'Leadership', prompt: `Using illustrations from ${selectedSetBook}, discuss how poor leadership causes suffering in society.` },
        { category: 'Character', prompt: `With close reference to ${selectedSetBook}, show how character weaknesses lead to conflict.` },
        { category: 'Style', prompt: `Drawing examples from ${selectedSetBook}, examine how style is used to expose social problems.` },
      ]

  const pool = blueprints && blueprints.length > 0 ? blueprints : fallback
  return pool[Math.floor(Math.random() * pool.length)]
}

function formatSetBookEssayPrompt(selectedSetBook: string, blueprint: EssayBlueprint) {
  const subject = getSetBookSubject(selectedSetBook)
  if (subject === 'Kiswahili') {
    return `Kiswahili
Karatasi ya 3

Kitabu:
${selectedSetBook}

Swali:
"${blueprint.prompt}"

(20 Alama)`
  }

  return `English Literature
Paper 3

Book:
${selectedSetBook}

Question:
"${blueprint.prompt}"

(20 marks)`
}

function getSetBookEssayRubric(subject: string, category: string) {
  if (subject === 'Kiswahili') {
    return [
      `Hoja kuu inayolenga kipengele cha ${category}`,
      'Mifano sahihi kutoka kitabu teule pekee',
      'Uchanganuzi wa kina badala ya kusimulia ploti',
      'Mpangilio bora wa hoja, aya na hitimisho',
      'Matumizi sahihi ya lugha ya Kiswahili na istilahi za fasihi',
    ]
  }

  return [
    `Clear thesis focused on ${category}`,
    'Accurate illustrations from the selected text only',
    'Analytical explanation rather than plot summary',
    'Well-organised paragraphs with textual evidence',
    'KCSE-level language, introduction and conclusion',
  ]
}

function getSetBookExcerptFallbackQuestions(selectedSetBook: string): BrainGymQuestion[] {
  const subject = getSetBookSubject(selectedSetBook)
  if (subject === 'Kiswahili') {
    const excerpt = `Dondoo la mazoezi lililobuniwa kwa madhumuni ya kujifunza (sio dondoo halisi kutoka kitabuni).

Mwanamke mmoja aliketi pembeni ya nyumba iliyochoka, akitazama njia ambayo watoto wake walitumia kwenda shule. Alikuwa amebeba mizigo mingi ya familia, lakini bado alizungumza kwa sauti yenye matumaini. "Nyumba husimama kwa nguzo nyingi," akasema, "lakini nguzo moja ikidhoofishwa, paa lote hutetemeka." Kijana aliyekuwa karibu naye alinyamaza, akitambua kuwa maneno hayo hayakuhusu nyumba pekee bali pia familia, mila na mabadiliko yaliyokuwa yakigonga mlango wa jamii yao.`

    return [
      {
        id: 'setbook-excerpt-fallback-1',
        subject: 'Kiswahili',
        topic: selectedSetBook,
        subtopic: 'Dondoo la mazoezi, muktadha na uhusishaji wa kitabu',
        difficulty: 'hard',
        examStandard: 'kcse_b',
        questionStyle: 'excerpt_analysis',
        answerMode: 'essay',
        excerpt,
        sourceText: selectedSetBook,
        essayPrompt: `Kiswahili
Karatasi ya 3

Kitabu:
${selectedSetBook}

Dondoo la mazoezi lililobuniwa kwa madhumuni ya kujifunza (sio dondoo halisi kutoka kitabuni).

(a) Bainisha maudhui makuu yanayojitokeza katika dondoo hili. (2)
(b) Kwa kurejelea ${selectedSetBook}, eleza jinsi maudhui hayo yanavyoendelezwa katika kitabu. (6)
(c) Taja mhusika mmoja katika ${selectedSetBook} ambaye anaweza kuhusishwa na mtazamo unaojitokeza katika dondoo hili. Toa sababu mbili. (4)
(d) Tambua mbinu moja ya kisanaa katika dondoo hili na ueleze umuhimu wake. (3)
(e) Jadili umuhimu wa suala hili katika kuendeleza ujumbe mkuu wa ${selectedSetBook}. (5)

(20 Alama)`,
        markingRubric: [
          'Kutambua maudhui sahihi kutoka dondoo',
          `Kuhusisha hoja na ${selectedSetBook} kwa mifano sahihi`,
          'Kutaja mhusika anayefaa na kutoa sababu za kiuchanganuzi',
          'Kubainisha mbinu ya kisanaa na athari yake',
          'Kujibu kwa mpangilio wa KCSE na lugha sahihi ya Fasihi',
        ],
        maxMarks: 20,
        question: `Fanya uchambuzi wa dondoo la mazoezi na uhusishe majibu yako na ${selectedSetBook}.`,
        options: [],
        correctAnswer: 'Essay response',
        explanation: `Jibu bora halitoshi kusema maudhui ni familia, mila au mabadiliko. Lazima mwanafunzi aonyeshe jinsi suala hilo linavyojitokeza katika ${selectedSetBook} kwa mifano mahususi ya wahusika, migogoro na ujumbe.`,
        fingerprint: questionFingerprint(`setbook structured excerpt ${selectedSetBook} kiswahili family change style`),
      },
    ]
  }

  const excerpt = `Original practice excerpt created for learning only (not a verbatim extract from the set book).

The hall fell silent when the delegate rose to speak. Outside, the city carried the noise of traffic, hunger and unfinished promises. He looked at the leaders seated before him and remembered the villages they had visited during campaigns, the hands they had shaken, and the pledges they had abandoned. "A nation is not built by speeches," he said quietly. "It is built when those trusted with power choose service over appetite." Some clapped, others looked away, and the silence that followed seemed heavier than the words themselves.`

  return [
    {
      id: 'setbook-excerpt-fallback-1',
      subject: 'English',
      topic: selectedSetBook,
      subtopic: 'Practice excerpt, context and textual linkage',
      difficulty: 'hard',
      examStandard: 'kcse_b',
      questionStyle: 'excerpt_analysis',
      answerMode: 'essay',
      excerpt,
      sourceText: selectedSetBook,
      essayPrompt: `English Literature
Paper 3

Book:
${selectedSetBook}

Original practice excerpt created for learning only (not a verbatim extract from the set book).

(a) Identify the main concern suggested in the excerpt. (2 marks)
(b) With close reference to ${selectedSetBook}, explain how this concern is developed in the text. (6 marks)
(c) Name one character in ${selectedSetBook} whose choices can be linked to this concern and justify your answer with two illustrations. (4 marks)
(d) Identify one stylistic device used in the excerpt and explain its effect. (3 marks)
(e) Discuss the importance of this concern in communicating the author's message in ${selectedSetBook}. (5 marks)

(20 marks)`,
      markingRubric: [
        'Identifies the concern accurately from the practice excerpt',
        `Connects the concern to ${selectedSetBook} using precise illustrations`,
        'Analyses character choices instead of retelling the plot',
        'Identifies style and explains effect',
        'Writes in organised KCSE paragraphs with textual evidence',
      ],
      maxMarks: 20,
      question: `Analyse the practice excerpt and connect your answers closely to ${selectedSetBook}.`,
      options: [],
      correctAnswer: 'Essay response',
      explanation: `A strong answer must move beyond comprehension. It should use the practice excerpt as a trigger, then prove knowledge of ${selectedSetBook} through characters, events, style and authorial message.`,
      fingerprint: questionFingerprint(`setbook structured excerpt ${selectedSetBook} english leadership style`),
    },
  ]
}

function getModeSpecificFallbackQuestions(mode?: BrainGymTrainingMode, selectedSetBook?: string): BrainGymQuestion[] {
  if (mode === 'poetry') {
    const poem = `I watched the river carry names away,\nPast stones that knew our fathers' feet;\nIt held the moon at close of day,\nAnd folded silence under heat.\n\nA child stood still beside the reeds,\nHer schoolbag heavy with the rain;\nShe counted dreams like scattered seeds,\nThen hid her questions from the plain.\n\nThe hills replied with distant drums,\nThe market lights began to glow;\nYet every road the evening hums\nRemembers where the brave must go.`
    return [
      {
        id: 'poetry-fallback-1',
        subject: 'English',
        topic: 'Poetry',
        subtopic: 'Persona, tone and imagery',
        difficulty: 'hard',
        examStandard: 'kcse_b',
        questionStyle: 'excerpt_analysis',
        answerMode: 'mcq',
        excerpt: poem,
        question: 'In the poem provided, which statement best describes the persona’s attitude towards memory and change?',
        options: ['Memory is useless because the past has disappeared', 'Memory remains powerful even as people move through change', 'Change is impossible because the river keeps everything still', 'The persona rejects family history completely'],
        correctAnswer: 'Memory remains powerful even as people move through change',
        explanation: 'The river carrying names away suggests change, but stones, roads and hills still remember. A strong KCSE answer links imagery to the tension between loss and continuity.',
        fingerprint: questionFingerprint('poetry fallback persona memory change'),
      },
      {
        id: 'poetry-fallback-2',
        subject: 'English',
        topic: 'Poetry',
        subtopic: 'Imagery and theme',
        difficulty: 'hard',
        examStandard: 'kcse_b',
        questionStyle: 'excerpt_analysis',
        answerMode: 'essay',
        excerpt: poem,
        essayPrompt: `Questions

(a) Identify the persona's attitude in the poem. (2 marks)
(b) Explain two images used in the poem and what each suggests. (4 marks)
(c) Show how the poet uses contrast to present memory and change. (4 marks)
(d) Discuss how structure and repetition contribute to the poem's meaning. (4 marks)
(e) With evidence from the poem, explain the main message and its relevance to society. (6 marks)

(20 marks)`,
        markingRubric: [
          'Persona and attitude: 2',
          'Two images with evidence and meaning: 4',
          'Analysis of contrast: 4',
          'Structure or repetition and effect: 4',
          'Message, relevance and expression: 6',
        ],
        maxMarks: 20,
        question: 'Answer the KCSE-style poetry appreciation questions.',
        options: [],
        correctAnswer: 'Essay response',
        explanation: 'A strong response should discuss the river, seeds, hills, drums and road imagery, then connect them to memory, uncertainty and hope.',
        fingerprint: questionFingerprint('poetry fallback essay imagery hope'),
      },
    ]
  }

  if (mode === 'ushairi') {
    const shairi = `Mwana wa nchi simama, usikate tamaa,\nJasho lako ni taa, liangazalo njia,\nUkijifunza kwa hima, kesho itakujia,\nElimu ni ufunguo, wa kufungua dunia.\n\nBahari ina mawimbi, lakini huvuka jahazi,\nMoyo ukiwa na imani, hushinda kila kazi,\nUsiogope mitihani, ni ngazi ya uongozi,\nElimu ni ufunguo, wa kufungua dunia.\n\nWalimu wakikuongoza, sikiza kwa makini,\nWazazi wakikuhimiza, shikilia thamani,\nTaifa likikuita, hudumu uzalendoni,\nElimu ni ufunguo, wa kufungua dunia.`
    return [
      {
        id: 'ushairi-fallback-1',
        subject: 'Kiswahili',
        topic: 'Ushairi',
        subtopic: 'Dhamira, vina na mizani',
        difficulty: 'hard',
        examStandard: 'kcse_b',
        questionStyle: 'excerpt_analysis',
        answerMode: 'mcq',
        excerpt: shairi,
        question: 'Ni dhamira ipi kuu inayojitokeza katika shairi hili?',
        options: ['Umuhimu wa elimu na bidii', 'Hasara ya kusafiri baharini', 'Migogoro katika familia', 'Ukosefu wa uongozi shuleni'],
        correctAnswer: 'Umuhimu wa elimu na bidii',
        explanation: 'Kiitikio “Elimu ni ufunguo” pamoja na msisitizo wa bidii, walimu na mitihani vinaonyesha dhamira kuu ya elimu na juhudi.',
        fingerprint: questionFingerprint('ushairi fallback dhamira elimu bidii'),
      },
      {
        id: 'ushairi-fallback-2',
        subject: 'Kiswahili',
        topic: 'Ushairi',
        subtopic: 'Uchanganuzi wa shairi',
        difficulty: 'hard',
        examStandard: 'kcse_b',
        questionStyle: 'excerpt_analysis',
        answerMode: 'essay',
        excerpt: shairi,
        essayPrompt: `Maswali

(a) Tambua kiitikio kilichotumiwa katika shairi hili. (2)
(b) Eleza umuhimu wa kiitikio hicho katika kuendeleza ujumbe wa shairi. (4)
(c) Bainisha taswira mbili zinazojitokeza katika shairi. (4)
(d) Eleza jinsi taswira hizo zinavyojenga ujumbe wa shairi. (6)
(e) Kwa maoni yako, ujumbe wa shairi hili una umuhimu gani katika jamii ya leo? (4)

(20 Alama)`,
        markingRubric: [
          'Kutambua kiitikio: 2',
          'Kueleza nafasi ya kiitikio katika ujumbe: 4',
          'Kubainisha taswira mbili kwa ushahidi: 4',
          'Kuchanganua jinsi taswira hujenga ujumbe: 6',
          'Ufasiri wa jumla, maoni na lugha ya KCSE: 4',
        ],
        maxMarks: 20,
        question: 'Jibu maswali ya KCSE kuhusu shairi hili.',
        options: [],
        correctAnswer: 'Essay response',
        explanation: 'Jibu bora linaonyesha namna kiitikio hurudia ujumbe mkuu na jinsi taswira kama taa, ufunguo, mawimbi na jahazi huimarisha maana.',
        fingerprint: questionFingerprint('ushairi fallback essay kiitikio taswira'),
      },
    ]
  }

  if (selectedSetBook && mode === 'excerpt') {
    return getSetBookExcerptFallbackQuestions(selectedSetBook)
  }

  if (selectedSetBook && (mode === 'essay' || mode === 'character_analysis' || mode === 'theme_analysis')) {
    const subject = getSetBookSubject(selectedSetBook)
    const blueprint = pickSetBookEssayBlueprint(selectedSetBook)
    const formattedPrompt = formatSetBookEssayPrompt(selectedSetBook, blueprint)
    const rubric = getSetBookEssayRubric(subject, blueprint.category)

    return [
      {
        id: 'setbook-fallback-1',
        subject,
        topic: selectedSetBook,
        subtopic: mode === 'essay' ? `KCSE essay: ${blueprint.category}` : `KCSE set book practice: ${blueprint.category}`,
        difficulty: 'hard',
        examStandard: 'kcse_b',
        questionStyle: mode === 'essay' ? 'essay_response' : 'excerpt_analysis',
        answerMode: 'essay',
        essayPrompt: formattedPrompt,
        markingRubric: rubric,
        maxMarks: 20,
        question: formattedPrompt,
        options: [],
        correctAnswer: 'Essay response',
        explanation: subject === 'Kiswahili'
          ? `Jibu bora lazima lilenge ${blueprint.category}, litoe hoja zilizo wazi, litumie mifano sahihi kutoka ${selectedSetBook} pekee na liepuke kusimulia hadithi.`
          : `A strong answer must focus on ${blueprint.category}, use accurate illustrations from ${selectedSetBook} only and avoid plot summary.`,
        fingerprint: questionFingerprint(`setbook fallback ${selectedSetBook} ${blueprint.category} ${blueprint.prompt}`),
      },
    ]
  }

  return []
}

async function getPeakCoachLearningMemoryPrompt(supabase: any, studentId: string, registeredSubjects: string[]) {
  try {
    let query = supabase
      .from('student_syllabus_outcome_mastery')
      .select('subject, syllabus_outcome, attempts, mastery_estimate')
      .eq('student_id', studentId)
      .lt('mastery_estimate', 0.72)
      .order('mastery_estimate', { ascending: true })
      .order('last_seen_at', { ascending: false })
      .limit(12)

    if (registeredSubjects.length > 0) {
      query = query.in('subject', registeredSubjects)
    }

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) return ''

    const weakAreas = data
      .map((row: any) => `- ${row.subject}: ${row.syllabus_outcome} (mastery ${Math.round(Number(row.mastery_estimate || 0) * 100)}%, attempts ${row.attempts || 0})`)
      .join('\n')

    return `PEAK COACH LEARNING MEMORY:
The learner has recently struggled with these syllabus outcomes:
${weakAreas}
Use this memory intelligently: bias some questions toward these weak outcomes, interleave one nearby prerequisite, and give explanations that correct the likely misconception. Do not break the curriculum blueprint or selected subject filter.`
  } catch (error: any) {
    if (!/student_syllabus_outcome_mastery|schema cache|Could not find the table/i.test(error?.message || '')) {
      console.error('[PeakCoachLearningMemory] unavailable:', error?.message)
    }
    return ''
  }
}

export async function generateBrainGymQuestions(
  studentId?: string,
  context?: 'brain_gym' | 'duel',
  subjects?: string[],
  excludeFingerprints?: string[],
  options?: { trainingMode?: BrainGymTrainingMode; selectedSetBook?: string }
): Promise<BrainGymQuestion[]> {
  let curriculumName = 'Kenyan CBC / 8-4-4'
  let className = ''
  let classLevel: number | null = null
  let curriculumContext = 'Kenyan CBC / 8-4-4'
  let registeredSubjects: string[] = []
  let learningMemoryPrompt = ''

  try {
    let supabase: any = null
    if (studentId) {
      supabase = await createClient()

      const { data: student } = await supabase
        .from('students')
        .select('curriculum_id, class_id')
        .eq('id', studentId)
        .single()

      if (student) {
        if (student.curriculum_id) {
          const { data: curriculum } = await supabase
            .from('curriculums')
            .select('name')
            .eq('id', student.curriculum_id)
            .single()

          if (curriculum?.name) curriculumName = curriculum.name
        }

        if (student.class_id) {
          const { data: cls } = await supabase
            .from('classes')
            .select('name, level')
            .eq('id', student.class_id)
            .single()

          if (cls?.name) className = cls.name
          if (typeof cls?.level === 'number') classLevel = cls.level
        }

        curriculumContext = `${className || 'Unknown class'} under ${curriculumName}`

        if (subjects && subjects.length > 0) {
          registeredSubjects = subjects
        } else {
          const { data: subjectsData } = await supabase
            .from('student_subjects')
            .select('subject:subjects(name)')
            .eq('student_id', studentId)

          if (subjectsData && subjectsData.length > 0) {
            registeredSubjects = subjectsData
              .map((s: any) => s.subject?.name)
              .filter(Boolean)
          }
        }
      }
    }

    const curriculumType = detectCurriculumType(curriculumName, className)
    if (registeredSubjects.length === 0) {
      registeredSubjects = getFallbackSubjectsForLearner(curriculumType, className)
    }
    if (studentId && supabase) {
      learningMemoryPrompt = await getPeakCoachLearningMemoryPrompt(supabase, studentId, registeredSubjects)
    }
    const adaptiveProfile = getBrainGymAdaptiveProfile(className, classLevel)
    const sessionSeed = `${Date.now()}-${Math.floor(Math.random() * 999983)}`
    const difficultyMix = context === 'duel'
      ? '2 easy, 4 medium, 4 hard'
      : getDifficultyMix(adaptiveProfile)

    if (options?.selectedSetBook && options.trainingMode === 'essay' && context !== 'duel') {
      return applyAdaptiveProfile(getModeSpecificFallbackQuestions('essay', options.selectedSetBook), adaptiveProfile)
    }

    const systemPrompt = buildSystemPrompt(curriculumType, className, curriculumName)

    const userPrompt = buildUserPrompt({
      curriculumType,
      className,
      curriculumName,
      curriculumContext,
      registeredSubjects,
      sessionSeed,
      difficultyMix,
      adaptiveProfile,
      explicitSubjectFilter: !!(subjects && subjects.length > 0),
      excludeFingerprints,
      context,
      trainingMode: options?.trainingMode,
      selectedSetBook: options?.selectedSetBook,
      learningMemoryPrompt,
    })

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ]
    const compactPrompt = buildCompactBrainGymPrompt({
      curriculumType,
      className,
      curriculumName,
      registeredSubjects,
      sessionSeed,
      difficultyMix,
      explicitSubjectFilter: !!(subjects && subjects.length > 0),
      excludeFingerprints,
      context,
      trainingMode: options?.trainingMode,
      selectedSetBook: options?.selectedSetBook,
    })
    const compactMessages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: compactPrompt },
    ]
    const fastLaneModes: BrainGymTrainingMode[] = ['poetry', 'ushairi', 'excerpt', 'essay', 'setbook', 'character_analysis', 'theme_analysis', 'style_analysis', 'context_questions', 'character_relationships', 'plot_revision', 'timed_mock']
    const isFastLane = context === 'duel' || fastLaneModes.includes(options?.trainingMode || 'mixed') || Boolean(options?.selectedSetBook)
    const providerTimeoutMs = isFastLane ? 14000 : 24000
    const generationTokens = isFastLane ? 3200 : 5500

    const providers: {
      name: string
      call: () => Promise<{ content: string; provider: string; model: string }>
    }[] = []

    if (hasGitHubModelsToken()) {
      providers.push({
        name: 'GitHub Models',
        call: () => callGitHubModelsChat(isFastLane ? compactMessages : messages, {
          temperature: 0.65,
          maxTokens: isFastLane ? 2400 : generationTokens,
          task: options?.trainingMode === 'poetry' || options?.trainingMode === 'ushairi' || options?.selectedSetBook ? 'language' : context === 'duel' ? 'quick' : undefined,
        }),
      })
    }

    if (hasGroqToken()) {
      providers.push({
        name: 'Groq',
        call: () => callGroqChat(compactMessages, {
          temperature: 0.75,
          maxTokens: isFastLane ? 2200 : 3200,
          responseFormat: { type: 'json_object' },
          retries: 0,
          timeoutMs: isFastLane ? 9000 : 12000,
        }),
      })
    }

    if (hasGeminiToken()) {
      providers.push({
        name: 'Gemini',
        call: () => callGeminiChat(isFastLane ? compactMessages : messages, {
          temperature: 0.75,
          maxTokens: isFastLane ? 2400 : generationTokens,
        }),
      })
    }

    if (hasHuggingFaceToken()) {
      providers.push({
        name: 'Hugging Face',
        call: () => callHuggingFaceChat(compactMessages, {
          temperature: 0.7,
          maxTokens: isFastLane ? 1800 : 2600,
          retries: 0,
          timeoutMs: isFastLane ? 9000 : 12000,
        }),
      })
    }

    if (providers.length === 0) {
      throw new Error('No AI providers configured')
    }

    const parseProviderResponse = (content: string) => {
      const parsed = parseJsonWithRepair(content)

      if (!Array.isArray(parsed.questions)) return null

      const sanitized = sanitizeQuestions(parsed.questions)
      const modeSafe = context === 'duel'
        ? sanitized.filter((q: BrainGymQuestion) => q.answerMode !== 'essay' && q.questionStyle !== 'essay_response' && q.questionStyle !== 'functional_writing')
        : options?.selectedSetBook && options.trainingMode === 'excerpt'
          ? sanitized.filter((q: BrainGymQuestion) =>
              q.answerMode === 'essay' &&
              q.topic === options.selectedSetBook
            )
          : sanitized
      const isExplicitFilter = !!(subjects && subjects.length > 0)
      const filtered = filterToRegisteredSubjects(modeSafe, registeredSubjects, isExplicitFilter)

      const excludeSet = new Set(excludeFingerprints || [])
      const deduped = excludeSet.size > 0
        ? filtered.filter((q: BrainGymQuestion) => !q.fingerprint || !excludeSet.has(q.fingerprint))
        : filtered

      const qualityFiltered = deduped.filter((q: BrainGymQuestion) => scoreQuestionQuality(q) >= adaptiveProfile.minimumQualityScore)
      const strictPool = qualityFiltered.length >= 5 ? qualityFiltered : deduped
      const broadPool = modeSafe.filter((q: BrainGymQuestion) => !q.fingerprint || !excludeSet.has(q.fingerprint))
      const usable = isExplicitFilter ? strictPool : (strictPool.length >= 5 ? strictPool : broadPool)
      return improveQuestionOrder(usable)
    }

    const raceWindowMs = isFastLane ? 9000 : 12000
    const settled = await Promise.allSettled(
      providers.map(async provider => {
        const response = await withTimeout(provider.call(), raceWindowMs, `[BrainGym] ${provider.name}`)
        const improved = parseProviderResponse(response.content)
        const minimumUsable = context === 'duel' ? 3 : 5
        if (!improved || improved.length < minimumUsable) throw new Error(`${provider.name} returned too few usable questions`)
        return { provider: provider.name, questions: improved }
      })
    )

    const best = settled
      .filter((result): result is PromiseFulfilledResult<{ provider: string; questions: BrainGymQuestion[] }> => result.status === 'fulfilled')
      .sort((a, b) => b.value.questions.length - a.value.questions.length)[0]?.value

    if (best) {
      const improved = best.questions
      if (options?.selectedSetBook && options.trainingMode === 'excerpt' && improved.length >= 1) return applyAdaptiveProfile(improved.slice(0, 1), adaptiveProfile)
      if (improved.length >= 10) return applyAdaptiveProfile(improved.slice(0, 10), adaptiveProfile)
      return applyAdaptiveProfile(improved, adaptiveProfile)
    }

    settled.forEach((result, index) => {
      if (result.status === 'rejected') console.error(`[BrainGym] ${providers[index]?.name} failed:`, result.reason?.message || result.reason)
    })

    for (const provider of providers) {
      try {
        const response = await withTimeout(provider.call(), providerTimeoutMs, `[BrainGym] ${provider.name}`)
        const improved = parseProviderResponse(response.content)
        if (!improved) continue

        if (options?.selectedSetBook && options.trainingMode === 'excerpt' && improved.length >= 1) return applyAdaptiveProfile(improved.slice(0, 1), adaptiveProfile)
        if (improved.length >= 10) return applyAdaptiveProfile(improved.slice(0, 10), adaptiveProfile)
        if (improved.length >= 5) return applyAdaptiveProfile(improved, adaptiveProfile)
      } catch (error: any) {
        console.error(`[BrainGym] ${provider.name} failed:`, error.message)
        const modeFallback = getModeSpecificFallbackQuestions(options?.trainingMode, options?.selectedSetBook)
        if (isFastLane && modeFallback.length > 0) return applyAdaptiveProfile(modeFallback, adaptiveProfile)
      }
    }

    throw new Error('Failed to generate valid questions')
  } catch (error) {
    console.error('generateBrainGymQuestions error:', error)

    const isExplicitFilter = !!(subjects && subjects.length > 0)
    const adaptiveProfile = getBrainGymAdaptiveProfile(className, classLevel)
    const excludeSet = new Set(excludeFingerprints || [])
    const modeFallback = getModeSpecificFallbackQuestions(options?.trainingMode, options?.selectedSetBook)
      .filter((q: BrainGymQuestion) => !excludeSet.has(q.fingerprint || ''))
    if (modeFallback.length > 0) return applyAdaptiveProfile(modeFallback, adaptiveProfile)
    const rawFallback = getFallbackQuestions().map((q: BrainGymQuestion) => ({
      ...q,
      fingerprint: questionFingerprint(q.question),
    }))
    const modeSafeFallback = context === 'duel'
      ? rawFallback.filter((q: BrainGymQuestion) => q.answerMode !== 'essay' && q.questionStyle !== 'essay_response' && q.questionStyle !== 'functional_writing')
      : rawFallback
    const fallback = filterToRegisteredSubjects(modeSafeFallback, registeredSubjects, isExplicitFilter)
      .filter((q: BrainGymQuestion) => !excludeSet.has(q.fingerprint || ''))
    const improvedFallback = improveQuestionOrder(fallback)
    if (improvedFallback.length >= 5) return applyAdaptiveProfile(improvedFallback, adaptiveProfile)
    const broadFallback = improveQuestionOrder(modeSafeFallback.filter((q: BrainGymQuestion) => !excludeSet.has(q.fingerprint || '')))
    return applyAdaptiveProfile(isExplicitFilter ? improvedFallback : broadFallback, adaptiveProfile)
  }
}

export async function submitBrainGymScore(
  studentId: string,
  score: number,
  totalQuestions = 10,
  masterySignals: PeakCoachMasterySignal[] = []
) {
  const supabase = await createClient()
  const accuracy = totalQuestions > 0 ? score / totalQuestions : 0
  const territoryPoints = accuracy >= 0.5 ? Math.max(3, Math.round(accuracy * 10)) : 0

  await updateStudentSyllabusOutcomeMastery(supabase, studentId, masterySignals)

  const { data: streakData } = await supabase
    .from('brain_gym_streaks')
    .select('*')
    .eq('student_id', studentId)
    .single()

  const today = new Date().toISOString().split('T')[0]

  if (!streakData) {
    await supabase.from('brain_gym_streaks').insert({
      student_id: studentId,
      current_streak: 1,
      highest_streak: 1,
      last_played_date: today,
    })

    const { data: student } = await supabase
      .from('students')
      .select('xp')
      .eq('id', studentId)
      .single()

    if (student) {
      await supabase
        .from('students')
        .update({ xp: (student.xp || 0) + 50 })
        .eq('id', studentId)
    }

    if (territoryPoints > 0) {
      const { processDuelForHouses } = await import('./houses')
      await processDuelForHouses(studentId, territoryPoints)
    }

    return { streak: 1, isNewHighest: true, territoryPoints }
  }

  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .split('T')[0]

  const isContinuous = streakData.last_played_date === yesterday
  const newStreak = isContinuous ? streakData.current_streak + 1 : 1
  const newHighest = Math.max(newStreak, streakData.highest_streak)

  await supabase
    .from('brain_gym_streaks')
    .update({
      current_streak: newStreak,
      highest_streak: newHighest,
      last_played_date: today,
    })
    .eq('student_id', studentId)

  const { data: student } = await supabase
    .from('students')
    .select('xp')
    .eq('id', studentId)
    .single()

  if (student) {
    await supabase
      .from('students')
      .update({ xp: (student.xp || 0) + 50 })
      .eq('id', studentId)
  }

  if (territoryPoints > 0) {
    const { processDuelForHouses } = await import('./houses')
    await processDuelForHouses(studentId, territoryPoints)
  }

  return {
    streak: newStreak,
    isNewHighest: newStreak > streakData.highest_streak,
    territoryPoints,
  }
}

export async function markBrainGymEssay(input: {
  question: string
  essay: string
  subject?: string
  rubric?: string[]
  maxMarks?: number
}) {
  const essay = input.essay.trim()
  const maxMarks = input.maxMarks || 20
  const rubric = input.rubric?.length ? input.rubric : [
    'Addresses the question directly',
    'Uses relevant textual/contextual evidence',
    'Organises ideas logically',
    'Uses accurate language and expression',
  ]

  const markingPrompt = `
You are a strict but helpful Kenyan KCSE examiner and Peak Coach.
Mark this learner response using the supplied rubric and subject expectations.

SUBJECT: ${input.subject || 'General'}
QUESTION:
${input.question}

MAX MARKS: ${maxMarks}
RUBRIC:
${rubric.map((item, index) => `${index + 1}. ${item}`).join('\n')}

LEARNER RESPONSE:
${essay}

Return ONLY valid JSON:
{
  "marks": number,
  "maxMarks": ${maxMarks},
  "percentage": number,
  "grade": "A" | "B" | "C" | "D" | "E",
  "feedback": "one clear paragraph",
  "strengths": ["..."],
  "improvements": ["..."],
  "corrections": ["specific correction 1", "specific correction 2"],
  "modelPoints": ["exam point 1", "exam point 2"],
  "examinerReport": [
    {"questionPart":"(a)","marksAwarded":2,"maxMarks":2,"comment":"specific examiner comment"}
  ],
  "modelAnswer": "A concise model KCSE answer shown only after submission. Use paragraphing and integrate evidence from the question/excerpt.",
  "nextDrill": "short next practice task"
}
`

  const messages = [
    { role: 'system' as const, content: 'You mark Kenyan KCSE/CBC student work strictly, fairly and constructively. Return valid JSON only.' },
    { role: 'user' as const, content: markingPrompt },
  ]

  const providers: {
    name: string
    call: () => Promise<{ content: string; provider: string; model: string }>
  }[] = []

  if (hasGroqToken()) providers.push({ name: 'Groq', call: () => callGroqChat(messages, { temperature: 0.25, maxTokens: 1800 }) })
  if (hasGeminiToken()) providers.push({ name: 'Gemini', call: () => callGeminiChat(messages, { temperature: 0.25, maxTokens: 1800 }) })
  if (hasGitHubModelsToken()) providers.push({ name: 'GitHub Models', call: () => callGitHubModelsChat(messages, { temperature: 0.25, maxTokens: 1800 }) })
  if (hasHuggingFaceToken()) providers.push({ name: 'Hugging Face', call: () => callHuggingFaceChat(messages, { temperature: 0.25, maxTokens: 1600 }) })

  for (const provider of providers) {
    try {
      const response = await provider.call()
      const parsed = parseJsonWithRepair(response.content)
      const marks = Math.max(0, Math.min(maxMarks, Math.round(Number(parsed.marks) || 0)))
      const percentage = Math.round((marks / maxMarks) * 100)
      const grade = percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'E'
      return {
        marks,
        maxMarks,
        percentage,
        grade,
        rubric,
        feedback: String(parsed.feedback || '').trim() || `${marks}/${maxMarks} (${grade}).`,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 4) : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String).slice(0, 4) : [],
        corrections: Array.isArray(parsed.corrections) ? parsed.corrections.map(String).slice(0, 4) : [],
        modelPoints: Array.isArray(parsed.modelPoints) ? parsed.modelPoints.map(String).slice(0, 6) : [],
        examinerReport: Array.isArray(parsed.examinerReport)
          ? parsed.examinerReport.map((item: any) => ({
              questionPart: String(item.questionPart || item.part || ''),
              marksAwarded: Number(item.marksAwarded ?? item.marks ?? 0),
              maxMarks: Number(item.maxMarks ?? item.max ?? 0),
              comment: String(item.comment || item.feedback || ''),
            })).filter((item: any) => item.questionPart || item.comment).slice(0, 8)
          : [],
        modelAnswer: String(parsed.modelAnswer || '').trim(),
        nextDrill: String(parsed.nextDrill || '').trim() || 'Rewrite one paragraph using clearer evidence and examiner wording.',
      }
    } catch (error: any) {
      console.error(`[BrainGymEssayMarker] ${provider.name} failed:`, error.message)
    }
  }

  const wordCount = essay.split(/\s+/).filter(Boolean).length
  const sentences = essay.split(/[.!?]+/).filter(s => s.trim().length > 0).length
  const paragraphs = essay.split(/\n\s*\n/).filter(p => p.trim().length > 0).length

  let raw = 0
  if (wordCount >= 80) raw += 4
  else if (wordCount >= 50) raw += 3
  else if (wordCount >= 30) raw += 2
  else raw += 1

  if (sentences >= 6) raw += 4
  else if (sentences >= 4) raw += 3
  else if (sentences >= 2) raw += 2
  else raw += 1

  if (paragraphs >= 3) raw += 3
  else if (paragraphs >= 2) raw += 2
  else raw += 1

  const lower = essay.toLowerCase()
  const hasEvidence = /(for example|kwa mfano|this shows|hii inaonyesha|because|kwa sababu|therefore|hivyo|quote|dondoo|character|mhusika|theme|dhamira)/i.test(lower)
  const hasConclusion = /(in conclusion|kwa kumalizia|therefore|hivyo basi|overall|kwa jumla)/i.test(lower)
  const hasPromptLanguage = input.question
    .toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 5)
    .slice(0, 8)
    .some(word => lower.includes(word))

  if (hasEvidence) raw += 4
  if (hasConclusion) raw += 2
  if (hasPromptLanguage) raw += 3

  const marks = Math.min(maxMarks, Math.round((raw / 20) * maxMarks))
  const percentage = Math.round((marks / maxMarks) * 100)
  const grade = percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'E'
  const strengths = [
    wordCount >= 80 ? 'Your response has enough development for marking.' : 'You attempted the task clearly.',
    hasEvidence ? 'You included evidence or explanation linked to the task.' : 'Your ideas are understandable.',
  ]
  const improvements = [
    wordCount < 80 ? 'Develop the essay further with more points and examples.' : 'Tighten topic sentences so each paragraph carries one main idea.',
    !hasEvidence ? 'Add textual evidence, examples, or dondoo-based support.' : 'Explain how each example proves the point.',
    !hasConclusion ? 'End with a brief conclusion that answers the question directly.' : 'Make the conclusion sharper and less repetitive.',
  ].slice(0, 3)

  return {
    marks,
    maxMarks,
    percentage,
    grade,
    rubric,
    strengths,
    improvements,
    corrections: [
      'Use precise subject terms and avoid vague phrasing.',
      'Support each point with evidence, data, an example, or a short explanation.',
    ],
    modelPoints: rubric.slice(0, 6),
    examinerReport: rubric.slice(0, 5).map((item, index) => ({
      questionPart: `Criterion ${index + 1}`,
      marksAwarded: index === 0 ? Math.min(2, marks) : 0,
      maxMarks: index === 0 ? 2 : Math.max(1, Math.floor((maxMarks - 2) / Math.max(1, rubric.length - 1))),
      comment: item,
    })),
    modelAnswer: `Model KCSE answer: Begin by answering the exact question, then support every point with evidence from the poem, dondoo, set book or subject context. Use correct literary or subject terms, explain the effect of each example, and end with a direct conclusion.`,
    nextDrill: 'Rewrite your weakest paragraph with one clear point, evidence and explanation.',
    feedback: `${marks}/${maxMarks} (${grade}). ${strengths[0]} ${improvements[0]}`,
  }
}

export async function getBrainGymStreak(studentId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('brain_gym_streaks')
    .select('*')
    .eq('student_id', studentId)
    .single()

  return data
}

export async function getStudentRegisteredSubjects(studentId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('student_subjects')
    .select('subject:subjects(name)')
    .eq('student_id', studentId)
  const registered = (data || [])
    .map((s: any) => s.subject?.name)
    .filter(Boolean)

  if (registered.length > 0) return registered

  const { data: student } = await supabase
    .from('students')
    .select('curriculum_id, class_id, curriculum:curriculum_id(name), class:class_id(name, level)')
    .eq('id', studentId)
    .single()

  const curriculumName = (student as any)?.curriculum?.name || ''
  const className = (student as any)?.class?.name || ''
  const curriculumType = detectCurriculumType(curriculumName, className)
  return getFallbackSubjectsForLearner(curriculumType, className)
}
