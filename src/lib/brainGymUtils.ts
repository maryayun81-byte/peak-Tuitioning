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

export type BrainGymQuestion = {
  id: string
  subject: string
  topic: string
  subtopic?: string
  difficulty: QuestionDifficulty
  examStandard?: 'foundation' | 'exam_standard' | 'kcse_b' | 'kcse_a' | 'cbc_standard'
  questionStyle?: QuestionStyle
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}

export function normaliseText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function sanitizeQuestions(questions: any[]): BrainGymQuestion[] {
  return questions
    .map((q: any, index: number) => {
      if (!q || typeof q !== 'object') return null

      const question = String(q.question || '').trim()
      const explanation = String(q.explanation || '').trim()

      let options = Array.isArray(q.options)
        ? q.options.map((o: any) => String(o).trim()).filter(Boolean)
        : []

      options = Array.from(new Set(options))

      let correctAnswer = String(q.correctAnswer || '').trim()

      if (!question || !explanation || !correctAnswer) return null
      if (options.length !== 4) return null
      if (options.every((o: string) => /^[A-D]$/i.test(o))) return null

      if (/^[A-D]$/i.test(correctAnswer)) {
        const letterIndex = correctAnswer.toUpperCase().charCodeAt(0) - 65
        correctAnswer = options[letterIndex]
      }

      const looseMatch = options.find(
        (o: string) => o.toLowerCase() === correctAnswer.toLowerCase()
      )

      if (!options.includes(correctAnswer) && looseMatch) {
        correctAnswer = looseMatch
      }

      if (!options.includes(correctAnswer)) return null
      if (question.length < 35) return null
      if (explanation.length < 45) return null

      if (/all of the above/i.test(options.join(' '))) return null
      if (/none of the above/i.test(options.join(' '))) return null

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
        question,
        options,
        correctAnswer,
        explanation,
      } as BrainGymQuestion
    })
    .filter((q): q is BrainGymQuestion => q !== null)
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

    return normalisedSubjects.some(s =>
      s.includes(qSubject) ||
      qSubject.includes(s) ||
      (qSubject === 'integratedscience' && (s.includes('science') || s.includes('integrated'))) ||
      (qSubject === 'science' && s.includes('integrated')) ||
      (qSubject === 'mathematicscbc' && s.includes('math')) ||
      (qSubject === 'math' && s.includes('mathematics')) ||
      (qSubject === 'mathematics' && s.includes('math')) ||
      (qSubject === 'scienceandtechnology' && s.includes('science')) ||
      (qSubject === 'historygovernment' && (s.includes('history') || s.includes('government'))) ||
      (qSubject === 'history' && s.includes('government')) ||
      (qSubject === 'government' && s.includes('history')) ||
      (qSubject === 'businessstudies' && s.includes('business')) ||
      (qSubject === 'business' && s.includes('businessstudies')) ||
      (qSubject === 'english' && s.includes('literature')) ||
      (qSubject === 'literature' && s.includes('english')) ||
      (qSubject === 'chemistry' && s.includes('science')) ||
      (qSubject === 'physics' && s.includes('science')) ||
      (qSubject === 'biology' && s.includes('science'))
    )
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
