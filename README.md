# Peak Campus (peak-Tuitioning)

Peak Performance Tutoring — Nairobi (Kinoo). Next.js tutoring + homeschooling platform
spanning tuition centers, homeschool programs, examinations, payments, messaging and marketing site.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + Framer Motion
- Supabase (Postgres, Auth, Storage, Realtime, RLS everywhere)
- 177 migrations in `supabase/migrations/` — source of truth for schema; apply with `supabase db push`
- Tests: `npm test` (vitest). Typecheck: `npx tsc --noEmit`. Dev: `next dev` (default `:3000`)

## Portals & module inventory

### Marketing site (`src/app/page.tsx` + `src/components/homepage/`)
Hero, Learning Route (how-it-works), programmes/fees discovery, evidence wall,
testimonials, **teachers carousel** (leadership tiers, infinite loop, DiceBear avatars),
gallery, events, campus, FAQ, blog highlights, footer. Brand JSON-LD for SEO.

### Admin (`src/app/admin/`)
Attendance, blog, centers, classes, curriculums, event registrations, **exam events**
(scope tuition/homeschool + control center `[id]` + script intake), financiers, **grading**
(`grading_systems` + `grading_scales`, subject→class→default→overall hierarchy),
homeschooling enrollments, knowledge, library, live analytics/lessons, national exams,
notifications, parents, performance, schemes, settings, student credentials, students,
subjects, support intelligence, teachers, terms, timetables, **transcripts** (generate,
brand, publish), tuition events, weekly payments.

### Teacher (`src/app/teacher/`)
**Exams center** (`exams/` — upcoming/marking/results lanes), **exam desk**
(paper studio builder, manage, per-submission marking), **exam marks** (direct entry
with live totals/percentages/grades, tuition + homeschool rosters), **marking**
(workbook/script queue + exam bridge into `exam_marks`), assignments, attendance, duels,
homeschooling, live, messages, quizzes, resources, schedule, schemes, students,
study monitor, transcripts, worksheets, practice questions, trivia.

### Student (`src/app/student/`)
Homepage (quests, sessions, **exam timetable widget**), **exam desk**
(timetabled entry, secure take room, marked-paper result view, recorded physical results),
assignments, AI exams, brain gym, duels, exam prep, flashcards, homeschooling
(timetable/week/session), library, live, messages, performance, pods, portfolio,
quizzes, resources, schedule, study, transcripts (published only), trivia, voice notes.

### Parent (`src/app/parent/`)
Academics (published `exam_marks` only, transcripts), attendance, billing,
homeschooling, live, link-student, notifications, students.

### Finance (`src/app/finance/`)
Ledger, payments, income/balance sheets, centers, expenses, weekly reports.

### Server actions (`src/app/actions/`)
`exams` (papers, submissions, marking, student results, server time),
`homeschool-exams` (control center, subjects, timetable, verify/publish/reports),
`exam-scripts` (admin photo intake), `examDesk` (AI paper generation),
`homeschool*` (program, learning, marking, AI), `student`, `teacher`,
`live-sessions`, `messages`, `push`, `payments` (via weekly-payments lib), and more.

## Examination system (current design)

- **One event, many subjects, mixed delivery.** `exam_events` (scope `tuition`/`homeschool`,
  `enrollment_id`) → `exam_event_subjects` (`online`/`physical`/`hybrid`, teacher owner,
  linked `exams` paper, `total_marks`) → `exam_timetable` (gates online entry).
- **Single result engine.** Everything lands in `exam_marks`
  (`marks, max_marks, percentage, grade, result_status submitted→marked→verified→published`).
  Grades always derive from percentage against `grading_scales` (0–100 bands); never hardcoded.
- **Teacher-unavailable flow.** Admin photographs scripts (`ExamScriptIntakeModal`,
  `assignment-uploads` storage) → workbook assignment → teacher marks remotely →
  bridge writes `exam_marks`. Parents see only after publish.
- **Online room.** Briefing with locked identity (name/class/adm from record),
  server-anchored timer, 10-min warning, 3-min review, submit confirmation,
  autosave/offline resume, fullscreen lockdown with logged strikes, integrity evidence log.
- **Paper builder.** Sections, 7 types (mcq, true/false, short, long, essay, math canvas,
  fill-blank), passages/stimulus, KCSE numbering (persisted depth), per-question M/A/C/B
  rubric, white-paper preview with logo, draft autosave, edit-until-live (live-lock on
  submissions/open window, duplicate-as-new escape).
- **Reports.** `generateExamReports` heals snapshots to live totals, re-derives grades,
  writes `transcripts` rows (per-subject + `is_overall` mean grade), publish notifies students.

## Setup

1. `npm install`
2. Copy `.env` values (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, …)
3. `supabase db push` (applies all migrations incl. `20260920`–`20260924` exam series)
4. `next dev`

## Missing / roadmap (audited, priority order)

**Exams — high**
1. Unified teacher entry is new (`teacher/exams` center); old deep links remain — finish redirecting nav.
2. MCQ/true-false auto-marking deliberately NOT built (manual marking only); `auto_score` column unused.
3. Parent online marked-paper view missing (component exists, not wired; needs `getChildExamResult` guard).
4. Matching question type exists in DB only — no builder tile, no renderer (falls back to textarea).
5. Fill-in-the-blank has no blank-definition UX (answer key only).
6. "Randomize order" checkbox is saved but never applied — wire or delete.
7. No question bank; every paper starts from zero.
8. Standalone online exams (no event link) produce no `exam_marks`/transcripts — warn or force-link.
9. No per-student time extensions (access arrangements).
10. Timer/refresh offline gap: answers cached, questions not — refresh offline kills the sitting.
11. No remark-request channel for students/parents.
12. Verify is all-or-nothing; no per-student/per-subject verify UI. Audit tables have no admin viewer.
13. No live sitting monitor (who started/submitted/strikes during the exam).
14. Math canvas poor on phones; keyboard nav thin in the room; browser-menu printing not blocked.
15. Text annotation only on math canvas; prose answers get comments + rubric only.
16. `tsc --noEmit` + `supabase db push` must go green before any demo (last full runs stalled under load).

**Exams — polish**
- Preview shows continuous paper, sitting is one-question-per-screen (same content, different shape).
- Homeschool timetable display inside student homeschool portal.
- Teacher mid-window paper-change guard (currently logged as evidence only).
- Explicit `media/diagram` upload per question (currently via `media_url` only).

**Platform-wide**
- Parent portal depth (fees visibility, homework view) lags student portal.
- Realtime notification coverage uneven across marking/publish events.
- Marketing-site teacher data is hardcoded (`TEACHERS` array) — move to CMS/table when portraits arrive.
- 177 migrations include legacy repairs; a squash + seed set would speed up fresh environments.
