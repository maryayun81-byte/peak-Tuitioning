'use client'

/**
 * Premium A4 document snapshot for a transcript. Lightweight by design:
 * no data fetching, no charts — just the document identity (masthead,
 * grade medallion, top subjects, average) in true A4 proportions. Used by
 * transcript libraries so small screens show documents, not shrunken pages.
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
  const NAVY_DEEP = '#12283F'
  const GOLD = '#C9A227'
  const subjects: any[] = transcript?.subject_results || []
  const withPct = subjects.filter(s => s.percentage ?? s.percent ?? s.marks ?? null)
  const pctOf = (s: any) =>
    Number(s.percentage ?? s.percent ?? (s.marks != null ? (Number(s.marks) / (Number(s.max_marks ?? s.max_mark ?? 100) || 100)) * 100 : 0))
  const avg =
    withPct.length > 0
      ? Math.round((withPct.reduce((a, s) => a + pctOf(s), 0) / withPct.length) * 100) / 100
      : null
  const top = [...withPct].sort((a, b) => pctOf(b) - pctOf(a)).slice(0, 4)
  const eventName = transcript?.exam_event?.name || transcript?.title || 'Academic Report'
  const year = transcript?.published_at || transcript?.created_at
    ? new Date(transcript.published_at || transcript.created_at).getFullYear()
    : ''

  return (
    <div
      className="relative bg-white rounded-xl overflow-hidden flex flex-col"
      style={{
        aspectRatio: '210 / 297',
        boxShadow: '0 24px 55px -18px rgba(18,40,63,0.5), 0 2px 6px rgba(18,40,63,0.12)',
        border: '1px solid #E2E8F0',
      }}
    >
      {/* Masthead */}
      <div className="relative px-[8%] pt-[7%] pb-[6%] overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY_DEEP} 0%, ${NAVY} 60%, #2A5A8F 100%)` }}>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        />
        <div className="relative flex items-center gap-[4%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            className="rounded-full bg-white object-contain shrink-0"
            style={{
              width: compact ? 32 : 46,
              height: compact ? 32 : 46,
              padding: 3,
              boxShadow: `0 0 0 2px ${GOLD}`,
            }}
            loading="lazy"
          />
          <div className="min-w-0">
            <p className="font-black text-white leading-tight truncate" style={{ fontSize: compact ? 12 : 16, letterSpacing: '0.04em' }}>
              PEAK PERFORMANCE
            </p>
            <p className="font-bold uppercase" style={{ color: GOLD, fontSize: compact ? 7 : 9, letterSpacing: '0.26em' }}>
              Academic Transcript
            </p>
          </div>
        </div>
        <div className="relative mt-[4%] h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${GOLD}, rgba(201,162,39,0))` }} />
      </div>

      {/* Body */}
      <div className="flex-1 px-[8%] py-[5%] flex flex-col min-h-0">
        <p className="font-black truncate" style={{ color: NAVY, fontSize: compact ? 12 : 15 }}>
          {student?.full_name || 'Student'}
        </p>
        <p className="text-slate-500 truncate" style={{ fontSize: compact ? 8 : 10 }}>
          {eventName}
          {year ? ` · ${year}` : ''}
        </p>

        {/* Grade medallion + average */}
        <div className="flex items-center gap-[5%] mt-[5%]">
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: compact ? 64 : 84,
              height: compact ? 64 : 84,
              background: `conic-gradient(${GOLD} 0deg, #F3E3AC 90deg, ${GOLD} 180deg, #8A6D15 270deg, ${GOLD} 360deg)`,
              boxShadow: '0 6px 16px -4px rgba(138,109,21,0.55)',
            }}
          >
            <div className="flex items-center justify-center rounded-full bg-white" style={{ width: '78%', height: '78%' }}>
              <span className="font-black" style={{ color: NAVY, fontSize: compact ? 18 : 26, fontFamily: "'Playfair Display', Georgia, serif" }}>
                {transcript?.overall_grade || '–'}
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="uppercase font-bold text-slate-400" style={{ fontSize: compact ? 6 : 8, letterSpacing: '0.18em' }}>
              Average Mark
            </p>
            <p className="font-black leading-none" style={{ color: NAVY, fontSize: compact ? 20 : 30 }}>
              {avg != null ? `${avg}%` : '–'}
            </p>
            <p className="text-slate-500 mt-[2%]" style={{ fontSize: compact ? 7 : 9 }}>
              {subjects.length} subject{subjects.length === 1 ? '' : 's'} assessed
            </p>
          </div>
        </div>

        {/* Top subjects */}
        <div className="mt-[5%] space-y-[7%] min-h-0">
          {top.map((s: any, i: number) => {
            const pct = Math.round(pctOf(s) * 100) / 100
            return (
              <div key={i}>
                <div className="flex justify-between gap-2" style={{ fontSize: compact ? 8 : 10 }}>
                  <span className="font-bold text-slate-700 truncate">
                    <span className="font-black mr-1" style={{ color: i === 0 ? GOLD : '#94A3B8' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {s.subject_name || s.subject}
                  </span>
                  <span className="font-black shrink-0" style={{ color: NAVY }}>{pct}%</span>
                </div>
                <div className="rounded-full bg-slate-100 mt-[2.5%] overflow-hidden" style={{ height: compact ? 4 : 6 }}>
                  <div
                    className="rounded-full h-full"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: i === 0 ? `linear-gradient(90deg, ${GOLD}, #F3E3AC)` : `linear-gradient(90deg, ${NAVY}, #3E7CB1)`,
                    }}
                  />
                </div>
              </div>
            )
          })}
          {subjects.length > top.length && (
            <p className="font-bold text-slate-400" style={{ fontSize: compact ? 7 : 9 }}>
              +{subjects.length - top.length} more subject{subjects.length - top.length === 1 ? '' : 's'} inside
            </p>
          )}
          {subjects.length === 0 && (
            <p className="italic text-slate-400" style={{ fontSize: compact ? 8 : 10 }}>No subjects recorded yet.</p>
          )}
        </div>

        <div className="mt-auto pt-[4%] flex items-center justify-between text-slate-400" style={{ fontSize: compact ? 6 : 8 }}>
          <span className="font-bold uppercase" style={{ letterSpacing: '0.14em' }}>Verified Record</span>
          <span>peakcampus.co.ke</span>
        </div>
      </div>

      {/* Footer band */}
      <div className="py-[3%]" style={{ background: NAVY }}>
        <p className="text-center font-bold uppercase text-white/85" style={{ fontSize: compact ? 6 : 8, letterSpacing: '0.26em' }}>
          Official Academic Record
        </p>
      </div>
    </div>
  )
}
