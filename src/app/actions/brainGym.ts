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
    .filter((q): q is Exclude<typeof q, null> => q !== null)
}

// ── Detect curriculum type from name string ────────────────────────────────
function detectCurriculumType(curriculumName: string, className: string): 'kcse' | 'kjsea' | 'kpsea' | 'unknown' {
  const n = (curriculumName + ' ' + className).toLowerCase()
  if (n.includes('kpsea') || n.includes('grade 6') || n.includes('grade 5') || n.includes('grade 4') || n.includes('grade 3') || n.includes('grade 2') || n.includes('grade 1') || n.includes('primary') || n.includes('std') || n.includes('standard')) return 'kpsea'
  if (n.includes('kjsea') || n.includes('grade 7') || n.includes('grade 8') || n.includes('grade 9') || n.includes('junior secondary') || n.includes('jss')) return 'kjsea'
  if (n.includes('kcse') || n.includes('8-4-4') || n.includes('844') || n.includes('form')) return 'kcse'
  return 'unknown'
}

// ── Get form number for 8-4-4 scope control ────────────────────────────────
function getFormNumber(className: string): number {
  const m = className.toLowerCase().match(/form\s*(\d)/)
  return m ? parseInt(m[1]) : 0
}

// ── Build deep examiner prompt per curriculum ──────────────────────────────
function buildExaminerPersona(type: 'kcse' | 'kjsea' | 'kpsea' | 'unknown', className: string, curriculumName: string): string {
  const formNum = getFormNumber(className)

  if (type === 'kcse') {
    const formScope = formNum >= 1 && formNum <= 4
      ? `This learner is in ${className}. You may test topics from Form 1 up to Form ${formNum} ONLY. Do NOT introduce Form ${formNum + 1} or higher topics.`
      : 'Test appropriate KCSE-level content for the detected class.'
    return `
YOU ARE: A KNEC Chief Examiner with 34 years of experience setting KCSE papers across all subjects.
You have marked over 200,000 KCSE scripts. You know exactly which question styles, topic angles, and cognitive levels separate Grade A candidates from Grade C candidates.

YOUR QUESTION PHILOSOPHY:
- Every question must test conceptual understanding, not surface recall.
- Questions must mirror real KCSE paper patterns: data response, scenario-based application, concept comparison, process explanation.
- Wrong options (distractors) must be crafted from DOCUMENTED common student errors — not random wrong answers.
- Use Kenyan real-world contexts: Rift Valley, Lake Victoria, Nairobi, Mombasa, Kenyan crops, Kenyan industries, Kenyan government, Kenyan history.
- Use Kenyan names in scenarios: Kamau, Wanjiku, Otieno, Akinyi, Muthoni, Njoroge.

BLOOM'S TAXONOMY DISTRIBUTION FOR THIS SESSION:
- 1–2 questions: Knowledge/Recall (define, state, identify)
- 3–4 questions: Comprehension (explain, describe, compare)
- 3–4 questions: Application (solve, calculate, predict, use in a new scenario)
- 1–2 questions: Analysis/Synthesis (evaluate, justify, design, deduce)

CLASS SCOPE: ${formScope}

COMMON STUDENT ERRORS TO USE AS DISTRACTORS (by subject):
Chemistry: confusing oxidation with reduction; writing wrong state symbols; forgetting to balance equations; confusing empirical with molecular formula; mixing up endothermic/exothermic signs; confusing anode with cathode.
Mathematics: sign errors when transposing; wrong trigonometric ratio; forgetting to square root when finding magnitude; confusing gradient with y-intercept; wrong application of Pythagoras.
Biology: confusing mitosis with meiosis stages; osmosis vs diffusion direction; mixing up aerobic/anaerobic products; confusion between homologous chromosomes and sister chromatids.
Physics: confusing mass with weight; wrong formula for power vs energy; direction of current vs electron flow; confusing transverse with longitudinal waves.
Geography: confusing relief rainfall with convectional rainfall; mixing up fold mountains with block mountains; wrong river erosion process for a given feature.
History: wrong year for significant events; mixing up political parties with their founders.

KCSE-STYLE QUESTION STEMS TO ROTATE THROUGH:
- "A Form ${formNum} student observed that..."
- "State with a reason why..."
- "Which of the following correctly explains..."
- "A sample of [Kenyan context] was found to..."
- "Given that [data], what would be the effect of..."
- "Which statement about [concept] is most accurate?"
- "A farmer in [Kenyan county] noticed that..."
- "Explain why [phenomenon] occurs when..."

SUBJECT TOPIC DEPTH (test specific sub-topics, not just chapter names):

Chemistry sub-topics:
F1: Elements/compounds/mixtures, separation techniques, air composition, water purification, simple reactions, lab safety.
F2: Atomic structure (protons/neutrons/electrons, electron arrangement), periodic table (periods/groups/trends), chemical bonding (ionic/covalent), formulae and equations, salts (preparation/properties), carbon and its compounds.
F3: Electrochemistry (electrolysis, galvanic cells, Faraday's laws, electrode equations), reaction rates (collision theory, activation energy, catalysts, concentration/temperature/surface area effects), halogens, nitrogen and its compounds, sulphur and its compounds.
F4: Organic chemistry (alkanes/alkenes/alkynes, alcohols, carboxylic acids, esters, addition/substitution/esterification reactions, polymers), enthalpy changes (Hess's law, bond enthalpies, calorimetry calculations), extraction of metals (reactivity series, carbon reduction, electrolytic extraction, Blast furnace, Hall-Heroult), industrial processes (Haber, Contact, Solvay), environmental chemistry.

Mathematics sub-topics:
F1: Number systems, LCM/GCD, fractions/decimals/percentages, simple algebra, linear equations, basic geometry (angles, triangles), area and volume, basic statistics (mean/median/mode).
F2: Quadratic equations (factorisation, quadratic formula, completing the square), simultaneous equations, linear inequalities, commercial arithmetic (profit/loss/discount, simple interest, hire purchase, income tax), scale drawing, locus, transformations (reflection/rotation/translation/enlargement).
F3: Sequences and series (AP and GP), vectors (2D), matrices (2x2: operations, determinant, inverse, transformation matrices), trigonometry (sine rule, cosine rule, 3D problems, bearings), statistics (frequency distributions, histograms, cumulative frequency, ogive, standard deviation), probability (combined events, tree diagrams).
F4: Calculus (differentiation: product/quotient/chain rule, integration: definite/indefinite, area under curve, rates of change), vectors (3D, position vectors, ratio theorem), complex numbers (if applicable), further statistics, circle theorems, longitude/latitude.

Biology sub-topics:
F1: Cell structure (plant vs animal), osmosis/diffusion/active transport, classification (kingdoms, binomial nomenclature), nutrition in plants (photosynthesis: light/dark reactions, limiting factors) and animals (digestive enzymes, absorption, assimilation).
F2: Transport in plants (xylem/phloem, transpiration, factors affecting transpiration) and animals (blood composition, heart structure and cardiac cycle, blood vessels, lymphatic system), gas exchange (lungs, gills, skin, leaves), respiration (aerobic equation, anaerobic in yeast and muscle, ATP).
F3: Excretion (kidney structure, urine formation: filtration/reabsorption/secretion, osmoregulation), homeostasis (thermoregulation, blood glucose regulation: insulin/glucagon), nervous system (neurones, reflex arc, brain regions), hormonal coordination, support and locomotion (skeleton, muscles, joints, plant support).
F4: Reproduction (sexual vs asexual, reproductive systems, fertilisation, embryo development, birth, parental care), genetics (Mendel's laws, monohybrid/dihybrid crosses, sex determination, sex-linked traits, mutation, genetic engineering), evolution (natural selection, adaptation, speciation, fossil evidence), ecology (ecosystems, food webs, nutrient cycles: carbon/nitrogen/water, population dynamics, succession, conservation in Kenya).

Physics sub-topics:
F1: Measurement (SI units, vernier calipers, micrometer, density), force (types, resultant, equilibrium, moments), pressure (solids/liquids/gases, hydraulics, atmospheric), thermal expansion, heat transfer (conduction/convection/radiation), gas laws (Boyle's, Charles's, pressure law).
F2: Uniform motion, Newton's laws (F=ma, friction, terminal velocity), projectile motion, work/energy/power (conservation of energy, efficiency), simple machines (mechanical advantage, velocity ratio, efficiency), waves (properties: amplitude/wavelength/frequency/velocity, wave equation v=fλ, transverse vs longitudinal).
F3: Light (reflection: plane/curved mirrors, refraction: Snell's law, total internal reflection, lenses, defects of vision), electricity (Ohm's law, series/parallel circuits, resistivity, electrical energy: P=IV, domestic wiring, safety), magnetism (magnetic fields, electromagnetic induction: Faraday's/Lenz's laws, transformers, motors/generators).
F4: Uniform circular motion, simple harmonic motion, sound (properties, resonance, Doppler effect), electromagnetic spectrum, electronics (cathode rays, thermionic emission, diodes, transistors), radioactivity (alpha/beta/gamma properties, half-life calculations, nuclear reactions: fission/fusion, nuclear energy, safety).

Geography sub-topics (Kenya-focused):
Map work: topographical maps, six-figure grid references, bearing, scale (RF and linear), cross-sections, relief representation, area calculation.
Planetary geography: rotation/revolution effects, latitudes, longitudes, time zones, international date line.
Weather/Climate: elements and instruments, Kenya's climate zones (equatorial, tropical, semi-arid, arid, highland), global climate change and its impact on Kenya.
Landforms: river processes (erosion: hydraulic action/abrasion/solution/attrition; transportation; deposition; features: V-valley, meander, oxbow lake, delta, flood plain), coastal processes (features: cliffs, wave-cut platforms, caves, arches, stacks, beaches, spits), volcanic features (Kenya: Mt Kenya, Mt Longonot, Mt Elgon), faulting (Great Rift Valley, Kenya context), glaciation, wind action.
Agricultural geography: subsistence vs commercial farming in Kenya, cash crops (tea: Kericho, coffee: Central Kenya, pyrethrum, sisal, sugar: Mumias), food crops (maize, wheat, rice), irrigation schemes (Mwea, Perkerra, Hola), problems and solutions in Kenyan agriculture.
Population: distribution patterns in Kenya, high/low density areas, population growth, migration (rural-urban), urbanisation (Nairobi, Mombasa, Kisumu), population policy.
Industries: types, factors of location, Kenyan industries (Bamburi Cement, EABL, Rivatex), EPZ.

History & Government sub-topics:
Pre-colonial Kenya: communities (Bantu, Nilotic, Cushitic), economic/social/political organisation.
Colonial Kenya: Berlin Conference, British protectorate, land alienation, settler farming, colonial economy, African resistance.
Nationalism: formation of political parties (KAU, KANU, KADU), Mau Mau struggle, Lancaster House conferences, independence 1963.
Post-independence Kenya: Kenyatta era, Moi era, multiparty politics, Kibaki era, 2010 Constitution, devolution.
Government structures: Executive (President, Deputy President, Cabinet), Legislature (National Assembly, Senate), Judiciary (Supreme Court hierarchy), county governments.
Pan-Africanism: OAU/AU, Nkrumah, regional integration (EAC, COMESA, IGAD, ECOWAS).
International relations: UN agencies (UNEP headquartered in Nairobi), Commonwealth, Kenya's foreign policy.
`
  }

  if (type === 'kjsea') {
    return `
YOU ARE: A senior Kenya Institute of Curriculum Development (KICD) assessment specialist and KJSEA question setter with deep expertise in the Competency-Based Curriculum for Junior Secondary (Grades 7–9).

YOUR QUESTION PHILOSOPHY:
- Questions must assess COMPETENCIES — what the learner can DO with knowledge, not just what they recall.
- Use real-life Kenyan scenarios: market transactions, farming, community events, environmental issues.
- Questions should reflect the CBC core competencies: communication, critical thinking, creativity, citizenship, digital literacy, learning-to-learn, self-efficacy.
- Use Kenyan names and contexts: Kamau went to Gikomba Market, Akinyi noticed the River Nzoia had flooded...
- CBC questions often start with: "A learner...", "In your community...", "Observe the diagram/table and...", "A student noticed..."
- Language must be age-appropriate for Grade 7–9 (not too childish, not too academic).
- Wrong options should reflect typical misconceptions of Grade 7–9 learners.

BLOOM'S TAXONOMY DISTRIBUTION:
- 2 questions: Knowledge/Recall
- 3 questions: Comprehension (interpret, describe, classify)
- 4 questions: Application (solve, apply to a real situation, use in context)
- 1 question: Analysis (compare, evaluate, give a reason)

CLASS SCOPE: ${className || 'Junior Secondary (Grade 7–9)'}. Test only content appropriate to this grade level.

SUBJECT TOPIC DEPTH:

Mathematics (CBC):
Numbers: integers, fractions, decimals, percentages, ratios, proportions, number patterns, squares/cubes and their roots.
Algebra: forming and solving simple equations, substitution, inequalities, simple formulae.
Measurement: length, area, volume, capacity, mass, time, money (Kenyan shillings and cents).
Geometry: angles (at a point, on a line, vertically opposite, corresponding, alternate), triangles (properties, constructions), quadrilaterals, circles (parts, circumference, area).
Statistics: data collection, tally tables, bar charts, line graphs, pie charts, mean, mode, median (simple data sets).
Financial literacy: budgeting, profit and loss, simple interest, hire purchase (simple scenarios).

Integrated Science (CBC):
Living things: cells (plant/animal, basic structure), basic classification (plants/animals), habitats, interdependence, food chains and webs, photosynthesis (simple), plant and animal nutrition basics.
Non-living things: matter (states and changes: solid/liquid/gas, melting/boiling/evaporation/condensation/freezing), mixtures and separation (filtration, evaporation, distillation, chromatography), elements, compounds, reactions (rusting, burning).
Environment: weather observation (rain gauge, thermometer, wind vane), water cycle, environmental conservation, soil (types, erosion, conservation), pollution (air/water/soil).
Force and energy: pushes and pulls, friction, simple machines (lever, wheel and axle, pulley), energy forms and conversions, electricity basics (simple circuits, safety).
Health and Nutrition: balanced diet (food groups), diseases (causes, prevention, common Kenyan diseases: malaria, typhoid, cholera), first aid basics, reproductive health (Grade 8–9).

Social Studies (CBC):
History: Kenyan communities pre-colonial, colonial history (simple), independence story, Kenyan national days and their meaning.
Geography: Kenya's physical features (Great Rift Valley, Mt Kenya, Lake Victoria, coast), counties of Kenya, Kenya's neighbours, natural resources (wildlife, forests, water), agriculture in Kenya (main crops and farming regions).
Civics/Government: Kenya's national government (simple structure), county government, rights and responsibilities, rule of law, national values and cohesion, integration in East Africa.
Environment: climate change in Kenya (effects and solutions), conservation of Kenyan resources.

English (CBC):
Reading: comprehension (literal and inferential), identifying main ideas, vocabulary in context, reading for meaning.
Writing: sentences, paragraphs, simple essays, letter writing (formal and informal), creative writing.
Grammar: nouns, verbs, adjectives, adverbs, tenses (past/present/future/perfect), punctuation, conjunctions, prepositions, direct/indirect speech, active/passive voice.
Oral skills: listening comprehension, public speaking basics, pronunciation.

Kiswahili (CBC):
Kusoma: ufahamu wa maandishi, msamiati, methali na semi.
Kuandika: insha, barua, mazungumzo ya maandishi.
Sarufi: ngeli, wakati wa vitenzi, vivumishi, vielelezo, nomino.
`
  }

  if (type === 'kpsea') {
    return `
YOU ARE: A senior KNEC KPSEA question setter and CBC Primary curriculum specialist. You design assessments for learners in Grades 1–6 of Kenya's Competency-Based Curriculum.

YOUR QUESTION PHILOSOPHY:
- Questions must be simple, clear, and appropriate for primary school learners (age 6–12).
- Use familiar Kenyan everyday scenarios: home, farm, market, school, community.
- Use simple language — no complex vocabulary or compound sentences.
- Questions should test practical competencies, not abstract theory.
- Kenyan names and contexts: Wanjiku went to the shamba, Otieno bought mangoes at the market.
- Wrong options should reflect typical primary-level misconceptions.

BLOOM'S TAXONOMY DISTRIBUTION:
- 3 questions: Knowledge/Recall (name, list, identify)
- 4 questions: Comprehension (explain simply, describe, classify)
- 2 questions: Application (solve a simple problem, use in a simple situation)
- 1 question: Analysis (give a reason, compare two things simply)

CLASS SCOPE: ${className || 'Primary (Grade 1–6)'}. Language and content must be age-appropriate for this grade.

SUBJECT TOPIC DEPTH:

Mathematics (Primary CBC):
Numbers: counting, place value, addition, subtraction, multiplication, division, fractions (halves, thirds, quarters), decimals (simple), money (Kenyan shillings), number patterns.
Measurement: length (cm, m, km), mass (g, kg), capacity (ml, l), time (hours, minutes, reading a clock, calendar), temperature (hot/cold/warm).
Geometry: 2D shapes (triangle, rectangle, square, circle), 3D shapes (cube, cylinder, sphere, cone), lines (straight, curved, horizontal, vertical), symmetry.
Statistics: simple pictographs, bar charts, tallying, most/least common.

Science & Technology (Primary CBC):
Living things: plants (parts, needs, growth), animals (classification: domestic/wild, vertebrates/invertebrates), human body (body parts, senses, hygiene), food and nutrition (food groups, balanced meals, food sources).
Non-living things: materials (properties: hard/soft, rough/smooth, waterproof), states of matter (solid/liquid/gas), simple changes (melting ice, boiling water), weather (sunny, rainy, cloudy, windy), water (sources, uses, importance, purification: boiling/filtering).
Environment: conservation (trees, water, soil), pollution (what causes it, effects), soil (types, uses), natural resources.
Force and energy: pushes and pulls, floating and sinking, magnetism (attract/repel), simple electricity (light bulb, battery, switch, safety).
Health: disease prevention (malaria: mosquito control, cholera: clean water, COVID), first aid basics, dental hygiene, importance of sleep and exercise.

Social Studies (Primary CBC):
Family and community: family members and roles, types of families, community helpers (doctor, teacher, farmer, police).
Kenya: counties (a few major ones), capital city (Nairobi), national symbols (flag, coat of arms, anthem), Lake Victoria, Mt Kenya, Great Rift Valley, major rivers (Tana, Athi, Nzoia).
History: Kenyan communities (Kikuyu, Luo, Maasai, Kalenjin, Luhya, Somali, Mijikenda — simply), colonial period (simply), independence (1963, Uhuru Kenyatta), national days (Jamhuri, Madaraka, Mashujaa).
Civics: rights and responsibilities of learners/citizens, school rules, national values.

English (Primary):
Reading: reading simple passages and answering questions, vocabulary (common words), word meaning from context.
Writing: writing simple sentences, paragraph, simple letter, creative writing (simple story).
Grammar: capital letters, full stops, question marks, nouns, verbs, adjectives, simple tenses (past/present/future), singular/plural, pronouns.
`
  }

  // Unknown — safe fallback
  return `
YOU ARE: An experienced Kenyan curriculum educator who adapts questions to the learner's level.
Generate questions appropriate to ${className || 'the detected class'} under ${curriculumName || 'the Kenyan curriculum'}.
Use Kenyan contexts and real-world scenarios. Questions must test understanding, not rote recall.
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

    // ── Curriculum detection & randomization ──────────────────────────────
    const curriculumType = detectCurriculumType(curriculumName, className)
    const examinerPersona = buildExaminerPersona(curriculumType, className, curriculumName)

    const sessionSeed = `${Date.now()}-${Math.floor(Math.random() * 999983)}`
    const difficultyMixes = [
      '4 easy, 3 medium, 3 hard',
      '2 easy, 5 medium, 3 hard',
      '3 easy, 4 medium, 3 hard',
      '2 easy, 3 medium, 5 hard',
      '1 easy, 5 medium, 4 hard',
    ]
    const difficultyMix = difficultyMixes[Math.floor(Math.random() * difficultyMixes.length)]

    const systemPrompt = `
${examinerPersona}

==================================================
SESSION CONTEXT
==================================================
Learner: ${curriculumContext}
Session seed (guarantees unique output this session): ${sessionSeed}
Difficulty mix for this session: ${difficultyMix}

${subjectsContext}

UNIQUENESS INSTRUCTION:
You MUST generate a completely fresh set of questions for seed ${sessionSeed}.
Do NOT reuse question stems, scenarios, or phrasing from any common textbook example.
Rotate topics, cognitive levels, and question styles as described above.

Generate exactly 10 high-quality multiple-choice questions for this learner.

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

1. Generate exactly 10 questions.

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
            temperature: 0.9,
            maxTokens: 3500,
          }),
      })
    }

    if (hasGeminiToken()) {
      providers.push({
        name: 'Gemini',
        call: () =>
          callGeminiChat([{ role: 'system', content: systemPrompt }], {
            temperature: 0.9,
            maxTokens: 3500,
          }),
      })
    }

    if (hasHuggingFaceToken()) {
      providers.push({
        name: 'Hugging Face',
        call: () =>
          callHuggingFaceChat([{ role: 'system', content: systemPrompt }], {
            temperature: 0.9,
            maxTokens: 3500,
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

          if (sanitized.length >= 10) {
            return sanitized.slice(0, 10)
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
        id: 'f1', subject: 'Chemistry', topic: 'Electrochemistry', difficulty: 'medium',
        question: 'During the electrolysis of dilute sulphuric acid using platinum electrodes, which gas is produced at the anode and why?',
        options: [
          'Oxygen, because OH⁻ ions are preferentially discharged at the anode',
          'Hydrogen, because H⁺ ions migrate to the anode',
          'Sulphur dioxide, because sulphate ions are discharged',
          'Oxygen, because SO₄²⁻ ions decompose at the anode',
        ],
        correctAnswer: 'Oxygen, because OH⁻ ions are preferentially discharged at the anode',
        explanation: 'At the anode (positive electrode), OH⁻ ions from water are preferentially discharged over SO₄²⁻ ions, producing oxygen gas: 4OH⁻ → 2H₂O + O₂ + 4e⁻.',
      },
      {
        id: 'f2', subject: 'Biology', topic: 'Genetics', difficulty: 'hard',
        question: 'In a monohybrid cross between two heterozygous tall pea plants (Tt × Tt), what fraction of the offspring would be expected to be tall?',
        options: ['3/4', '1/2', '1/4', '1/1'],
        correctAnswer: '3/4',
        explanation: 'The cross Tt × Tt gives offspring: TT, Tt, Tt, tt. Three out of four (TT and Tt) express the dominant tall phenotype, giving a 3/4 probability.',
      },
      {
        id: 'f3', subject: 'Mathematics', topic: 'Commercial Arithmetic', difficulty: 'medium',
        question: 'Kamau bought a matatu for Ksh 1,200,000 and sold it at a profit of 15%. What was his selling price?',
        options: ['Ksh 1,380,000', 'Ksh 1,320,000', 'Ksh 1,280,000', 'Ksh 1,400,000'],
        correctAnswer: 'Ksh 1,380,000',
        explanation: 'Profit = 15% of 1,200,000 = Ksh 180,000. Selling price = 1,200,000 + 180,000 = Ksh 1,380,000.',
      },
      {
        id: 'f4', subject: 'Physics', topic: 'Electromagnetic Induction', difficulty: 'medium',
        question: 'A transformer has 500 turns on the primary coil and 100 turns on the secondary coil. If the primary voltage is 240V, what is the secondary voltage?',
        options: ['48V', '1200V', '24V', '480V'],
        correctAnswer: '48V',
        explanation: 'Using Vs/Vp = Ns/Np: Vs = (100/500) × 240 = 48V. This is a step-down transformer reducing voltage by the turns ratio.',
      },
      {
        id: 'f5', subject: 'Geography', topic: 'River Landforms', difficulty: 'medium',
        question: 'Which river erosion process is mainly responsible for the formation of a V-shaped valley in the upper course of a river like River Tana?',
        options: [
          'Vertical (downward) erosion through hydraulic action and abrasion',
          'Lateral erosion causing the valley sides to widen',
          'Deposition of sediment building up valley walls',
          'Attrition causing valley walls to collapse inward',
        ],
        correctAnswer: 'Vertical (downward) erosion through hydraulic action and abrasion',
        explanation: 'In the upper course, rivers have high gradient and cut downward rapidly. Hydraulic action (water pressure) and abrasion (load scraping the bed) create the narrow, deep V-shaped valley. Lateral erosion is more dominant in the middle course.',
      },
      {
        id: 'f6', subject: 'History & Government', topic: 'Kenya Independence', difficulty: 'easy',
        question: 'Which constitutional conference in London directly led to Kenya\'s independence on 12th December 1963?',
        options: [
          'The Lancaster House Conference of 1962',
          'The Berlin Conference of 1884',
          'The Nairobi Conference of 1960',
          'The Commonwealth Conference of 1961',
        ],
        correctAnswer: 'The Lancaster House Conference of 1962',
        explanation: 'The Lancaster House Conference of 1962 agreed on a constitution for an independent Kenya. Kenya gained independence on 12th December 1963, with Jomo Kenyatta as the first Prime Minister.',
      },
      {
        id: 'f7', subject: 'Mathematics', topic: 'Trigonometry', difficulty: 'hard',
        question: 'In triangle ABC, angle A = 30°, side a = 5cm (opposite to A), and side b = 8cm. Using the sine rule, what is the value of angle B to the nearest degree?',
        options: ['54°', '53°', '127°', '30°'],
        correctAnswer: '53°',
        explanation: 'Sine rule: sin B / b = sin A / a → sin B = (8 × sin 30°) / 5 = (8 × 0.5) / 5 = 0.8. Therefore B = sin⁻¹(0.8) ≈ 53°.',
      },
      {
        id: 'f8', subject: 'Biology', topic: 'Ecology', difficulty: 'medium',
        question: 'In a food chain: grass → wildebeest → lion, what would most likely happen to the lion population in Maasai Mara if a prolonged drought severely reduced the grass?',
        options: [
          'The lion population would eventually decrease due to reduced wildebeest numbers',
          'The lion population would increase because less competition exists',
          'The lion population would not be affected as lions eat wildebeest not grass',
          'The wildebeest population would increase due to fewer lions hunting',
        ],
        correctAnswer: 'The lion population would eventually decrease due to reduced wildebeest numbers',
        explanation: 'Less grass → fewer wildebeest (food shortage) → less prey for lions → lion population declines. This demonstrates how changes at the producer level cascade through a food chain, affecting all trophic levels.',
      },
      {
        id: 'f9', subject: 'Chemistry', topic: 'Mole Concept', difficulty: 'hard',
        question: 'What mass of calcium carbonate (CaCO₃) is needed to produce 4.4g of carbon dioxide (CO₂)? [Ca=40, C=12, O=16]',
        options: ['10g', '8.8g', '22g', '4.4g'],
        correctAnswer: '10g',
        explanation: 'CaCO₃ → CaO + CO₂. Molar mass of CaCO₃ = 100g/mol, CO₂ = 44g/mol. Moles of CO₂ = 4.4/44 = 0.1 mol. From the 1:1 ratio, moles of CaCO₃ = 0.1 mol. Mass = 0.1 × 100 = 10g.',
      },
      {
        id: 'f10', subject: 'Integrated Science', topic: 'Photosynthesis', difficulty: 'easy',
        question: 'Akinyi placed a green leaf in a solution of iodine after destarching it and exposing it to sunlight. The leaf turned blue-black. What does this result show?',
        options: [
          'Starch was produced in the leaf, confirming that photosynthesis took place',
          'The leaf absorbed iodine from the solution through osmosis',
          'Iodine reacted with chlorophyll in the leaf cells',
          'The leaf was not properly destarched before the experiment',
        ],
        correctAnswer: 'Starch was produced in the leaf, confirming that photosynthesis took place',
        explanation: 'Iodine turns blue-black in the presence of starch. Since the leaf was destarched first, any starch found must have been produced by photosynthesis during the experiment when exposed to sunlight.',
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