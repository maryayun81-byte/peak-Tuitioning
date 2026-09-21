'use client'

/**
 * Premium A4 document snapshot for a transcript. Lightweight by design:
 * no data fetching, no charts — just the document identity (masthead,
 * grade, top subjects, average) in true A4 proportions. Used by transcript
 * libraries so small screens show documents, not shrunken full pages.
 */
export function TranscriptSnapshot({
  transcript,
  student,
  compact = false,
}: {
  transcript: any
  student?: any
  compact?: boolean
}) {
  const NAVY = '#1D4477'
  const GOLD = '#B08A1E'
  const subjects: any[] = transcript?.subject_results || []
  const withPct = subjects.filter(s => s.percentage != null || s.marks != null)
  const avg =
    withPct.length > 0
      ? Math.round(
          (withPct.reduce((a, s) => a + Number(s.percentage ?? s.marks ?? 0), 0) / withPct.length) * 100
        ) / 100
      : null
  const top = [...withPct]
    .sort((a, b) => Number(b.percentage ?? b.marks ?? 0) - Number(a.percentage ?? a.marks ?? 0))
    .slice(0, 4)
  const eventName = transcript?.exam_event?.name || transcript?.title || 'Academic Report'
  const year = transcript?.published_at || transcript?.created_at
    ? new Date(transcript.published_at || transcript.created_at).getFullYear()
    : ''

  return (
    <div
      className="relative bg-white rounded-lg overflow-hidden flex flex-col shadow-[0_18px_45px_-12px_rgba(15,23,42,0.35)] border border-slate-200"
      style={{ aspectRatio: '210 / 297' }}
    >
      {/* Masthead */}
      <div className="px-[8%] pt-[7%] pb-[5%]" style={{ background: NAVY }}>
        <div className="flex items-center gap-[4%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            className="rounded-full bg-white object-contain shrink-0"
            style={{ width: compact ? 30 : 44, height: compact ? 30 : 44, padding: 3 }}
            loading="lazy"
          />
          <div className="min-w-0">
            <p className="font-black text-white leading-tight truncate" style={{ fontSize: compact ? 11 : 15 }}>
              PEAK PERFORMANCE
            </p>
            <p className="font-bold uppercase text-white/70" style={{ fontSize: compact ? 7 : 9, letterSpacing: '0.22em' }}>
              Academic Transcript
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-[8%] py-[5%] flex flex-col min-h-0">
        <p className="font-bold truncate" style={{ color: NAVY, fontSize: compact ? 11 : 14 }}>
          {student?.full_name || 'Student'}
        </p>
        <p className="text-slate-500 truncate" style={{ fontSize: compact ? 8 : 10 }}>
          {eventName}
          {year ? ` · ${year}` : ''}
        </p>

        <div className="flex items-end justify-between mt-[4%]">
          <div>
            <p className="uppercase font-bold text-slate-400" style={{ fontSize: compact ? 6 : 8, letterSpacing: '0.16em' }}>
              Overall Grade
            </p>
            <p className="font-black leading-none" style={{ color: NAVY, fontSize: compact ? 34 : 52, fontFamily: "'Playfair Display', Georgia, serif" }}>
              {transcript?.overall_grade || '–'}
            </p>
          </div>
          <div className="text-right">
            <p className="uppercase font-bold text-slate-400" style={{ fontSize: compact ? 6 : 8, letterSpacing: '0.16em' }}>
              Average
            </p>
            <p className="font-black" style={{ color: NAVY, fontSize: compact ? 16 : 24 }}>
              {avg != null ? `${avg}%` : '–'}
            </p>
          </div>
        </div>

        <div className="mt-[5%] pt-[4%] space-y-[6%] min-h-0" style={{ borderTop: `2px solid ${NAVY}` }}>
          {top.map((s: any, i: number) => {
            const pct = Number(s.percentage ?? s.marks ?? 0)
            return (
              <div key={i}>
                <div className="flex justify-between gap-2" style={{ fontSize: compact ? 8 : 10 }}>
                  <span className="font-bold text-slate-700 truncate">{s.subject_name || s.subject}</span>
                  <span className="font-black shrink-0" style={{ color: NAVY }}>{pct}%</span>
                </div>
                <div className="rounded-full bg-slate-100 mt-[2%]" style={{ height: compact ? 3 : 5 }}>
                  <div className="rounded-full" style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: i === 0 ? GOLD : NAVY }} />
                </div>
              </div>
            )
          })}
          {subjects.length > top.length && (
            <p className="font-bold text-slate-400" style={{ fontSize: compact ? 7 : 9 }}>
              +{subjects.length - top.length} more subject{subjects.length - top.length === 1 ? '' : 's'}
            </p>
          )}
          {subjects.length === 0 && (
            <p className="italic text-slate-400" style={{ fontSize: compact ? 8 : 10 }}>No subjects recorded yet.</p>
          )}
        </div>

        <div className="mt-auto pt-[4%] flex items-center justify-between text-slate-400" style={{ fontSize: compact ? 6 : 8 }}>
          <span className="font-bold uppercase" style={{ letterSpacing: '0.14em' }}>
            {subjects.length} subject{subjects.length === 1 ? '' : 's'}
          </span>
          <span>peakcampus.co.ke</span>
        </div>
      </div>

      {/* Footer band */}
      <div className="py-[3%]" style={{ background: NAVY }}>
        <p className="text-center font-bold uppercase text-white/80" style={{ fontSize: compact ? 6 : 8, letterSpacing: '0.24em' }}>
          Official Academic Record
        </p>
      </div>
    </div>
  )
}
