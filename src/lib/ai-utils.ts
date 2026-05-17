export function isAcademicRequest(input: string) {
  const text = input.toLowerCase().trim()
  if (!text) return false
  if (/^(hi|hello|hey|thanks|thank you)\b/.test(text)) return false
  return true
}

export function shouldGenerateLessonImage(input: string) {
  const text = input.toLowerCase()
  if (!isAcademicRequest(text)) return false
  if (/\b(quiz|test|exam simulation|mark|grade|study plan|planner|timetable|thanks|thank you)\b/.test(text)) {
    return false
  }
  return /\b(teach|learn|lesson|explain|visual|diagram|draw|show|understand|revise|revision|chem|biology|physics|math|science|integrated science|what|how|why|define|describe)\b/.test(text)
}

export function buildLessonImagePrompt(input: string, curriculumContext: string, specificConcept: string) {
  const cleanContext = curriculumContext
    .replace(/\s+/g, ' ')
    .replace(/STUDENT ACADEMIC CONTEXT:/i, '')
    .trim()
    .slice(0, 400)

  const cleanConcept = specificConcept
    .replace(/\[VISUAL:\s*/i, '')
    .replace(/\]\s*$/, '')
    .trim()
    .slice(0, 600)

  return [
    'Professional, high-fidelity educational textbook illustration.',
    'STRICTLY NO GIBBERISH OR HALUCINATED TEXT. If labels are needed, use only very simple, clear English or NO TEXT at all.',
    'Clean 2D vector style, high contrast, minimalist design, classroom-friendly, white or clean background.',
    'Focus on accurate scientific shapes, molecular structures, lab apparatus, or geometric models.',
    'Avoid clutter, avoid blurred elements, avoid watermarks, avoid low-resolution textures.',
    `Student curriculum context: ${cleanContext || 'Kenyan school curriculum'}.`,
    `Subject: ${input.slice(0, 200)}.`,
    `Visual Focus: ${cleanConcept || input.slice(0, 400)}.`,
    'Style: Premium educational infographic, highly legible, scientifically focused.',
  ].join(' ')
}
