// Shared FAQ content for the homepage.
// This lives outside the 'use client' FAQSection module on purpose: a server
// component (src/app/page.tsx) imports it to build FAQPage JSON-LD, and
// importing a plain value from a client module gives the server bundle a
// client reference instead of the array.
export const HOMEPAGE_FAQS = [
  {
    q: 'How does the diagnostic assessment work?',
    a: 'Every student begins with a diagnostic that maps their current understanding across key topics. We identify specific gaps, weaknesses, and patterns — not just overall level. This becomes the foundation for their personalised learning plan.',
  },
  {
    q: 'What makes Peak different from regular tuition?',
    a: "Regular tuition repeats what school already does — same explanation, same pace, same worksheet. Peak starts by finding what's actually causing the lost marks, then builds a targeted route to fix it. Every session has purpose.",
  },
  {
    q: 'How do parents track progress?',
    a: 'Parents receive regular progress updates through the Parent Portal. You see exactly what changed — marks improved, practice completed, areas addressed. No guesswork, no vague reassurances.',
  },
  {
    q: 'What curriculums do you support?',
    a: 'Peak supports both CBC (Grades 4–9) and 8-4-4 (Form 3–4) curriculums, plus senior programme (Grade 10). Each curriculum has its own adapted diagnostic and learning system.',
  },
  {
    q: 'How are classes structured?',
    a: 'Classes are small and focused. Students are grouped by learning need, not just age or grade. Each session follows the Peak cycle: diagnose, practice, feedback, measure.',
  },
]
