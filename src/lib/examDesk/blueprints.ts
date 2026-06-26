export type ExamCurriculum = 'KCSE' | 'KJSEA' | 'KPSEA'

export type ExamBlueprint = {
  id: string
  curriculum: ExamCurriculum
  level: string
  subject: string
  paper: string
  durationMinutes: number
  totalMarks: number
  sections: {
    name: string
    marks: number
    questionCount: number
    choose?: number
    type: 'short_structured' | 'long_structured' | 'composition' | 'competency_task'
  }[]
  topicWeighting: Record<string, number>
  commandWords: string[]
  neverIncludeTopics: string[]
  examinerIdentity: string
  materialsAllowed: string[]
}

export type ExamQuestion = {
  id: string
  sectionName: string
  marks: number
  commandWords: string[]
  syllabusOutcome: string
  questionText: string
  requiresTool?: string | null
  markingScheme: { step: string; marks: number; type: 'M' | 'A' | 'C' | 'B' }[]
  modelAnswer: string
  commonErrors: string[]
}

export type GeneratedExamPaper = {
  paperMeta: {
    curriculum: ExamCurriculum
    level: string
    subject: string
    paper: string
    durationMinutes: number
    totalMarks: number
    blueprintId: string
  }
  sections: { sectionName: string; questions: ExamQuestion[] }[]
}

export const EXAM_BLUEPRINTS: ExamBlueprint[] = [
  {
    id: 'kcse-mathematics-paper-1',
    curriculum: 'KCSE',
    level: 'Form 4',
    subject: 'Mathematics',
    paper: 'Paper 1',
    durationMinutes: 150,
    totalMarks: 100,
    sections: [
      { name: 'Section I', marks: 50, questionCount: 16, type: 'short_structured' },
      { name: 'Section II', marks: 50, questionCount: 5, type: 'long_structured' },
    ],
    topicWeighting: {
      Algebra: 16,
      'Commercial arithmetic': 10,
      'Surds, logarithms and indices': 12,
      'Sequences and series': 8,
      'Circle geometry': 10,
      'Coordinate geometry': 12,
      Vectors: 8,
      'Basic statistics': 8,
      'Scale drawing and inequalities': 16,
    },
    commandWords: ['Simplify', 'Evaluate', 'Solve', 'Find', 'Calculate', 'Determine', 'Show that', 'Construct'],
    neverIncludeTopics: ['Matrices', 'Transformations', 'Calculus', 'Latitude and longitude', 'Linear programming', 'Histograms and ogives'],
    examinerIdentity: 'You are a KNEC Chief Examiner setting KCSE Mathematics Paper 1.',
    materialsAllowed: ['Mathematical tables', 'Geometry set', 'Scientific calculator where allowed by school policy'],
  },
  {
    id: 'kcse-mathematics-paper-2',
    curriculum: 'KCSE',
    level: 'Form 4',
    subject: 'Mathematics',
    paper: 'Paper 2',
    durationMinutes: 150,
    totalMarks: 100,
    sections: [
      { name: 'Section I', marks: 50, questionCount: 16, type: 'short_structured' },
      { name: 'Section II', marks: 50, questionCount: 8, choose: 5, type: 'long_structured' },
    ],
    topicWeighting: {
      Matrices: 10,
      Transformations: 10,
      Statistics: 12,
      Calculus: 14,
      'Latitude and longitude': 10,
      'Three-dimensional geometry': 8,
      Trigonometry: 12,
      'Linear motion': 8,
      'Graph work and approximation': 16,
    },
    commandWords: ['Find', 'Determine', 'Calculate', 'Show that', 'Sketch', 'Complete the table', 'Hence', 'Draw'],
    neverIncludeTopics: ['Commercial arithmetic as a main question', 'Scale drawing', 'Simple simultaneous equations only'],
    examinerIdentity: 'You are a KNEC Chief Examiner setting KCSE Mathematics Paper 2.',
    materialsAllowed: ['Mathematical tables', 'Geometry set', 'Graph paper', 'Scientific calculator where allowed by school policy'],
  },
  {
    id: 'kcse-english-paper-1',
    curriculum: 'KCSE',
    level: 'Form 4',
    subject: 'English',
    paper: 'Paper 1',
    durationMinutes: 120,
    totalMarks: 60,
    sections: [
      { name: 'Functional Writing', marks: 20, questionCount: 1, type: 'composition' },
      { name: 'Cloze Test', marks: 10, questionCount: 1, type: 'short_structured' },
      { name: 'Oral Skills', marks: 30, questionCount: 4, type: 'short_structured' },
    ],
    topicWeighting: {
      'Functional writing': 20,
      'Cloze test': 10,
      'Oral skills': 30,
    },
    commandWords: ['Write', 'Fill', 'State', 'Identify', 'Explain', 'Give', 'Underline'],
    neverIncludeTopics: ['Set-book essay', 'Poetry appreciation as Paper 2', 'Literature Paper 3 essay'],
    examinerIdentity: 'You are a KNEC Chief Examiner setting KCSE English Paper 1.',
    materialsAllowed: ['Blue or black pen'],
  },
  {
    id: 'kjsea-grade-9-mathematics',
    curriculum: 'KJSEA',
    level: 'Grade 9',
    subject: 'Mathematics-CBC',
    paper: 'Competency Assessment',
    durationMinutes: 90,
    totalMarks: 50,
    sections: [
      { name: 'Selected Response', marks: 20, questionCount: 10, type: 'short_structured' },
      { name: 'Performance Tasks', marks: 30, questionCount: 4, type: 'competency_task' },
    ],
    topicWeighting: {
      Numbers: 10,
      Algebra: 10,
      Geometry: 10,
      Measurement: 10,
      'Data handling': 10,
    },
    commandWords: ['Work out', 'Explain', 'Represent', 'Compare', 'Estimate', 'Justify'],
    neverIncludeTopics: ['KCSE calculus', 'Advanced matrices', 'Form 4 trigonometric identities'],
    examinerIdentity: 'You are a KICD assessment specialist setting a Grade 9 KJSEA Mathematics competency assessment.',
    materialsAllowed: ['Pencil', 'Ruler', 'Calculator where instructed'],
  },
  {
    id: 'kpsea-grade-6-mathematics',
    curriculum: 'KPSEA',
    level: 'Grade 6',
    subject: 'Mathematics-CBC',
    paper: 'KPSEA Practice Paper',
    durationMinutes: 75,
    totalMarks: 40,
    sections: [
      { name: 'Core Skills', marks: 24, questionCount: 12, type: 'short_structured' },
      { name: 'Everyday Application', marks: 16, questionCount: 4, type: 'competency_task' },
    ],
    topicWeighting: {
      'Whole numbers': 8,
      Fractions: 8,
      Decimals: 6,
      Measurement: 8,
      Geometry: 5,
      'Data handling': 5,
    },
    commandWords: ['Find', 'Count', 'Work out', 'Choose', 'Explain', 'Draw'],
    neverIncludeTopics: ['Junior secondary algebra', 'Negative indices', 'KCSE circle theorems'],
    examinerIdentity: 'You are a KICD assessment specialist setting an age-appropriate Grade 6 KPSEA Mathematics paper.',
    materialsAllowed: ['Pencil', 'Ruler', 'Eraser'],
  },
]

export function listExamBlueprints() {
  return EXAM_BLUEPRINTS.map(({ id, curriculum, level, subject, paper, durationMinutes, totalMarks }) => ({
    id,
    curriculum,
    level,
    subject,
    paper,
    durationMinutes,
    totalMarks,
  }))
}

export function getExamBlueprint(id: string) {
  return EXAM_BLUEPRINTS.find(blueprint => blueprint.id === id) || EXAM_BLUEPRINTS[0]
}

export function buildExamGenerationPrompt(blueprint: ExamBlueprint, weakOutcomes: string[]) {
  return `
${blueprint.examinerIdentity}

Generate an authentic Kenyan national examination paper. This is not a quiz.

BLUEPRINT LOCK:
${JSON.stringify(blueprint, null, 2)}

ADAPTIVE READINESS MEMORY:
${weakOutcomes.length ? weakOutcomes.map(item => `- ${item}`).join('\n') : '- No weak outcomes recorded yet.'}

Rules:
- Paper identity controls content. Do not leak topics from another paper.
- Respect neverIncludeTopics.
- Use only the listed command words or close KNEC/KICD equivalents.
- Every question must carry marks, a syllabus outcome, model answer, common errors and a step-by-step marking scheme.
- Total marks across all returned questions must equal ${blueprint.totalMarks}.
- For Mathematics and Sciences, rework all numbers before returning.
- For CBC, use competency-based scenarios and learning outcomes, not shallow recall.

Return ONLY valid JSON:
{
  "paperMeta": {
    "curriculum": "${blueprint.curriculum}",
    "level": "${blueprint.level}",
    "subject": "${blueprint.subject}",
    "paper": "${blueprint.paper}",
    "durationMinutes": ${blueprint.durationMinutes},
    "totalMarks": ${blueprint.totalMarks},
    "blueprintId": "${blueprint.id}"
  },
  "sections": [
    {
      "sectionName": "Section name",
      "questions": [
        {
          "id": "q1",
          "sectionName": "Section name",
          "marks": 4,
          "commandWords": ["Find"],
          "syllabusOutcome": "Specific outcome",
          "questionText": "Question text",
          "requiresTool": null,
          "markingScheme": [{"step":"Correct method","marks":1,"type":"M"}],
          "modelAnswer": "Expected answer",
          "commonErrors": ["Common error"]
        }
      ]
    }
  ]
}
`
}

export function validateExamPaper(paper: GeneratedExamPaper, blueprint: ExamBlueprint) {
  const questions = paper.sections.flatMap(section => section.questions)
  if (paper.paperMeta.blueprintId !== blueprint.id) return false
  if (paper.paperMeta.totalMarks !== blueprint.totalMarks) return false
  const total = questions.reduce((sum, q) => sum + Number(q.marks || 0), 0)
  if (total !== blueprint.totalMarks) return false
  const forbidden = blueprint.neverIncludeTopics.join('|')
  if (forbidden && new RegExp(forbidden, 'i').test(questions.map(q => q.questionText).join('\n'))) return false
  return questions.every(q =>
    q.id &&
    q.questionText &&
    q.syllabusOutcome &&
    q.marks > 0 &&
    Array.isArray(q.markingScheme) &&
    q.markingScheme.reduce((sum, step) => sum + Number(step.marks || 0), 0) === q.marks
  )
}

export function getFallbackExamPaper(blueprint: ExamBlueprint): GeneratedExamPaper {
  if (blueprint.id === 'kcse-mathematics-paper-2') {
    return getMathematicsPaper2Fallback(blueprint)
  }

  const sectionMarks = blueprint.sections.reduce((sum, section) => sum + section.marks, 0)
  const scale = sectionMarks === blueprint.totalMarks ? 1 : blueprint.totalMarks / sectionMarks

  return {
    paperMeta: {
      curriculum: blueprint.curriculum,
      level: blueprint.level,
      subject: blueprint.subject,
      paper: blueprint.paper,
      durationMinutes: blueprint.durationMinutes,
      totalMarks: blueprint.totalMarks,
      blueprintId: blueprint.id,
    },
    sections: blueprint.sections.map((section, sectionIndex) => {
      const questionCount = Math.min(section.questionCount, section.type === 'composition' ? 1 : 5)
      const baseMarks = Math.max(1, Math.floor((section.marks * scale) / questionCount))
      const questions = Array.from({ length: questionCount }, (_, index) => {
        const topic = Object.keys(blueprint.topicWeighting)[(sectionIndex + index) % Object.keys(blueprint.topicWeighting).length]
        const isLast = index === questionCount - 1
        const used = baseMarks * (questionCount - 1)
        const marks = isLast ? Math.max(1, Math.round(section.marks * scale) - used) : baseMarks
        return {
          id: `s${sectionIndex + 1}q${index + 1}`,
          sectionName: section.name,
          marks,
          commandWords: [blueprint.commandWords[index % blueprint.commandWords.length]],
          syllabusOutcome: `${topic}: examiner-standard application`,
          questionText: buildFallbackQuestionText(blueprint, topic, marks, index),
          requiresTool: null,
          markingScheme: [
            { step: 'Correct interpretation of the task', marks: 1, type: 'M' as const },
            { step: 'Valid working, evidence or explanation aligned to the syllabus outcome', marks: Math.max(1, marks - 2), type: 'M' as const },
            { step: 'Correct final answer, conclusion, format or units', marks: 1, type: 'A' as const },
          ].filter(step => step.marks > 0),
          modelAnswer: buildFallbackModelAnswer(blueprint, topic),
          commonErrors: ['Ignoring the command word', 'Giving an answer without supporting working or evidence'],
        }
      })
      return { sectionName: section.name, questions }
    }),
  }
}

function makeExamQuestion(input: {
  id: string
  sectionName: string
  marks: number
  command: string
  outcome: string
  text: string
  modelAnswer: string
  commonErrors?: string[]
}): ExamQuestion {
  return {
    id: input.id,
    sectionName: input.sectionName,
    marks: input.marks,
    commandWords: [input.command],
    syllabusOutcome: input.outcome,
    questionText: `${input.text} (${input.marks} marks)`,
    requiresTool: null,
    markingScheme: [
      { step: 'Select and apply the correct KCSE method', marks: 1, type: 'M' },
      { step: 'Show accurate working with correct substitution, simplification and intermediate values', marks: Math.max(1, input.marks - 2), type: 'M' },
      { step: 'State the final answer in the required form with correct units where necessary', marks: 1, type: 'A' },
    ].filter(step => step.marks > 0) as ExamQuestion['markingScheme'],
    modelAnswer: input.modelAnswer,
    commonErrors: input.commonErrors || ['Skipping working', 'Rounding too early', 'Using a Paper 1 method for a Paper 2 topic'],
  }
}

function getMathematicsPaper2Fallback(blueprint: ExamBlueprint): GeneratedExamPaper {
  const sectionI = 'Section I'
  const sectionII = 'Section II'
  const shortQuestions = [
    makeExamQuestion({
      id: 's1q1',
      sectionName: sectionI,
      marks: 3,
      command: 'Find',
      outcome: 'Matrices: inverse and simultaneous equations',
      text: 'Given A = [[2, 1], [5, 3]], find A^-1 and hence solve 2x + y = 7 and 5x + 3y = 18.',
      modelAnswer: 'det A = 1, A^-1 = [[3, -1], [-5, 2]]. [x, y]^T = A^-1[7, 18]^T = [3, 1]^T; x = 3, y = 1.',
    }),
    makeExamQuestion({
      id: 's1q2',
      sectionName: sectionI,
      marks: 3,
      command: 'Determine',
      outcome: 'Transformations: reflection and image coordinates',
      text: 'Triangle PQR has P(1, 2), Q(4, 2) and R(2, 5). Determine the coordinates of P\'Q\'R\' after reflection in the line y = x.',
      modelAnswer: 'Reflection in y = x maps (x, y) to (y, x). P\'(2, 1), Q\'(2, 4), R\'(5, 2).',
    }),
    makeExamQuestion({
      id: 's1q3',
      sectionName: sectionI,
      marks: 3,
      command: 'Calculate',
      outcome: 'Statistics: mean from grouped frequency data',
      text: 'The masses of 30 parcels were recorded as follows: 0-4 kg: 5, 5-9 kg: 8, 10-14 kg: 10, 15-19 kg: 7. Calculate the mean mass.',
      modelAnswer: 'Midpoints: 2, 7, 12, 17. Sum fx = 10 + 56 + 120 + 119 = 305. Mean = 305/30 = 10.17 kg.',
    }),
    makeExamQuestion({
      id: 's1q4',
      sectionName: sectionI,
      marks: 3,
      command: 'Find',
      outcome: 'Differentiation: gradient of a curve',
      text: 'Find the gradient of the curve y = 2x^3 - 5x^2 + 4x - 7 at x = 2.',
      modelAnswer: 'dy/dx = 6x^2 - 10x + 4. At x = 2, gradient = 24 - 20 + 4 = 8.',
    }),
    makeExamQuestion({
      id: 's1q5',
      sectionName: sectionI,
      marks: 3,
      command: 'Calculate',
      outcome: 'Latitude and longitude: distance along a parallel',
      text: 'Two towns A(30°N, 20°E) and B(30°N, 50°E) lie on the same latitude. Taking the radius of the earth as 6370 km and pi = 22/7, calculate the distance from A to B along the parallel of latitude.',
      modelAnswer: 'Longitude difference = 30°. Distance = (30/360) x 2π x 6370 x cos 30° = about 2889 km.',
    }),
    makeExamQuestion({
      id: 's1q6',
      sectionName: sectionI,
      marks: 3,
      command: 'Determine',
      outcome: 'Linear motion: displacement and velocity',
      text: 'A particle moves in a straight line so that s = t^3 - 6t^2 + 9t + 4 metres. Determine its velocity when t = 3 seconds.',
      modelAnswer: 'v = ds/dt = 3t^2 - 12t + 9. At t = 3, v = 27 - 36 + 9 = 0 m/s.',
    }),
    makeExamQuestion({
      id: 's1q7',
      sectionName: sectionI,
      marks: 3,
      command: 'Find',
      outcome: 'Trigonometry: sine rule',
      text: 'In triangle ABC, angle A = 42°, angle B = 68° and side a = 9.6 cm. Find side b to 3 significant figures.',
      modelAnswer: 'By sine rule, b/sin 68° = 9.6/sin 42°. b = 9.6 sin 68° / sin 42° = 13.3 cm.',
    }),
    makeExamQuestion({
      id: 's1q8',
      sectionName: sectionI,
      marks: 3,
      command: 'Solve',
      outcome: 'Logarithms and graph work: exponential equation',
      text: 'Solve for x: 3^(x + 1) = 27^(2x - 1).',
      modelAnswer: '27 = 3^3, so 3^(x+1) = 3^(6x-3). x + 1 = 6x - 3, hence x = 4/5.',
    }),
    makeExamQuestion({
      id: 's1q9',
      sectionName: sectionI,
      marks: 3,
      command: 'Calculate',
      outcome: 'Three-dimensional geometry: angle with a plane',
      text: 'A vertical pole 12 m high stands at the centre of a square field of side 10 m. Calculate the angle of elevation of the top of the pole from one corner of the field.',
      modelAnswer: 'Horizontal distance from centre to corner = sqrt(5^2 + 5^2) = 7.07 m. tan θ = 12/7.07, θ = 59.5°.',
    }),
    makeExamQuestion({
      id: 's1q10',
      sectionName: sectionI,
      marks: 3,
      command: 'Find',
      outcome: 'Matrices: determinant and singularity',
      text: 'Find the value of k for which the matrix [[k, 4], [3, 6]] has no inverse.',
      modelAnswer: 'A matrix has no inverse when determinant = 0. 6k - 12 = 0, so k = 2.',
    }),
    makeExamQuestion({
      id: 's1q11',
      sectionName: sectionI,
      marks: 3,
      command: 'Determine',
      outcome: 'Transformations: enlargement',
      text: 'Point A(2, -1) is enlarged by scale factor 3 centre (1, 2). Determine the image A\'.',
      modelAnswer: 'Vector from centre to A is (1, -3). Multiply by 3 gives (3, -9). Add centre: A\'(4, -7).',
    }),
    makeExamQuestion({
      id: 's1q12',
      sectionName: sectionI,
      marks: 3,
      command: 'Calculate',
      outcome: 'Statistics: standard deviation',
      text: 'The marks 4, 6, 7, 9 and 14 were obtained by five learners. Calculate the standard deviation, correct to 2 decimal places.',
      modelAnswer: 'Mean = 8. Sum squared deviations = 16 + 4 + 1 + 1 + 36 = 58. Variance = 58/5 = 11.6. Standard deviation = 3.41.',
    }),
    makeExamQuestion({
      id: 's1q13',
      sectionName: sectionI,
      marks: 3,
      command: 'Show that',
      outcome: 'Calculus: stationary points',
      text: 'Show that the curve y = x^3 - 6x^2 + 9x + 2 has stationary points at x = 1 and x = 3.',
      modelAnswer: 'dy/dx = 3x^2 - 12x + 9 = 3(x - 1)(x - 3). At stationary points dy/dx = 0, so x = 1 or x = 3.',
    }),
    makeExamQuestion({
      id: 's1q14',
      sectionName: sectionI,
      marks: 3,
      command: 'Complete',
      outcome: 'Graph work and approximation: table of values',
      text: 'Complete the table for y = x^2 - 3x - 4 at x = -1, 0, 2 and 5.',
      modelAnswer: 'At x = -1, y = 0; x = 0, y = -4; x = 2, y = -6; x = 5, y = 6.',
    }),
    makeExamQuestion({
      id: 's1q15',
      sectionName: sectionI,
      marks: 4,
      command: 'Find',
      outcome: 'Trigonometry: area of a triangle',
      text: 'Two sides of a triangle are 8 cm and 11 cm and the included angle is 57°. Find the area of the triangle.',
      modelAnswer: 'Area = 1/2 ab sin C = 1/2 x 8 x 11 x sin57° = 36.9 cm².',
    }),
    makeExamQuestion({
      id: 's1q16',
      sectionName: sectionI,
      marks: 4,
      command: 'Determine',
      outcome: 'Linear programming: inequalities',
      text: 'A trader packs x small boxes and y large boxes. Small boxes are at least 4, large boxes are at most 9, and the total number of boxes is not more than 15. Write the three inequalities representing this information.',
      modelAnswer: 'x >= 4, y <= 9, x + y <= 15, with x >= 0 and y >= 0 if non-negativity is required.',
    }),
  ]

  const longQuestions = [
    makeExamQuestion({
      id: 's2q1',
      sectionName: sectionII,
      marks: 6,
      command: 'Calculate',
      outcome: 'Matrices: inverse matrix and applications',
      text: 'A school bought 3 revision books and 2 calculators for Ksh 4,700. Another school bought 5 similar revision books and 4 calculators for Ksh 8,300. Use matrix method to find the cost of one revision book and one calculator.',
      modelAnswer: 'Equations: 3b + 2c = 4700, 5b + 4c = 8300. Matrix inverse or elimination gives b = 650 and c = 1375.',
    }),
    makeExamQuestion({
      id: 's2q2',
      sectionName: sectionII,
      marks: 6,
      command: 'Determine',
      outcome: 'Transformations: combined transformations',
      text: 'Triangle A(1, 1), B(4, 1), C(2, 3) is transformed by a rotation of 90° anticlockwise about the origin followed by reflection in the x-axis. Determine the final image coordinates.',
      modelAnswer: 'Rotation maps (x,y) to (-y,x); reflection in x-axis maps (u,v) to (u,-v). Final mapping is (x,y) to (-y,-x). A\'(-1,-1), B\'(-1,-4), C\'(-3,-2).',
    }),
    makeExamQuestion({
      id: 's2q3',
      sectionName: sectionII,
      marks: 6,
      command: 'Draw',
      outcome: 'Cumulative frequency and quartiles',
      text: 'The scores of 40 candidates were grouped as follows: 0-9: 3, 10-19: 6, 20-29: 11, 30-39: 14, 40-49: 6. Prepare a cumulative frequency table and estimate the median class.',
      modelAnswer: 'Cumulative frequencies: 3, 9, 20, 34, 40. The 20th value lies at the boundary of 20-29 and 30-39; median is about 29.5 to 30 depending on interpolation.',
    }),
    makeExamQuestion({
      id: 's2q4',
      sectionName: sectionII,
      marks: 6,
      command: 'Find',
      outcome: 'Differentiation: nature of turning points',
      text: 'For the curve y = x^3 - 6x^2 + 9x + 1, find the stationary points and determine their nature.',
      modelAnswer: 'dy/dx = 3(x-1)(x-3), so x=1,3. y(1)=5, y(3)=1. d²y/dx² = 6x - 12. At x=1, negative so maximum (1,5). At x=3, positive so minimum (3,1).',
    }),
    makeExamQuestion({
      id: 's2q5',
      sectionName: sectionII,
      marks: 6,
      command: 'Calculate',
      outcome: 'Latitude and longitude: time and distance',
      text: 'Two places P(20°S, 35°E) and Q(20°S, 5°W) lie on the same latitude. Calculate their distance along the parallel and the time difference between them.',
      modelAnswer: 'Longitude difference = 40°. Distance = 40/360 x 2π x 6370 x cos20° ≈ 4178 km. Time difference = 40 x 4 minutes = 160 minutes = 2 h 40 min.',
    }),
    makeExamQuestion({
      id: 's2q6',
      sectionName: sectionII,
      marks: 6,
      command: 'Calculate',
      outcome: 'Three-dimensional geometry: length and angle',
      text: 'A rectangular box measures 8 cm by 6 cm by 10 cm. Calculate the length of its space diagonal and the angle the diagonal makes with the base.',
      modelAnswer: 'Base diagonal = sqrt(8² + 6²)=10 cm. Space diagonal = sqrt(10² + 10²)=14.14 cm. tanθ = height/base diagonal = 10/10, so θ = 45°.',
    }),
    makeExamQuestion({
      id: 's2q7',
      sectionName: sectionII,
      marks: 7,
      command: 'Sketch',
      outcome: 'Graph work and roots of equations',
      text: 'Using a suitable table of values for -2 <= x <= 4, sketch y = x^2 - 2x - 3 and use the graph to estimate the roots of x^2 - 2x - 3 = 0.',
      modelAnswer: 'The graph is an upward-opening parabola crossing the x-axis at x = -1 and x = 3. A correct table and smooth curve earn method marks.',
    }),
    makeExamQuestion({
      id: 's2q8',
      sectionName: sectionII,
      marks: 7,
      command: 'Solve',
      outcome: 'Trigonometry: 3D angle problem',
      text: 'A mast stands vertically on level ground. From a point 18 m from its foot, the angle of elevation of the top is 34°. From another point on the same straight line but 30 m from the foot, find the angle of elevation of the top of the mast.',
      modelAnswer: 'Height = 18 tan34° = 12.14 m. New angle θ satisfies tanθ = 12.14/30, so θ = 22.0°.',
    }),
  ]

  const sectionIILongQuestions = [
    makeExamQuestion({
      id: 's2q1',
      sectionName: sectionII,
      marks: 10,
      command: 'Calculate',
      outcome: 'Matrices: inverse matrix and applications',
      text: `A school bought 3 revision books and 2 calculators for Ksh 4,700. Another school bought 5 similar revision books and 4 calculators for Ksh 8,300.
(a) Write the information as a matrix equation. (2 marks)
(b) Find the inverse of the coefficient matrix. (4 marks)
(c) Hence find the cost of one revision book and one calculator. (4 marks)`,
      modelAnswer: 'Let b be book cost and c calculator cost. [[3,2],[5,4]][b,c]^T=[4700,8300]^T. Determinant = 2. Inverse = 1/2[[4,-2],[-5,3]]. [b,c]^T = [650,1375]^T.',
    }),
    makeExamQuestion({
      id: 's2q2',
      sectionName: sectionII,
      marks: 10,
      command: 'Find',
      outcome: 'Differentiation: stationary points and nature of turning points',
      text: `The curve C is given by y = x^3 - 6x^2 + 9x + 1.
(a) Find dy/dx. (2 marks)
(b) Find the coordinates of the stationary points. (4 marks)
(c) Determine the nature of each stationary point. (3 marks)
(d) State the interval on which the curve is decreasing. (1 mark)`,
      modelAnswer: 'dy/dx = 3x^2 - 12x + 9 = 3(x-1)(x-3). Stationary points: x=1,3. y(1)=5 and y(3)=1. d2y/dx2=6x-12; at x=1 maximum, at x=3 minimum. Decreasing for 1 < x < 3.',
    }),
    makeExamQuestion({
      id: 's2q3',
      sectionName: sectionII,
      marks: 10,
      command: 'Calculate',
      outcome: 'Latitude and longitude: distance, time and direction',
      text: `Two places P(20 degrees S, 35 degrees E) and Q(20 degrees S, 5 degrees W) lie on the same latitude. Take the radius of the earth as 6370 km and pi = 22/7.
(a) Calculate the difference in longitude between P and Q. (2 marks)
(b) Calculate the distance from P to Q along the parallel of latitude. (5 marks)
(c) Find the time difference between P and Q. (2 marks)
(d) State which place is ahead in time. (1 mark)`,
      modelAnswer: 'Difference in longitude = 40 degrees. Distance = 40/360 x 2pi x 6370 x cos20 degrees = about 4178 km. Time difference = 40 x 4 minutes = 160 minutes = 2 h 40 min. P is ahead because it is east of Q.',
    }),
    makeExamQuestion({
      id: 's2q4',
      sectionName: sectionII,
      marks: 10,
      command: 'Draw',
      outcome: 'Cumulative frequency, median and quartiles',
      text: `The scores of 40 candidates were grouped as follows: 0-9: 3, 10-19: 6, 20-29: 11, 30-39: 14, 40-49: 6.
(a) Prepare a cumulative frequency table using upper class boundaries. (3 marks)
(b) On graph paper, draw the cumulative frequency curve. (3 marks)
(c) Use your curve or interpolation to estimate the median. (2 marks)
(d) Estimate the interquartile range. (2 marks)`,
      modelAnswer: 'Cumulative frequencies at 9.5, 19.5, 29.5, 39.5 and 49.5 are 3, 9, 20, 34 and 40. Median is around 29.5. Q1 is near 20.5 and Q3 near 36.6, so IQR is about 16.1 marks depending on graph accuracy.',
    }),
    makeExamQuestion({
      id: 's2q5',
      sectionName: sectionII,
      marks: 10,
      command: 'Calculate',
      outcome: 'Three-dimensional geometry and trigonometry',
      text: `A rectangular box measures 8 cm by 6 cm by 10 cm.
(a) Calculate the length of the diagonal of the base. (2 marks)
(b) Calculate the length of the space diagonal. (3 marks)
(c) Calculate the angle the space diagonal makes with the base. (3 marks)
(d) A second similar box has a height of 15 cm. Find its scale factor compared with the first box. (2 marks)`,
      modelAnswer: 'Base diagonal = sqrt(8^2 + 6^2)=10 cm. Space diagonal = sqrt(10^2 + 10^2)=14.14 cm. tan theta = 10/10, theta=45 degrees. Scale factor by height = 15/10 = 1.5.',
    }),
  ]

  return {
    paperMeta: {
      curriculum: blueprint.curriculum,
      level: blueprint.level,
      subject: blueprint.subject,
      paper: blueprint.paper,
      durationMinutes: blueprint.durationMinutes,
      totalMarks: blueprint.totalMarks,
      blueprintId: blueprint.id,
    },
    sections: [
      { sectionName: sectionI, questions: shortQuestions },
      { sectionName: sectionII, questions: sectionIILongQuestions },
    ],
  }
}

function buildFallbackQuestionText(blueprint: ExamBlueprint, topic: string, marks: number, index: number) {
  if (blueprint.subject === 'English') {
    return index === 0
      ? `Write a ${blueprint.paper.includes('Paper 1') ? 'formal report' : 'response'} for a school audience on a realistic Kenyan situation. Ensure correct format, register, paragraphing and task achievement. (${marks} marks)`
      : `Identify and explain the language skill tested in the given school communication context. (${marks} marks)`
  }

  if (blueprint.curriculum !== 'KCSE') {
    return `A learner in Kenya meets a real-life problem involving ${topic}. Work out a clear solution and explain the reasoning so another learner can follow it. (${marks} marks)`
  }

  return `${blueprint.commandWords[index % blueprint.commandWords.length]} a KCSE-standard result involving ${topic}. Show all working clearly and give the final answer in the required form. (${marks} marks)`
}

function buildFallbackModelAnswer(blueprint: ExamBlueprint, topic: string) {
  if (blueprint.subject === 'English') {
    return 'A correct response uses the required format, clear paragraphing, appropriate register, accurate grammar and full task achievement.'
  }
  if (blueprint.curriculum !== 'KCSE') {
    return `A correct response applies the relevant ${topic} idea to the scenario, shows reasoning and communicates the conclusion clearly.`
  }
  return `A correct response shows the method for ${topic}, substitutes values accurately where needed, simplifies correctly and states the final result.`
}
