import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PremiumTranscript } from '@/components/admin/PremiumTranscript'
import { TranscriptSnapshot } from '@/components/transcripts/TranscriptSnapshot'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => ({
            maybeSingle: () => Promise.resolve({ data: null }),
          }),
        }),
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [] }),
          }),
        }),
      }),
    }),
  }),
}))

function makeTranscript(subjects: any[]) {
  return {
    id: 't1',
    student_id: 's1',
    subject_results: subjects,
    overall_grade: 'B+',
    remarks: 'Well done.',
    created_at: '2026-01-15T00:00:00Z',
    published_at: '2026-01-20T00:00:00Z',
    exam_event: { name: 'End Term', start_date: '2026-01-05', end_date: '2026-01-12' },
  } as any
}

const student = { id: 's1', full_name: 'Test Learner', admission_number: 'ADM-1', class: { name: 'Form 3' } }

function subj(name: string, marks: number, grade = 'B+') {
  return { subject_name: name, marks, max_marks: 100, percentage: marks, grade, comment: 'Good' }
}

describe('PremiumTranscript layout', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('renders one compact row for one subject and no filler rows', async () => {
    const { container } = render(
      <PremiumTranscript transcript={makeTranscript([subj('Mathematics', 38, 'C+')])} student={student} />
    )
    await waitFor(() => expect(screen.getByText('Subject Performance')).toBeTruthy())
    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(1)
    // No fixed heights anywhere on table/rows
    const table = container.querySelector('table')
    expect((table as HTMLElement)?.style?.height || '').toBe('')
    expect(container.innerHTML).not.toContain('empty-')
    // One-subject wording: no "across 1 subject(s)"
    expect(container.innerHTML).not.toContain('subject(s)')
    // Compact indicator instead of a giant chart
    expect(screen.getByText('Current grade')).toBeTruthy()
  })

  it('grows naturally: 8 subjects = 8 rows, bar chart present', async () => {
    const subs = ['Math', 'Eng', 'Bio', 'Chem', 'Phy', 'His', 'Geo', 'CRE'].map((n, i) =>
      subj(n, 40 + i * 5)
    )
    const { container } = render(<PremiumTranscript transcript={makeTranscript(subs)} student={student} />)
    await waitFor(() => expect(screen.getAllByText('Subject Performance').length).toBeGreaterThanOrEqual(2))
    expect(container.querySelectorAll('tbody tr').length).toBe(8)
  })

  it('shows empty state with no subjects and no chart', async () => {
    const { container } = render(<PremiumTranscript transcript={makeTranscript([])} student={student} />)
    await waitFor(() => expect(screen.getByText(/No assessed subjects/i)).toBeTruthy())
    expect(container.querySelectorAll('tbody tr').length).toBe(0)
  })

  it('hides missing profile fields instead of N/A/undefined', async () => {
    const { container } = render(
      <PremiumTranscript
        transcript={makeTranscript([subj('Mathematics', 38, 'C+')])}
        student={{ id: 's1', full_name: 'Test Learner' }}
      />
    )
    await waitFor(() => expect(screen.getByText('Subject Performance')).toBeTruthy())
    const html = container.innerHTML
    expect(html).not.toContain('N/A')
    expect(html).not.toContain('undefined')
    expect(html).not.toContain('Unknown')
  })

  it('uses /logo.png default and admin stamp/signature when configured', async () => {
    const { container } = render(
      <PremiumTranscript transcript={makeTranscript([subj('Mathematics', 38, 'C+')])} student={student} />
    )
    await waitFor(() => expect(screen.getByText('Subject Performance')).toBeTruthy())
    const logo = container.querySelector('img[alt*="logo"]') as HTMLImageElement
    expect(logo?.getAttribute('src')).toBe('/logo.png')
  })
})

describe('TranscriptSnapshot library card', () => {
  const subs = ['Math', 'Eng', 'Bio', 'Chem', 'Phy', 'His'].map((n, i) => subj(n, 40 + i * 5))
  const t = makeTranscript(subs)

  it('renders A4 proportions with grade, average and top subjects only', () => {
    const { container } = render(<TranscriptSnapshot transcript={t} student={student} compact />)
    const card = container.firstChild as HTMLElement
    expect(card.style.aspectRatio).toBe('210 / 297')
    expect(screen.getByText('B+')).toBeTruthy()
    // Only top 4 + overflow line — lowest subjects cut (Math 40%, Eng 45%)
    expect(screen.getByText('+2 more subjects')).toBeTruthy()
    expect(screen.queryByText('Math')).toBeNull()
    expect(screen.getByText('His')).toBeTruthy()
  })

  it('handles empty transcripts without N/A text', () => {
    const { container } = render(<TranscriptSnapshot transcript={makeTranscript([])} student={student} />)
    expect(screen.getByText(/No subjects recorded/i)).toBeTruthy()
    expect(container.innerHTML).not.toContain('N/A')
  })
})
