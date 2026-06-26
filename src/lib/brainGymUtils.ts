type QuestionDifficulty = 'easy' | 'medium' | 'hard'
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

/** Fingerprint a question by its normalized text for dedup. */
export function questionFingerprint(question: string): string {
  return question.toLowerCase().replace(/\s+/g, '').slice(0, 120)
}

export type VisualQuestionScene = {
  sceneType?: string
  background?: string
  style?: string
  objects?: string[]
  diagram?: string
  interactionType?: string
  workingTools?: string[]
  visualPrompt?: string
}

export type BrainGymQuestion = {
  id: string
  subject: string
  topic: string
  subtopic?: string
  difficulty: QuestionDifficulty
  examStandard?: 'foundation' | 'exam_standard' | 'kcse_b' | 'kcse_a' | 'cbc_standard'
  questionStyle?: QuestionStyle
  answerMode?: 'mcq' | 'essay'
  excerpt?: string
  sourceText?: string
  essayPrompt?: string
  markingRubric?: string[]
  maxMarks?: number
  visualScene?: VisualQuestionScene
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
  fingerprint?: string
  adaptive?: {
    profileLabel: string
    visualStyle: string
    languageTone: string
    questionDemand: string
    rewardTone: string
    accentColor: string
    cardClassName: string
  }
}

function sanitizeStringList(value: any): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value.map((item: any) => String(item).trim()).filter(Boolean).slice(0, 8)
  return items.length > 0 ? items : undefined
}

function sanitizeVisualScene(value: any): VisualQuestionScene | undefined {
  if (!value || typeof value !== 'object') return undefined

  const scene: VisualQuestionScene = {
    sceneType: String(value.sceneType || '').trim() || undefined,
    background: String(value.background || '').trim() || undefined,
    style: String(value.style || '').trim() || undefined,
    objects: sanitizeStringList(value.objects),
    diagram: String(value.diagram || '').trim() || undefined,
    interactionType: String(value.interactionType || '').trim() || undefined,
    workingTools: sanitizeStringList(value.workingTools),
    visualPrompt: String(value.visualPrompt || '').trim() || undefined,
  }

  return Object.values(scene).some(Boolean) ? scene : undefined
}

export function normaliseText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function stripCurriculumSuffix(value: string) {
  return value
    .replace(/cbc|kpsea|kjsea|844|kcse|84{0,1}4/g, '')
    .trim()
}

export function sanitizeQuestions(questions: any[]): BrainGymQuestion[] {
  return questions
    .map((q: any, index: number) => {
      if (!q || typeof q !== 'object') return null

      const question = String(q.question || '').trim()
      const explanation = String(q.explanation || '').trim()

      const answerMode = q.answerMode === 'essay' || q.questionStyle === 'essay_response' ? 'essay' : 'mcq'
      let options = Array.isArray(q.options)
        ? q.options.map((o: any) => String(o).trim()).filter(Boolean)
        : []

      options = Array.from(new Set(options))

      let correctAnswer = String(q.correctAnswer || '').trim()

      if (!question || !explanation) return null
      if (answerMode === 'mcq' && !correctAnswer) return null
      if (answerMode === 'mcq' && options.length !== 4) return null
      if (answerMode === 'mcq' && options.every((o: string) => /^[A-D]$/i.test(o))) return null

      if (answerMode === 'mcq' && /^[A-D]$/i.test(correctAnswer)) {
        const letterIndex = correctAnswer.toUpperCase().charCodeAt(0) - 65
        correctAnswer = options[letterIndex]
      }

      const looseMatch = answerMode === 'mcq' ? options.find(
        (o: string) => o.toLowerCase() === correctAnswer.toLowerCase()
      ) : undefined

      if (answerMode === 'mcq' && !options.includes(correctAnswer) && looseMatch) {
        correctAnswer = looseMatch
      }

      if (answerMode === 'mcq' && !options.includes(correctAnswer)) return null
      if (question.length < 35) return null
      if (explanation.length < 45) return null

      if (answerMode === 'mcq' && /all of the above/i.test(options.join(' '))) return null
      if (answerMode === 'mcq' && /none of the above/i.test(options.join(' '))) return null

      return {
        id: q.id || `q${index + 1}`,
        subject: String(q.subject || '').trim(),
        topic: String(q.topic || '').trim(),
        subtopic: String(q.subtopic || '').trim(),
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty)
          ? q.difficulty
          : 'medium',
        examStandard: q.examStandard || 'exam_standard',
        questionStyle: q.questionStyle || 'application_scenario',
        answerMode,
        excerpt: String(q.excerpt || '').trim() || undefined,
        sourceText: String(q.sourceText || '').trim() || undefined,
        essayPrompt: String(q.essayPrompt || '').trim() || undefined,
        markingRubric: Array.isArray(q.markingRubric) ? q.markingRubric.map((item: any) => String(item).trim()).filter(Boolean) : undefined,
        maxMarks: Number(q.maxMarks || 20) || 20,
        visualScene: sanitizeVisualScene(q.visualScene),
        question,
        options,
        correctAnswer: answerMode === 'essay' ? (correctAnswer || 'Essay response') : correctAnswer,
        explanation,
        fingerprint: questionFingerprint(question),
      } as BrainGymQuestion
    })
    .filter((q): q is BrainGymQuestion => q !== null)
}

const SUBJECT_ALIASES: Record<string, string[]> = {
  mathematics: ['math', 'maths'],
  mathematicscbc: ['mathcbc', 'mathscbc', 'mathematics'],
  english: ['literature', 'englisch'],
  englishcbc: ['english', 'literacy'],
  literature: ['english'],
  kiswahili: ['kiswahilicbc'],
  kiswahilicbc: ['kiswahili'],
  chemistry: [],
  biology: [],
  physics: [],
  geography: [],
  historygovernment: ['history', 'government'],
  history: ['historygovernment'],
  government: ['historygovernment'],
  businessstudies: ['business', 'entrepreneurship'],
  business: ['businessstudies'],
  cre: ['christianreligiouseducation', 'christianreligion'],
  ire: ['islamicreligiouseducation', 'islamicreligion'],
  agriculture: ['farming', 'agribusiness'],
  computerstudies: ['computing', 'ict', 'informationtechnology', 'computerscience'],
  integratedscience: [],
  scienceandtechnology: [],
  socialstudies: [],
  pretechnicalstudies: ['pretechnical', 'pretech'],
  agriculturenutrition: ['agricultureandnutrition', 'agriculturenutritioncbc'],
}

function subjectMatches(qSubject: string, registeredNormalised: string): boolean {
  if (qSubject === registeredNormalised) return true
  if (qSubject.includes(registeredNormalised) || registeredNormalised.includes(qSubject)) return true
  if (stripCurriculumSuffix(qSubject) === stripCurriculumSuffix(registeredNormalised)) return true
  const aliases = SUBJECT_ALIASES[registeredNormalised]
  if (aliases && aliases.includes(qSubject)) return true
  for (const [canonical, aliasList] of Object.entries(SUBJECT_ALIASES)) {
    if (canonical === qSubject && aliasList.includes(registeredNormalised)) return true
    if (canonical === registeredNormalised && aliasList.some(alias => qSubject.includes(alias))) return true
  }
  return false
}

export function filterToRegisteredSubjects(
  questions: BrainGymQuestion[],
  registeredSubjects: string[],
  strict?: boolean
): BrainGymQuestion[] {
  if (!registeredSubjects.length) return questions

  const normalisedSubjects = registeredSubjects.map(normaliseText)

  return questions.filter(q => {
    if (!q.subject) return !strict

    const qSubject = normaliseText(q.subject)
    return normalisedSubjects.some(s => subjectMatches(qSubject, s))
  })
}

export function getFallbackQuestions(): BrainGymQuestion[] {
  return [
    // KCSE subjects
    {
      id: 'q1',
      subject: 'Chemistry',
      topic: 'Electrochemistry',
      subtopic: 'Electrode products',
      difficulty: 'medium',
      examStandard: 'exam_standard',
      questionStyle: 'experiment_based',
      question: 'During electrolysis of dilute sulphuric acid using platinum electrodes, a gas collected at the anode relit a glowing splint. Which explanation is correct?',
      options: [
        'Oxygen is formed because hydroxide ions from water are discharged at the anode',
        'Hydrogen is formed because hydrogen ions move to the anode',
        'Sulphur dioxide is formed because sulphate ions are discharged',
        'Oxygen is formed because sulphate ions lose electrons directly',
      ],
      correctAnswer: 'Oxygen is formed because hydroxide ions from water are discharged at the anode',
      explanation: 'At the positive anode, hydroxide ions from water are preferentially discharged, forming oxygen gas. Sulphate ions remain in solution because they are difficult to discharge.',
    },
    {
      id: 'q2',
      subject: 'Mathematics',
      topic: 'Commercial Arithmetic',
      subtopic: 'Profit percentage',
      difficulty: 'medium',
      examStandard: 'exam_standard',
      questionStyle: 'calculation',
      question: 'A trader bought a generator for Ksh 48,000 and sold it at a profit of 12.5%. What was the selling price?',
      options: ['Ksh 54,000', 'Ksh 53,500', 'Ksh 60,000', 'Ksh 42,000'],
      correctAnswer: 'Ksh 54,000',
      explanation: 'Profit = 12.5% of 48,000 = 6,000. Selling price = buying price + profit = 48,000 + 6,000 = Ksh 54,000.',
    },
    {
      id: 'q2a',
      subject: 'Mathematics',
      topic: 'Indices',
      subtopic: 'Laws of indices',
      difficulty: 'hard',
      examStandard: 'kcse_b',
      questionStyle: 'calculation',
      question: 'Simplify the expression (8x^6y^-3)^(2/3) ÷ (4x^2y^-2), where x and y are positive. Which answer is correct?',
      options: ['x^2', 'x^2y^0', 'x^2/y', '2x^2'],
      correctAnswer: 'x^2',
      explanation: '(8x^6y^-3)^(2/3) gives 4x^4y^-2. Dividing by 4x^2y^-2 leaves x^(4-2)y^(-2+2), which simplifies to x^2.',
    },
    {
      id: 'q2b',
      subject: 'Mathematics',
      topic: 'Logarithms',
      subtopic: 'Using log laws',
      difficulty: 'hard',
      examStandard: 'kcse_b',
      questionStyle: 'calculation',
      question: 'Given that log 2 = 0.3010 and log 3 = 0.4771, find log 72 without using a calculator.',
      options: ['1.8572', '1.3801', '2.1582', '0.7781'],
      correctAnswer: '1.8572',
      explanation: '72 = 2^3 × 3^2. Therefore log 72 = 3log2 + 2log3 = 3(0.3010) + 2(0.4771) = 0.9030 + 0.9542 = 1.8572.',
    },
    {
      id: 'q2c',
      subject: 'Mathematics',
      topic: 'Quadratic Expressions and Equations',
      subtopic: 'Forming and solving equations',
      difficulty: 'hard',
      examStandard: 'kcse_b',
      questionStyle: 'application_scenario',
      question: 'The length of a rectangular plot is 5 m more than its width. Its area is 84 m². Which equation correctly gives the width w?',
      options: ['w² + 5w - 84 = 0', 'w² - 5w - 84 = 0', '2w + 5 = 84', 'w² + 84w + 5 = 0'],
      correctAnswer: 'w² + 5w - 84 = 0',
      explanation: 'If width is w, length is w + 5. Area = w(w + 5) = 84, so w² + 5w = 84 and hence w² + 5w - 84 = 0.',
    },
    {
      id: 'q2d',
      subject: 'Mathematics',
      topic: 'Simultaneous Equations',
      subtopic: 'Elimination method',
      difficulty: 'hard',
      examStandard: 'kcse_b',
      questionStyle: 'calculation',
      question: 'A school bought 4 rulers and 3 compasses for Ksh 470. Another set of 2 rulers and 5 compasses cost Ksh 550. What is the cost of one compass?',
      options: ['Ksh 90', 'Ksh 70', 'Ksh 80', 'Ksh 100'],
      correctAnswer: 'Ksh 90',
      explanation: 'Let ruler be r and compass be c. 4r + 3c = 470 and 2r + 5c = 550. Doubling the second gives 4r + 10c = 1100. Subtracting the first gives 7c = 630, so c = 90.',
    },
    {
      id: 'q2e',
      subject: 'Mathematics',
      topic: 'Statistics',
      subtopic: 'Grouped data: mean and modal class',
      difficulty: 'hard',
      examStandard: 'kcse_b',
      questionStyle: 'data_response',
      question: 'The table shows marks scored by 60 students in a KCSE Mathematics trial: 20-29: 4, 30-39: 7, 40-49: 11, 50-59: 18, 60-69: 12, 70-79: 8. Using class midpoints, what is the estimated mean mark?',
      options: ['53.2', '50.0', '55.5', '48.7'],
      correctAnswer: '53.2',
      explanation: 'Use midpoints 24.5, 34.5, 44.5, 54.5, 64.5 and 74.5. Sum fx = 3190 and total frequency = 60. Estimated mean = 3190/60 = 53.17, which rounds to 53.2.',
    },
    {
      id: 'q2f',
      subject: 'Mathematics',
      topic: 'Statistics',
      subtopic: 'Cumulative frequency, quartiles and standard deviation',
      difficulty: 'hard',
      examStandard: 'kcse_a',
      questionStyle: 'data_response',
      question: 'The weekly profits, in thousand shillings, of 80 market traders were grouped as follows: 0-9: 5, 10-19: 9, 20-29: 16, 30-39: 24, 40-49: 18, 50-59: 8. Using cumulative frequency and class boundaries, which estimate is closest to the interquartile range?',
      options: ['19.4 thousand shillings', '24.5 thousand shillings', '15.0 thousand shillings', '31.2 thousand shillings'],
      correctAnswer: '19.4 thousand shillings',
      explanation: 'Cumulative frequencies are 5, 14, 30, 54, 72, 80. Q1 is the 20th value in 20-29: 19.5 + (20-14)/16 x 10 = 23.25. Q3 is the 60th value in 40-49: 39.5 + (60-54)/18 x 10 = 42.83. IQR = 42.83 - 23.25 = 19.58, closest to 19.4 thousand shillings.',
    },
    {
      id: 'q3',
      subject: 'Biology',
      topic: 'Photosynthesis',
      subtopic: 'Testing for starch',
      difficulty: 'medium',
      examStandard: 'exam_standard',
      questionStyle: 'experiment_based',
      question: 'A destarched leaf was partly covered with black paper and exposed to sunlight. After iodine testing, only the uncovered part turned blue-black. What conclusion is best supported?',
      options: [
        'Light is necessary for photosynthesis',
        'Carbon dioxide is not needed for photosynthesis',
        'Chlorophyll is destroyed by iodine',
        'Water is produced during photosynthesis',
      ],
      correctAnswer: 'Light is necessary for photosynthesis',
      explanation: 'Only the part exposed to light produced starch, shown by the blue-black iodine colour. The covered part received no light, so photosynthesis did not occur there.',
    },
    {
      id: 'q3a',
      subject: 'Chemistry',
      topic: 'Chemical Bonding and Structure',
      subtopic: 'Ionic bonding',
      difficulty: 'hard',
      examStandard: 'kcse_b',
      questionStyle: 'concept_comparison',
      question: 'Element X has electron arrangement 2.8.1 and element Y has 2.6. Which statement best explains the bonding in the compound formed by X and Y?',
      options: [
        'X transfers one electron to Y, forming ions held by electrostatic attraction',
        'Y transfers two electrons to X, forming a covalent molecule',
        'X and Y share one pair of electrons equally',
        'Both atoms donate electrons to a sea of mobile electrons',
      ],
      correctAnswer: 'X transfers one electron to Y, forming ions held by electrostatic attraction',
      explanation: 'X is a Group I metal and loses one electron to form X+. Y needs two electrons, so two X atoms each transfer one electron to Y, forming an ionic compound with electrostatic attraction between ions.',
    },
    {
      id: 'q3b',
      subject: 'Chemistry',
      topic: 'Structure and Bonding',
      subtopic: 'Giant covalent structures',
      difficulty: 'hard',
      examStandard: 'kcse_b',
      questionStyle: 'reason_giving',
      question: 'Diamond has a very high melting point and does not conduct electricity. Which explanation accounts for both properties?',
      options: [
        'It has a giant covalent structure with strong bonds and no mobile charged particles',
        'It has weak molecular forces and free ions',
        'It has metallic bonding but no delocalised electrons',
        'It dissolves in water to form ions only when heated',
      ],
      correctAnswer: 'It has a giant covalent structure with strong bonds and no mobile charged particles',
      explanation: 'Diamond consists of carbon atoms joined by strong covalent bonds in a giant lattice, requiring much heat to break. It lacks mobile ions or delocalised electrons, so it cannot conduct electricity.',
    },
    {
      id: 'q3c',
      subject: 'Chemistry',
      topic: 'Formulae and Equations',
      subtopic: 'Balancing equations',
      difficulty: 'hard',
      examStandard: 'kcse_b',
      questionStyle: 'common_mistake_correction',
      question: 'Which balanced equation correctly represents the reaction between aluminium and oxygen to form aluminium oxide?',
      options: ['4Al + 3O₂ → 2Al₂O₃', '2Al + O₂ → Al₂O₃', 'Al + O₂ → AlO₂', '2Al + 3O₂ → Al₂O₃'],
      correctAnswer: '4Al + 3O₂ → 2Al₂O₃',
      explanation: 'Aluminium oxide is Al₂O₃. Balancing aluminium and oxygen atoms gives 4Al + 3O₂ → 2Al₂O₃, with 4 aluminium atoms and 6 oxygen atoms on each side.',
    },
    {
      id: 'q3d',
      subject: 'Chemistry',
      topic: 'Acids, Bases and Indicators',
      subtopic: 'Salt preparation',
      difficulty: 'hard',
      examStandard: 'kcse_b',
      questionStyle: 'experiment_based',
      question: 'A student wants to prepare dry crystals of copper(II) sulphate from copper(II) oxide and dilute sulphuric acid. Which step is essential after warming and adding excess oxide?',
      options: [
        'Filter off the excess copper(II) oxide before evaporating the filtrate',
        'Add sodium hydroxide until a precipitate forms',
        'Distil the mixture to collect copper(II) sulphate vapour',
        'Add more acid until all the black solid dissolves completely',
      ],
      correctAnswer: 'Filter off the excess copper(II) oxide before evaporating the filtrate',
      explanation: 'Copper(II) oxide is an insoluble base. Excess oxide ensures all acid reacts, then filtration removes unreacted solid. The filtrate is evaporated and cooled to form copper(II) sulphate crystals.',
    },
    {
      id: 'q3e',
      subject: 'Chemistry',
      topic: 'Industrial Chemistry',
      subtopic: 'Haber process',
      difficulty: 'hard',
      examStandard: 'kcse_b',
      questionStyle: 'reason_giving',
      question: 'In the Haber process, nitrogen and hydrogen react as follows: N2(g) + 3H2(g) ⇌ 2NH3(g). Which set gives the usual KCSE industrial conditions used to obtain ammonia economically?',
      options: [
        'Iron catalyst, about 450°C and about 200 atmospheres',
        'Vanadium(V) oxide catalyst, about 450°C and 1 atmosphere',
        'Nickel catalyst, room temperature and low pressure',
        'Manganese(IV) oxide catalyst, high temperature and no pressure control',
      ],
      correctAnswer: 'Iron catalyst, about 450°C and about 200 atmospheres',
      explanation: 'The Haber process uses nitrogen and hydrogen, an iron catalyst, a moderately high temperature of about 450°C and high pressure of about 200 atmospheres. These are compromise conditions balancing rate, yield and cost.',
    },
    {
      id: 'q3f',
      subject: 'Chemistry',
      topic: 'Organic Chemistry',
      subtopic: 'Alkenes',
      difficulty: 'hard',
      examStandard: 'kcse_b',
      questionStyle: 'experiment_based',
      question: 'Ethene is bubbled through bromine water during an organic chemistry test. Which observation and conclusion are correct?',
      options: [
        'Bromine water is decolourised, showing ethene is unsaturated',
        'Bromine water turns blue, showing ethene is acidic',
        'A white precipitate forms, showing ethene contains chloride ions',
        'No change occurs, showing ethene is a saturated hydrocarbon',
      ],
      correctAnswer: 'Bromine water is decolourised, showing ethene is unsaturated',
      explanation: 'Alkenes such as ethene contain a carbon-carbon double bond. They decolourise bromine water by addition across the double bond, so this is a KCSE test for unsaturation.',
    },
    {
      id: 'q3g',
      subject: 'Chemistry',
      topic: 'Energy Changes',
      subtopic: 'Hess law and enthalpy of combustion',
      difficulty: 'hard',
      examStandard: 'kcse_b',
      questionStyle: 'calculation',
      question: 'The standard enthalpies of combustion of carbon, hydrogen and methane are -394 kJ mol⁻¹, -285 kJ mol⁻¹ and -890 kJ mol⁻¹ respectively. Using Hess law, calculate the enthalpy change for CH4(g) → C(s) + 2H2(g).',
      options: [
        '+74 kJ mol⁻¹',
        '-74 kJ mol⁻¹',
        '+1570 kJ mol⁻¹',
        '-1570 kJ mol⁻¹',
      ],
      correctAnswer: '+74 kJ mol⁻¹',
      explanation: 'For formation of methane: C(s) + 2H2(g) → CH4(g), ΔH = [combustion of C + 2(combustion of H2)] - [combustion of CH4] = [-394 + 2(-285)] - [-890] = -964 + 890 = -74 kJ mol⁻¹. The question asks for the reverse reaction, so ΔH = +74 kJ mol⁻¹.',
    },
    {
      id: 'q4',
      subject: 'Physics',
      topic: 'Electricity',
      subtopic: 'Ohm\'s law',
      difficulty: 'medium',
      examStandard: 'exam_standard',
      questionStyle: 'calculation',
      question: 'A current of 0.5 A flows through a resistor when connected to a 6 V battery. What is the resistance of the resistor?',
      options: ['12 \u03A9', '3 \u03A9', '6.5 \u03A9', '0.083 \u03A9'],
      correctAnswer: '12 \u03A9',
      explanation: 'Using Ohm\'s law, V = IR. Therefore R = V/I = 6/0.5 = 12 \u03A9.',
    },
    {
      id: 'q5',
      subject: 'Kiswahili',
      topic: 'Sarufi',
      subtopic: 'Ngeli na upatanisho',
      difficulty: 'medium',
      examStandard: 'exam_standard',
      questionStyle: 'common_mistake_correction',
      question: 'Chagua sentensi iliyo na upatanisho sahihi wa kisarufi.',
      options: [
        'Vitabu hivi ni vizuri.',
        'Vitabu hii ni vizuri.',
        'Kitabu hivi ni nzuri.',
        'Vitabu hawa ni vizuri.',
      ],
      correctAnswer: 'Vitabu hivi ni vizuri.',
      explanation: 'Neno "vitabu" liko katika ngeli ya KI-VI. Kwa wingi, upatanisho sahihi ni "hivi" na "vizuri".',
    },
    {
      id: 'q6',
      subject: 'English',
      topic: 'Grammar',
      subtopic: 'Question tags',
      difficulty: 'medium',
      examStandard: 'exam_standard',
      questionStyle: 'common_mistake_correction',
      question: 'Choose the correct question tag: "Wanjiku has completed the assignment, ____?"',
      options: ['hasn\'t she', 'has she', 'didn\'t she', 'doesn\'t she'],
      correctAnswer: 'hasn\'t she',
      explanation: 'The statement is positive and uses the auxiliary verb "has". A positive statement takes a negative question tag, so the correct answer is "hasn\'t she".',
    },
    {
      id: 'q7',
      subject: 'Geography',
      topic: 'Map Work',
      subtopic: 'Bearing',
      difficulty: 'medium',
      examStandard: 'exam_standard',
      questionStyle: 'application_scenario',
      question: 'On a map, town B lies directly east of town A. What is the bearing of B from A?',
      options: ['090\u00B0', '180\u00B0', '270\u00B0', '045\u00B0'],
      correctAnswer: '090\u00B0',
      explanation: 'Bearings are measured clockwise from north. East is 90 degrees clockwise from north, written as 090\u00B0.',
    },
    {
      id: 'q8',
      subject: 'History & Government',
      topic: 'Government',
      subtopic: 'Devolution',
      difficulty: 'medium',
      examStandard: 'exam_standard',
      questionStyle: 'reason_giving',
      question: 'Which reason best explains why devolution was introduced in Kenya under the 2010 Constitution?',
      options: [
        'To bring services and resources closer to citizens in counties',
        'To abolish the national government completely',
        'To make all counties independent countries',
        'To remove the role of elected leaders',
      ],
      correctAnswer: 'To bring services and resources closer to citizens in counties',
      explanation: 'Devolution created county governments so that public services, development and decision-making could be brought closer to citizens across Kenya.',
    },
    {
      id: 'q9',
      subject: 'Business Studies',
      topic: 'Demand and Supply',
      subtopic: 'Market equilibrium',
      difficulty: 'medium',
      examStandard: 'exam_standard',
      questionStyle: 'application_scenario',
      question: 'When the government removes a subsidy on maize flour, the supply curve shifts to the left. What is the most likely immediate effect on the market?',
      options: [
        'Price rises and quantity falls',
        'Price falls and quantity rises',
        'Both price and quantity rise',
        'Both price and quantity fall',
      ],
      correctAnswer: 'Price rises and quantity falls',
      explanation: 'A leftward shift in supply means less is supplied at every price. This creates excess demand, pushing the price up while the quantity traded falls.',
    },
    {
      id: 'q10',
      subject: 'CRE',
      topic: 'The Sinai Covenant',
      subtopic: 'The Ten Commandments',
      difficulty: 'medium',
      examStandard: 'exam_standard',
      questionStyle: 'reason_giving',
      question: 'According to the Old Testament, why did God give the Ten Commandments to the Israelites at Mount Sinai?',
      options: [
        'To guide them in living as a holy nation in a covenant relationship with God',
        'To punish them for worshipping the golden calf',
        'To make them stronger than neighbouring nations',
        'To replace the promises made to Abraham',
      ],
      correctAnswer: 'To guide them in living as a holy nation in a covenant relationship with God',
      explanation: 'The Ten Commandments formed the core of the Sinai covenant, giving Israel a moral and spiritual framework to live as God\'s chosen people set apart for His purpose.',
    },
    {
      id: 'q11',
      subject: 'IRE',
      topic: 'Pillars of Islam',
      subtopic: 'Salah (Prayer)',
      difficulty: 'medium',
      examStandard: 'exam_standard',
      questionStyle: 'reason_giving',
      question: 'Why is Salah considered the most important act of worship after the Shahada in Islam?',
      options: [
        'It is a direct connection between the believer and Allah performed five times daily',
        'It can only be performed in the mosque',
        'It replaces the need for Zakah',
        'It was revealed after the other pillars',
      ],
      correctAnswer: 'It is a direct connection between the believer and Allah performed five times daily',
      explanation: 'Salah is the second pillar of Islam and a direct act of submission to Allah. The Prophet (SAW) described it as "the coolness of my eyes" and it is the first deed a person will be asked about on the Day of Judgement.',
    },
    {
      id: 'q12',
      subject: 'Agriculture',
      topic: 'Soil Fertility',
      subtopic: 'Organic manure',
      difficulty: 'medium',
      examStandard: 'exam_standard',
      questionStyle: 'application_scenario',
      question: 'A farmer notices that soil on his farm has become less productive over the years. Which practice would best restore soil fertility naturally?',
      options: [
        'Applying well-decomposed farmyard manure and practising crop rotation',
        'Burning all crop residues after every harvest',
        'Applying inorganic fertiliser every planting season without other changes',
        'Leaving the land fallow for only one month each year',
      ],
      correctAnswer: 'Applying well-decomposed farmyard manure and practising crop rotation',
      explanation: 'Organic manure improves soil structure and adds nutrients. Crop rotation prevents nutrient depletion and reduces pest build-up. Combined, they restore fertility sustainably.',
    },
    {
      id: 'q13',
      subject: 'Computer Studies',
      topic: 'Data Representation',
      subtopic: 'Number systems',
      difficulty: 'medium',
      examStandard: 'exam_standard',
      questionStyle: 'calculation',
      question: 'What is the decimal equivalent of the binary number 1101101?',
      options: ['109', '87', '105', '93'],
      correctAnswer: '109',
      explanation: '1101101 = 1\u00D72\u2076 + 1\u00D72\u2075 + 0\u00D72\u2074 + 1\u00D72\u00B3 + 1\u00D72\u00B2 + 0\u00D72 + 1 = 64 + 32 + 0 + 8 + 4 + 0 + 1 = 109.',
    },
    // CBC / KJSEA subjects
    {
      id: 'q14',
      subject: 'Integrated Science',
      topic: 'Matter',
      subtopic: 'Separation of mixtures',
      difficulty: 'medium',
      examStandard: 'cbc_standard',
      questionStyle: 'application_scenario',
      question: 'A learner mixed sand and salt. Which method would best separate both substances and recover the salt?',
      options: [
        'Add water, filter the sand, then evaporate the filtrate',
        'Use a magnet to remove the salt',
        'Pick the salt crystals by hand',
        'Heat the mixture directly until the sand disappears',
      ],
      correctAnswer: 'Add water, filter the sand, then evaporate the filtrate',
      explanation: 'Salt dissolves in water but sand does not. Filtering removes sand, and evaporating the filtrate leaves salt crystals behind.',
    },
    {
      id: 'q15',
      subject: 'Social Studies',
      topic: 'Kenyan Communities',
      subtopic: 'National symbols',
      difficulty: 'easy',
      examStandard: 'cbc_standard',
      questionStyle: 'exam_style_recall',
      question: 'What do the colours of the Kenyan flag represent?',
      options: [
        'Black for the people, red for struggle, green for agriculture, white for peace',
        'Black for unity, red for love, green for forests, white for purity',
        'Black for Africa, red for the soil, green for the flag, white for rivers',
        'Black for courage, red for war, green for money, white for honesty',
      ],
      correctAnswer: 'Black for the people, red for struggle, green for agriculture, white for peace',
      explanation: 'The black represents the people of Kenya, red represents the struggle for independence, green represents agriculture and natural resources, and the white fimbriation represents peace and unity.',
    },
    {
      id: 'q16',
      subject: 'Science & Technology',
      topic: 'Forces and Energy',
      subtopic: 'Simple machines',
      difficulty: 'easy',
      examStandard: 'cbc_standard',
      questionStyle: 'application_scenario',
      question: 'Otieno uses a wheelbarrow to carry a heavy load of soil in his father\'s farm. The wheelbarrow makes the work easier because it acts as which type of simple machine?',
      options: ['A lever', 'A pulley', 'An inclined plane', 'A wedge'],
      correctAnswer: 'A lever',
      explanation: 'A wheelbarrow is a type of lever. The wheel is the fulcrum, the load is between the fulcrum and the effort, making it a second-class lever that multiplies force.',
    },
    {
      id: 'q17',
      subject: 'Mathematics (CBC)',
      topic: 'Measurement',
      subtopic: 'Area',
      difficulty: 'easy',
      examStandard: 'cbc_standard',
      questionStyle: 'calculation',
      question: 'A farmer has a rectangular vegetable plot measuring 12 m by 8 m. What is the area of the plot?',
      options: ['96 m\u00B2', '40 m\u00B2', '48 m\u00B2', '20 m\u00B2'],
      correctAnswer: '96 m\u00B2',
      explanation: 'Area of a rectangle = length \u00D7 width = 12 m \u00D7 8 m = 96 square metres.',
    },
    {
      id: 'q17a',
      subject: 'Mathematics (CBC)',
      topic: 'Fractions',
      subtopic: 'Blackboard fraction model',
      difficulty: 'medium',
      examStandard: 'cbc_standard',
      questionStyle: 'graph_interpretation',
      excerpt: 'Blackboard sketch:\nA rectangle is divided into 12 equal squares.\n8 squares are shaded.\nThe teacher writes: shaded part = ?',
      question: 'Which fraction in simplest form represents the shaded part of the blackboard rectangle?',
      options: ['2/3', '8/12', '3/2', '4/12'],
      correctAnswer: '2/3',
      explanation: 'The shaded fraction is 8/12. Dividing numerator and denominator by 4 gives 2/3. The visual helps the learner connect the picture to simplification.',
    },
    {
      id: 'q17b',
      subject: 'Integrated Science',
      topic: 'Electricity',
      subtopic: 'Simple circuit interpretation',
      difficulty: 'medium',
      examStandard: 'cbc_standard',
      questionStyle: 'graph_interpretation',
      excerpt: 'Blackboard circuit sketch:\n[Cell] ---- [Switch] ---- [Bulb]\nThe switch is open.',
      question: 'What will happen to the bulb in the circuit shown on the blackboard?',
      options: ['It will not light because the circuit is incomplete', 'It will light brightly because the cell is present', 'It will burst because the switch is open', 'It will light only if the wire is removed'],
      correctAnswer: 'It will not light because the circuit is incomplete',
      explanation: 'An open switch breaks the circuit. Current cannot flow through the bulb until the switch is closed.',
    },
    {
      id: 'q17c',
      subject: 'Social Studies',
      topic: 'Map skills',
      subtopic: 'Direction and landmarks',
      difficulty: 'medium',
      examStandard: 'cbc_standard',
      questionStyle: 'application_scenario',
      excerpt: 'Simple map board:\nClinic is north of the school.\nMarket is east of the school.\nRiver is south of the school.\nChief camp is west of the school.',
      question: 'A learner walks from the school to the market. Which direction does the learner take?',
      options: ['East', 'West', 'North', 'South'],
      correctAnswer: 'East',
      explanation: 'The map board states that the market is east of the school, so the learner walks east.',
    },
    {
      id: 'q17d',
      subject: 'Pre-Technical Studies',
      topic: 'Engineering sketches',
      subtopic: 'Orthographic view',
      difficulty: 'hard',
      examStandard: 'cbc_standard',
      questionStyle: 'graph_interpretation',
      excerpt: 'Blackboard object sketch:\nA block is 6 cm long, 4 cm wide and 3 cm high.\nThe front face shows length and height.',
      question: 'Which dimensions should appear on the front elevation of the block?',
      options: ['6 cm by 3 cm', '6 cm by 4 cm', '4 cm by 3 cm', '6 cm by 4 cm by 3 cm'],
      correctAnswer: '6 cm by 3 cm',
      explanation: 'A front elevation shows width across the front and height. In this description, the front face shows length and height, so it is 6 cm by 3 cm.',
    },
    // KPSEA-grade primary questions
    {
      id: 'q18',
      subject: 'English',
      topic: 'Grammar',
      subtopic: 'Verbs and tenses',
      difficulty: 'easy',
      examStandard: 'cbc_standard',
      questionStyle: 'common_mistake_correction',
      question: 'Which sentence is grammatically correct?',
      options: [
        'The children are playing in the field now.',
        'The children is playing in the field now.',
        'The children am playing in the field now.',
        'The children be playing in the field now.',
      ],
      correctAnswer: 'The children are playing in the field now.',
      explanation: 'The subject "children" is plural, so it requires the plural verb "are" to form the present continuous tense.',
    },
    {
      id: 'q19',
      subject: 'Kiswahili',
      topic: 'Msamiati',
      subtopic: 'Vyakula',
      difficulty: 'easy',
      examStandard: 'cbc_standard',
      questionStyle: 'exam_style_recall',
      question: 'Ni chakula gani kati ya hivi kinatokana na maziwa?',
      options: ['Jibini', 'Sukuma wiki', 'Wali', 'Maharagwe'],
      correctAnswer: 'Jibini',
      explanation: 'Jibini hutengenezwa kwa kuchachusha maziwa. Ni nyenzo muhimu katika lishe yenye protini nyingi.',
    },
    {
      id: 'q20',
      subject: 'Mathematics',
      topic: 'Fractions',
      subtopic: 'Simple fractions',
      difficulty: 'easy',
      examStandard: 'cbc_standard',
      questionStyle: 'application_scenario',
      question: 'Akipa had 12 oranges. He gave \u00BC of them to his friend. How many oranges did he give away?',
      options: ['3', '4', '6', '8'],
      correctAnswer: '3',
      explanation: '\u00BC of 12 means 12 \u00F7 4 = 3. So Akipa gave 3 oranges to his friend.',
    },
  ]
}
