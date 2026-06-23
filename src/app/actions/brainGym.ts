'use server'

import { createClient } from '@/lib/supabase/server'
import { callGroqChat, hasGroqToken } from '@/lib/groq-chat'
import { callGeminiChat, hasGeminiToken } from '@/lib/gemini-chat'
import { callHuggingFaceChat, hasHuggingFaceToken } from '@/lib/huggingface-chat'

function cleanJsonResponse(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  return match ? match[0] : text
}

function sanitizeQuestions(questions: any[]) {
  return questions
    .map((q: any, index: number) => {
      if (!q || typeof q !== 'object') return null

      const question = String(q.question || '').trim()
      let options = Array.isArray(q.options)
        ? q.options.map((o: any) => String(o).trim()).filter(Boolean)
        : []

      let correctAnswer = String(q.correctAnswer || '').trim()
      const explanation = String(q.explanation || '').trim()

      if (!question || !correctAnswer || !explanation) return null

      options = Array.from(new Set(options))
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
      if (question.length < 20) return null
      if (explanation.length < 30) return null

      return {
        id: q.id || `q${index + 1}`,
        subject: q.subject || '',
        topic: q.topic || '',
        difficulty: q.difficulty || 'medium',
        question,
        options,
        correctAnswer,
        explanation,
      }
    })
    .filter(Boolean)
}

function buildClassScopeRules(className: string, curriculumName: string) {
  return `
==================================================
CLASS / CURRICULUM SCOPE RULES
==================================================

The questions must strictly depend on the learner's curriculum and class.

Detected curriculum:
${curriculumName || 'Unknown Kenyan curriculum'}

Detected class:
${className || 'Unknown class'}

--------------------------------------------------
CBC RULES
--------------------------------------------------

If the learner is in CBC:

- Generate questions only from the learner's CBC grade level.
- Use age-appropriate CBC wording.
- Do not generate KCSE/Form 4 questions.
- Do not use advanced 8-4-4 senior school content unless the learner is in senior school.
- Questions should be practical, competency-based, and understandable.

CBC examples:

Grade 7:
Use Junior Secondary level questions.

Grade 8:
Use Grade 8 level and earlier CBC concepts.

Grade 9:
Use Grade 9 level and earlier Junior Secondary concepts.

--------------------------------------------------
8-4-4 RULES
--------------------------------------------------

If the learner is in 8-4-4:

Form 1:
- Test Form 1 topics only.
- Do not test Form 2, Form 3, or Form 4 topics.

Form 2:
- Test Form 1 and Form 2 topics.
- Do not test Form 3 or Form 4 topics.

Form 3:
- Test everything from Form 1 to Form 3.
- Do not test Form 4-only topics.

Form 4:
- Test everything from Form 1 to Form 4.
- Treat questions as KCSE revision standard.
- Any Form 1, Form 2, Form 3, or Form 4 topic is allowed.

--------------------------------------------------
FORM 4 EXAM MODE
--------------------------------------------------

For Form 4 learners:

- Questions should be KCSE-standard.
- Mix lower-form foundations with Form 4 topics.
- Prioritize conceptual questions that reveal weak areas.
- Avoid childish general knowledge.

Allowed Form 4 Chemistry examples:

- Structure and bonding
- Periodic table trends
- Mole concept
- Acids, bases and salts
- Organic chemistry
- Electrochemistry
- Enthalpy changes
- Reaction rates
- Extraction of metals
- Industrial processes
- Practical chemistry

Allowed Form 4 Mathematics examples:

- Algebra
- Trigonometry
- Vectors
- Matrices
- Calculus
- Probability
- Statistics
- Geometry
- Commercial arithmetic

--------------------------------------------------
FORM 3 EXAM MODE
--------------------------------------------------

For Form 3 learners:

- Test Form 1 to Form 3 content.
- Do not ask Form 4-only concepts.
- Questions should still be exam-standard.

--------------------------------------------------
UNKNOWN CLASS RULE
--------------------------------------------------

If class is unknown:

- Generate safe questions appropriate to the known curriculum.
- Avoid advanced Form 4 topics unless the class clearly says Form 4.
- Prefer foundational concepts.
`
}

export async function generateBrainGymQuestions(studentId?: string) {
  let curriculumName = 'Kenyan CBC / 8-4-4'
  let className = ''
  let curriculumContext = 'Kenyan CBC / 8-4-4'
  let subjectsContext = ''

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
          const { data: c } = await supabase
            .from('curriculums')
            .select('name')
            .eq('id', student.curriculum_id)
            .single()

          if (c?.name) curriculumName = c.name
        }

        if (student.class_id) {
          const { data: cls } = await supabase
            .from('classes')
            .select('name')
            .eq('id', student.class_id)
            .single()

          if (cls?.name) className = cls.name
        }

        curriculumContext = `${className || 'Unknown class'} under ${curriculumName}`

        const { data: subs } = await supabase
          .from('student_subjects')
          .select('subject:subjects(name)')
          .eq('student_id', studentId)

        if (subs && subs.length > 0) {
          const names = subs
            .map((s: any) => s.subject?.name)
            .filter(Boolean)

          if (names.length > 0) {
            subjectsContext = `
The student is enrolled in these subjects:
${names.join(', ')}

Generate questions ONLY from these registered subjects.
Do not generate random general knowledge unless General Knowledge is one of the registered subjects.
`
          }
        }
      }
    }

    if (!subjectsContext) {
      subjectsContext = `
No registered subjects were found.

Generate balanced Kenyan curriculum questions appropriate for:
${curriculumContext}

Use the class scope rules carefully.
`
    }

    const classScopeRules = buildClassScopeRules(className, curriculumName)

    const systemPrompt = `
You are an expert Kenyan teacher and examiner.

Learner context:
${curriculumContext}

${subjectsContext}

${classScopeRules}

Generate exactly 5 high-quality multiple-choice Brain Gym questions.

==================================================
CRITICAL OUTPUT RULES
==================================================

Return ONLY valid JSON.

Do not include markdown.
Do not include backticks.
Do not include comments.
Do not include conversational text.

Format:

{
  "questions": [
    {
      "id": "q1",
      "subject": "Chemistry",
      "topic": "Periodic Trends",
      "difficulty": "medium",
      "question": "Why does atomic radius decrease across Period 3 from sodium to chlorine?",
      "options": [
        "Nuclear charge increases while the number of electron shells remains the same",
        "The number of electron shells increases across the period",
        "The atoms gain more neutrons and become smaller",
        "The elements become less reactive down the period"
      ],
      "correctAnswer": "Nuclear charge increases while the number of electron shells remains the same",
      "explanation": "Across a period, protons increase but electrons are added to the same shell. The stronger nuclear attraction pulls electrons closer, reducing atomic radius."
    }
  ]
}

==================================================
QUESTION QUALITY RULES
==================================================

1. Generate exactly 5 questions.

2. Every question must match the learner's class level.

3. Every question must match the learner's curriculum.

4. Every question must come only from the registered subjects if subjects are available.

5. For Form 4, questions may come from Form 1 to Form 4.

6. For Form 3, questions may come from Form 1 to Form 3 only.

7. For Form 2, questions may come from Form 1 to Form 2 only.

8. For Form 1, questions must come from Form 1 only.

9. For CBC learners, questions must match CBC grade level and should not use KCSE-level wording.

10. Each question must test a real syllabus concept.

11. Questions should test understanding, not shallow memorization.

12. Avoid vague questions like:
- What is science?
- What is mathematics?
- Which one is correct?

13. Each question must have exactly 4 options.

14. Each option must be a full answer text.

15. Options must NOT be A, B, C, or D.

16. correctAnswer must EXACTLY match one of the option strings.

17. Do not write correctAnswer as A, B, C, or D.

18. Wrong options must be believable.

19. Avoid joke options.

20. Explanation must teach the concept clearly.

21. Include subject, topic, and difficulty for every question.

22. Difficulty must be:
easy, medium, or hard.

==================================================
SUBJECT GUIDANCE
==================================================

Chemistry topics may include only if appropriate to class level:

- Atomic structure
- Periodic table
- Chemical families
- Structure and bonding
- Acids, bases and salts
- Air and combustion
- Water and hydrogen
- Mole concept
- Organic chemistry
- Electrochemistry
- Enthalpy changes
- Reaction rates
- Extraction of metals
- Industrial processes
- Practical chemistry

Mathematics topics may include only if appropriate to class level:

- Numbers
- Algebra
- Geometry
- Trigonometry
- Vectors
- Matrices
- Probability
- Statistics
- Calculus
- Commercial arithmetic
- Transformations

Biology topics may include only if appropriate to class level:

- Cells
- Classification
- Nutrition
- Transport
- Respiration
- Reproduction
- Genetics
- Ecology

Physics topics may include only if appropriate to class level:

- Measurement
- Force
- Motion
- Energy
- Electricity
- Magnetism
- Waves
- Light
- Heat

Geography topics may include only if appropriate to class level:

- Map work
- Weather
- Climate
- Landforms
- Agriculture
- Population
- Fieldwork

==================================================
FINAL INSTRUCTION
==================================================

Return strict JSON only.
`

    const providers: {
      name: string
      call: () => Promise<{ content: string; provider: string; model: string }>
    }[] = []

    if (hasGroqToken()) {
      providers.push({
        name: 'Groq',
        call: () =>
          callGroqChat([{ role: 'system', content: systemPrompt }], {
            temperature: 0.5,
            maxTokens: 1500,
          }),
      })
    }

    if (hasGeminiToken()) {
      providers.push({
        name: 'Gemini',
        call: () =>
          callGeminiChat([{ role: 'system', content: systemPrompt }], {
            temperature: 0.5,
            maxTokens: 1500,
          }),
      })
    }

    if (hasHuggingFaceToken()) {
      providers.push({
        name: 'Hugging Face',
        call: () =>
          callHuggingFaceChat([{ role: 'system', content: systemPrompt }], {
            temperature: 0.5,
            maxTokens: 1500,
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

        if (Array.isArray(parsed.questions)) {
          const sanitized = sanitizeQuestions(parsed.questions)

          if (sanitized.length >= 5) {
            return sanitized.slice(0, 5)
          }

          if (sanitized.length > 0) {
            return sanitized
          }
        }
      } catch (error: any) {
        console.error(`[BrainGym] ${provider.name} failed:`, error.message)
      }
    }

    throw new Error('Failed to parse AI response or all providers failed')
  } catch (error) {
    console.error('generateBrainGymQuestions error:', error)

    return [
      {
        id: 's1',
        subject: 'Chemistry',
        topic: 'Structure and Bonding',
        difficulty: 'medium',
        question: 'Why does sodium chloride have a high melting point?',
        options: [
          'It has strong electrostatic forces between oppositely charged ions',
          'It contains weak intermolecular forces between molecules',
          'It has free electrons that move through the structure',
          'It contains covalent bonds between sodium and chlorine molecules',
        ],
        correctAnswer:
          'It has strong electrostatic forces between oppositely charged ions',
        explanation:
          'Sodium chloride has a giant ionic lattice. Strong electrostatic forces between Na⁺ and Cl⁻ ions require a lot of energy to overcome.',
      },
      {
        id: 's2',
        subject: 'Biology',
        topic: 'Transport in Animals',
        difficulty: 'easy',
        question: 'Which organ pumps blood around the human body?',
        options: ['Heart', 'Lungs', 'Liver', 'Kidney'],
        correctAnswer: 'Heart',
        explanation:
          'The heart is a muscular organ that contracts and relaxes to pump blood through blood vessels around the body.',
      },
      {
        id: 's3',
        subject: 'Geography',
        topic: 'Kenya Counties',
        difficulty: 'easy',
        question: 'How many counties are there in Kenya?',
        options: ['47', '42', '50', '35'],
        correctAnswer: '47',
        explanation:
          'Kenya has 47 counties under the devolved system of government created by the 2010 Constitution.',
      },
      {
        id: 's4',
        subject: 'Chemistry',
        topic: 'Photosynthesis',
        difficulty: 'easy',
        question:
          'Which gas do green plants absorb from the air during photosynthesis?',
        options: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'],
        correctAnswer: 'Carbon dioxide',
        explanation:
          'Green plants absorb carbon dioxide and use it together with water and light energy to make glucose during photosynthesis.',
      },
      {
        id: 's5',
        subject: 'Mathematics',
        topic: 'Algebra',
        difficulty: 'medium',
        question: 'What is the value of x in the equation 2x + 3 = 11?',
        options: ['4', '5', '7', '8'],
        correctAnswer: '4',
        explanation:
          'Subtract 3 from both sides to get 2x = 8. Divide both sides by 2, so x = 4.',
      },
    ]
  }
}

export async function submitBrainGymScore(studentId: string, score: number) {
  const supabase = await createClient()

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

    return { streak: 1, isNewHighest: true }
  }

  if (streakData.last_played_date === today) {
    return { streak: streakData.current_streak, isNewHighest: false }
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

  return {
    streak: newStreak,
    isNewHighest: newStreak > streakData.highest_streak,
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