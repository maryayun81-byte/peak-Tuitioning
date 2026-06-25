'use server'

import { createClient } from '@/lib/supabase/server'
import { callGroqChat, hasGroqToken } from '@/lib/groq-chat'
import { callGeminiChat, hasGeminiToken } from '@/lib/gemini-chat'
import { callHuggingFaceChat, hasHuggingFaceToken } from '@/lib/huggingface-chat'
import { callGitHubModelsChat, hasGitHubModelsToken } from '@/lib/github-models-chat'
import { sanitizeQuestions, filterToRegisteredSubjects, getFallbackQuestions, normaliseText, questionFingerprint } from '@/lib/brainGymUtils'
import type { BrainGymQuestion } from '@/lib/brainGymUtils'
import { getBrainGymAdaptiveProfile, pickBrainGymDifficultyMix } from '@/lib/brainGym/adaptiveProfile'
import { getCbcLanguagePrompt, getLanguageSetBookPrompt } from '@/lib/brainGym/setBooks'

type CurriculumType = 'kcse' | 'kjsea' | 'kpsea' | 'unknown'
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
Form 1: lab safety, apparatus, mixtures, separation, air, water, burning, elements and compounds.
Form 2: atomic structure, isotopes, electron arrangement, periodic table trends, chemical bonding and structure, ionic/covalent/metallic bonding, formulae, equations, mole basics, salts, acids, bases, indicators, carbon and its compounds.
Form 3: electrochemistry, electrode products, half equations, electrochemical series, Faraday's laws, reaction rates, halogens, nitrogen, sulphur.
Form 4: organic chemistry, enthalpy, Hess's law, calorimetry, extraction of metals, Haber, Contact, Solvay, environmental chemistry.
Question angles: experiments, observations, bonding diagrams described in text, equations, calculations, graph interpretation, industrial conditions, prediction and explanation.
`,

  Mathematics: `
KCSE Mathematics mastery scope:
Form 1: numbers, algebra, equations, geometry, measurements, statistics.
Form 2: indices and laws of indices, logarithms, quadratics, inequalities, simultaneous equations, commercial arithmetic, scale drawing, loci, transformations, similarity and enlargement.
Form 3: matrices, vectors, trigonometry, bearings, 3D geometry, sequences, statistics, probability.
Form 4: calculus, area under curve, rates of change, vectors, circle theorems, longitude and latitude, linear programming, advanced graphs.
Question angles: multi-step calculations, proof, table completion, graph drawing, interpretation, word problems, optimisation, exact KCSE-style reasoning.
`,

  Biology: `
KCSE Biology mastery scope:
Cell structure, diffusion, osmosis, classification, photosynthesis, nutrition, transport, respiration, gaseous exchange, excretion, homeostasis, coordination, reproduction, genetics, evolution, ecology.
Question angles: diagrams, experiments, adaptations, processes, comparisons, graph/data interpretation and explanation.
`,

  Physics: `
KCSE Physics mastery scope:
Measurements, forces, pressure, moments, heat, gas laws, motion, Newton's laws, work-energy-power, machines, waves, light, electricity, magnetism, transformers, electronics, radioactivity.
Question angles: calculations, units, graphs, circuits, ray diagrams, apparatus, laws and real-life applications.
`,

  English: `
KCSE English mastery scope:
Grammar, comprehension, vocabulary in context, summary, oral skills, functional writing, poetry, set texts, literary devices, tone, mood, character, themes and style.
Question angles: sentence correction, best option, tone, inference, register, functional writing errors, literary analysis.
`,

  Kiswahili: `
KCSE Kiswahili mastery scope:
Sarufi, ngeli, upatanisho, nyakati, vivumishi, vielezi, ufahamu, muhtasari, insha, barua, fasihi simulizi, fasihi andishi, tamathali za semi, dhamira, wahusika, mtindo.
Question angles: kusahihisha makosa, kubaini mbinu, kueleza maana, kuchagua jibu sahihi, matumizi ya lugha.
`,

  'Integrated Science': `
CBC Integrated Science:
Cells, classification, habitats, food chains, photosynthesis, nutrition, matter, mixtures, separation, weather, water cycle, soil, conservation, pollution, forces, simple machines, energy, electricity and health.
Questions must be practical, scenario-based and age appropriate.
`,

  'Science & Technology': `
CBC Science and Technology:
Plants, animals, human body, senses, hygiene, food groups, materials, states of matter, weather, water, conservation, pollution, pushes and pulls, floating and sinking, magnets, simple circuits and disease prevention.
Questions must be simple, practical and familiar to the learner.
`,

  'Social Studies': `
CBC Social Studies:
Kenyan communities, counties, physical features, neighbours, natural resources, agriculture, national symbols, rights, responsibilities, government, EAC, conservation and climate change.
Use Kenyan community scenarios.
`,

  'Mathematics (CBC)': `
CBC Mathematics:
Numbers, fractions, decimals, percentages, ratio, proportion, money, time, measurement, geometry, angles, shapes, data, graphs, mean, mode, median, profit, loss and simple interest.
Use practical Kenyan contexts.
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
      'Natural numbers, factors, multiples, GCD, LCM',
      'Integers, fractions, decimals, squares and square roots',
      'Algebraic expressions, linear equations and inequalities',
      'Angles, geometric constructions, scale drawing',
      'Area, volume, mass, density, time, money',
      'Statistics: data collection, frequency tables, mean, mode, median',
    ],
    2: [
      'Indices and laws of indices',
      'Logarithms and use of log laws',
      'Quadratic expressions and equations',
      'Linear inequalities and simultaneous equations',
      'Commercial arithmetic: profit, loss, discount, commission, compound interest',
      'Scale drawing, bearing, loci, similarity, enlargement and transformations',
    ],
    3: [
      'Matrices and transformations',
      'Vectors, magnitude, direction and position vectors',
      'Trigonometry, sine rule, cosine rule, bearings and 3D geometry',
      'Sequences and series',
      'Statistics: quartiles, cumulative frequency, histograms and probability',
      'Surds and further logarithms where applicable',
    ],
    4: [
      'Differentiation from first principles and rules of differentiation',
      'Gradient functions, tangents, normals and rates of change',
      'Nature of turning points using first and second derivative tests',
      'Area under a curve and integration-style approximation',
      'Circle theorems and cyclic quadrilaterals',
      'Longitudes and latitudes, time differences and great/small circles',
      'Linear programming, inequalities and optimisation',
      'Advanced graphs, variation and cumulative KCSE problem solving',
    ],
  },
  Chemistry: {
    1: [
      'Laboratory safety, apparatus and measurement',
      'Mixtures and separation techniques',
      'Air, burning, oxygen, water and hydrogen',
      'Elements, compounds, symbols and simple formulae',
      'Acids, bases and indicators at introductory level',
    ],
    2: [
      'Atomic structure, isotopes and electron arrangement',
      'Periodic table trends and valency',
      'Chemical bonding and structure: ionic, covalent, metallic and giant structures',
      'Formulae, equations, relative atomic mass and mole basics',
      'Acids, bases, salts and salt preparation',
      'Carbon and its compounds at introductory level',
    ],
    3: [
      'Electrochemistry, electrolysis products and half equations',
      'Electrochemical series and displacement reactions',
      'Faraday law calculations at KCSE level',
      'Reaction rates, collision theory, catalysts and rate graphs',
      'Halogens, nitrogen, sulphur and their compounds',
      'Quantitative chemistry linked to equations',
    ],
    4: [
      'Organic chemistry: alkanes, alkenes, alcohols, acids, polymers and reactions',
      'Energy changes: enthalpy, Hess law and calorimetry',
      'Extraction of metals and environmental impact',
      'Industrial processes: Haber, Contact, Solvay and conditions/yield',
      'Chemical equilibrium and Le Chatelier principle',
      'Cumulative practical analysis, observations and equations',
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
}

function getKcseClassCoverage(subjects: string[], className: string) {
  const form = getFormNumber(className)
  if (!form) return ''

  const blocks: string[] = []
  for (const subject of subjects) {
    const key = Object.keys(KCSE_CLASS_TOPIC_COVERAGE).find(k => {
      const a = normaliseText(k)
      const b = normaliseText(subject)
      return a === b || a.includes(b) || b.includes(a)
    })

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

function getSubjectTopics(registeredSubjects: string[]) {
  if (!registeredSubjects.length) return ''

  const lines: string[] = []

  for (const subject of registeredSubjects) {
    const key = Object.keys(SUBJECT_TOPICS).find(k => {
      const a = normaliseText(k)
      const b = normaliseText(subject)
      return a === b || a.includes(b) || b.includes(a)
    })

    if (key) lines.push(`${subject}:\n${SUBJECT_TOPICS[key]}`)
  }

  return lines.length
    ? `SYLLABUS TOPIC DEPTH FOR REGISTERED SUBJECTS:\n${lines.join('\n\n')}`
    : ''
}

function getPriorityTopics(registeredSubjects: string[]) {
  const lines: string[] = []

  for (const subject of registeredSubjects) {
    const key = Object.keys(KCSE_PRIORITY_TOPICS).find(k => {
      const a = normaliseText(k)
      const b = normaliseText(subject)
      return a === b || a.includes(b) || b.includes(a)
    })

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
    const key = Object.keys(COMMON_MISCONCEPTIONS).find(k => {
      const a = normaliseText(k)
      const b = normaliseText(subject)
      return a === b || a.includes(b) || b.includes(a)
    })

    if (key) {
      lines.push(`${subject}: ${COMMON_MISCONCEPTIONS[key].join('; ')}`)
    }
  }

  return lines.length
    ? `COMMON STUDENT MISCONCEPTIONS TO USE AS DISTRACTORS:\n${lines.join('\n')}`
    : ''
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

BAD:
"What is photosynthesis?"

STRONG:
"A destarched leaf was partly covered with black paper and exposed to sunlight. After iodine testing, only the uncovered part turned blue-black. Which conclusion is best supported?"

BAD MATH:
"Solve 2x + 3 = 7"

STRONG MATH:
"A trader bought 3 calculators and 2 geometrical sets for Ksh 1,450. Another bought 2 calculators and 5 geometrical sets for Ksh 1,900. Find the cost of one calculator."
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
  } = params

  const { excludeFingerprints } = params

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
Generate exactly 10 strong Peak Coach Brain Gym questions.

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

${getLanguageSetBookPrompt(registeredSubjects, className)}

${getCbcLanguagePrompt(registeredSubjects, className)}

${getLanguageLiteratureCoverage(registeredSubjects, className)}

${getPriorityTopics(registeredSubjects)}

${getMisconceptions(registeredSubjects)}

${getQuestionQualityRules()}

QUESTION STYLE ROTATION:
Use a strong mix from:
${QUESTION_STYLES.join(', ')}${excludeBlock}

SPECIAL INSTRUCTIONS:
- Do not generate 10 questions of the same style.
- At least 3 questions must be application/scenario/data/experiment/graph/calculation based.
- If Mathematics is included, include at least one multi-step KCSE-style calculation. For Form 2, include indices/logarithms/quadratics where appropriate. For Form 3-4, make the calculation KCSE B/A standard.
- If Chemistry is included, include structure and bonding, mole/equation skill, electrochemistry, rates, organic or energy changes as the class level allows. For Form 2, explicitly include chemical bonding and structure.
- If Science is included, include at least one experiment, observation, graph/table, equation, diagram description or process-based question.
- If English/Kiswahili is included, include grammar or language-in-context, not only literature recall.
- If English/Kiswahili Form 3-4 is included, include at least 2 set-book/literature/excerpt questions across the 10 questions unless the selected topic is purely grammar.
- If context is duel, prefer MCQ excerpt/poetry/set-book questions over essays because duels need fast scoring.
- For language excerpts, write a short original extract of 60-120 words or a paraphrased situation. Do not copy long passages from set books.
- For English poem questions, the excerpt must be a complete original poem of 3-4 stanzas with 3-4 lines per stanza, not a two-line snippet.
- For Kiswahili ushairi questions, the excerpt must be a complete original shairi of 3-4 beti, preferably 4 mishororo per ubeti where suitable, not a two-line snippet.
- For CBC poem/song/oral literature tasks, use a complete age-appropriate original piece: 2-3 stanzas for KPSEA, 3-4 stanzas for KJSEA.
- If essay_response is included, include answerMode "essay", essayPrompt, markingRubric and maxMarks. Use at most 1 essay_response in a 10-question session.
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
      "question": "...",
      "options": ["...","...","...","..."],
      "correctAnswer": "exact option text",
      "explanation": "..."
    }
  ]
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
  if (/(because|therefore|this shows|this means|hence|since|ratio|equation|formula)/i.test(q.explanation)) score += 1
  if (/(kamau|wanjiku|otieno|akinyi|muthoni|nairobi|mombasa|kisumu|rift valley|kenya|county|shamba|market)/i.test(text)) score += 1

  return score
}

function improveQuestionOrder(questions: BrainGymQuestion[]) {
  return [...questions]
    .sort((a, b) => scoreQuestionQuality(b) - scoreQuestionQuality(a))
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

function applyAdaptiveProfile(questions: BrainGymQuestion[], profile: ReturnType<typeof getBrainGymAdaptiveProfile>) {
  return questions.map(q => ({
    ...q,
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

export async function generateBrainGymQuestions(
  studentId?: string,
  context?: 'brain_gym' | 'duel',
  subjects?: string[],
  excludeFingerprints?: string[]
): Promise<BrainGymQuestion[]> {
  let curriculumName = 'Kenyan CBC / 8-4-4'
  let className = ''
  let classLevel: number | null = null
  let curriculumContext = 'Kenyan CBC / 8-4-4'
  let registeredSubjects: string[] = []

  try {
    if (studentId) {
      const supabase = await createClient()

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
    const adaptiveProfile = getBrainGymAdaptiveProfile(className, classLevel)
    const sessionSeed = `${Date.now()}-${Math.floor(Math.random() * 999983)}`
    const difficultyMix = context === 'duel'
      ? '2 easy, 4 medium, 4 hard'
      : getDifficultyMix(adaptiveProfile)

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
    })

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ]

    const providers: {
      name: string
      call: () => Promise<{ content: string; provider: string; model: string }>
    }[] = []

    if (hasGroqToken()) {
      providers.push({
        name: 'Groq',
        call: () => callGroqChat(messages, {
          temperature: 0.75,
          maxTokens: 5500,
        }),
      })
    }

    if (hasGeminiToken()) {
      providers.push({
        name: 'Gemini',
        call: () => callGeminiChat(messages, {
          temperature: 0.75,
          maxTokens: 5500,
        }),
      })
    }

    if (hasGitHubModelsToken()) {
      providers.push({
        name: 'GitHub Models',
        call: () => callGitHubModelsChat(messages, {
          temperature: 0.75,
          maxTokens: 5500,
        }),
      })
    }

    if (hasHuggingFaceToken()) {
      providers.push({
        name: 'Hugging Face',
        call: () => callHuggingFaceChat(messages, {
          temperature: 0.7,
          maxTokens: 4500,
        }),
      })
    }

    if (providers.length === 0) {
      throw new Error('No AI providers configured')
    }

    for (const provider of providers) {
      try {
        const response = await provider.call()
        const parsed = JSON.parse(cleanJsonResponse(response.content))

        if (!Array.isArray(parsed.questions)) continue

        const sanitized = sanitizeQuestions(parsed.questions)
        const isExplicitFilter = !!(subjects && subjects.length > 0)
        const filtered = filterToRegisteredSubjects(sanitized, registeredSubjects, isExplicitFilter)

        const excludeSet = new Set(excludeFingerprints || [])
        const deduped = excludeSet.size > 0
          ? filtered.filter(q => !q.fingerprint || !excludeSet.has(q.fingerprint))
          : filtered

        const qualityFiltered = deduped.filter(q => scoreQuestionQuality(q) >= adaptiveProfile.minimumQualityScore)
        const strictPool = qualityFiltered.length >= 5 ? qualityFiltered : deduped
        const broadPool = sanitized.filter(q => !q.fingerprint || !excludeSet.has(q.fingerprint))
        const usable = isExplicitFilter ? strictPool : (strictPool.length >= 5 ? strictPool : broadPool)
        const improved = improveQuestionOrder(usable)

        if (improved.length >= 10) return applyAdaptiveProfile(improved.slice(0, 10), adaptiveProfile)
        if (improved.length >= 5) return applyAdaptiveProfile(improved, adaptiveProfile)
      } catch (error: any) {
        console.error(`[BrainGym] ${provider.name} failed:`, error.message)
      }
    }

    throw new Error('Failed to generate valid questions')
  } catch (error) {
    console.error('generateBrainGymQuestions error:', error)

    const isExplicitFilter = !!(subjects && subjects.length > 0)
    const adaptiveProfile = getBrainGymAdaptiveProfile(className, classLevel)
    const excludeSet = new Set(excludeFingerprints || [])
    const rawFallback = getFallbackQuestions().map(q => ({
      ...q,
      fingerprint: questionFingerprint(q.question),
    }))
    const fallback = filterToRegisteredSubjects(rawFallback, registeredSubjects, isExplicitFilter)
      .filter(q => !excludeSet.has(q.fingerprint || ''))
    if (fallback.length >= 5) return applyAdaptiveProfile(fallback.slice(0, 10), adaptiveProfile)
    return applyAdaptiveProfile(isExplicitFilter ? fallback : rawFallback.filter(q => !excludeSet.has(q.fingerprint || '')), adaptiveProfile)
  }
}

export async function submitBrainGymScore(studentId: string, score: number, totalQuestions = 10) {
  const supabase = await createClient()
  const accuracy = totalQuestions > 0 ? score / totalQuestions : 0
  const territoryPoints = accuracy >= 0.5 ? Math.max(3, Math.round(accuracy * 10)) : 0

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
  const wordCount = essay.split(/\s+/).filter(Boolean).length
  const sentences = essay.split(/[.!?]+/).filter(s => s.trim().length > 0).length
  const paragraphs = essay.split(/\n\s*\n/).filter(p => p.trim().length > 0).length
  const rubric = input.rubric?.length ? input.rubric : [
    'Addresses the question directly',
    'Uses relevant textual/contextual evidence',
    'Organises ideas logically',
    'Uses accurate language and expression',
  ]

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
  if (!data) return []
  return data
    .map((s: any) => s.subject?.name)
    .filter(Boolean)
}
