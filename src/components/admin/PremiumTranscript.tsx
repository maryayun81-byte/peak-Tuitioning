'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Transcript } from '@/types/database'

interface PremiumTranscriptProps {
  transcript: Transcript
  student?: any
  onReady?: (ready: boolean) => void
}

const NAVY = '#1D4477'
const GOLD = '#B08A1E'
const INK = '#0F172A'

type SubjectRow = {
  name: string
  marks: number | null
  max: number
  pct: number | null
  grade: string
  remark: string
}

function normalizeSubjects(raw: any[]): SubjectRow[] {
  return (raw || []).map((r: any) => {
    const marks = r.marks ?? r.mark ?? r.score ?? null
    const max = Number(r.max_marks ?? r.max_mark ?? r.max ?? 100) || 100
    const pctRaw = r.percentage ?? r.percent ?? null
    const pct =
      pctRaw ?? (marks != null ? Math.round((Number(marks) / max) * 10000) / 100 : null)
    return {
      name: r.subject_name ?? r.subject ?? r.subjectName ?? r.name ?? 'Subject',
      marks: marks != null ? Number(marks) : null,
      max,
      pct: pct != null ? Number(pct) : null,
      grade: r.grade ?? r.progress_summary ?? '—',
      remark: r.comment ?? r.remark ?? r.teacher_remark ?? '',
    }
  })
}

function avgOf(rows: SubjectRow[]): number | null {
  const vals = rows.map(r => r.pct).filter((v): v is number => v != null)
  if (vals.length === 0) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
}

export function PremiumTranscript({ transcript, student: studentContext, onReady }: PremiumTranscriptProps) {
  const supabase = getSupabaseBrowserClient()
  const [config, setConfig] = useState<any>(null)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [assetsReady, setAssetsReady] = useState({ logo: false, sig: false, stamp: false, photo: false })
  const [history, setHistory] = useState<{ id: string; label: string; avg: number; date: string; subjects: Record<string, number> }[]>([])
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const student = studentContext || (transcript as any).student
  const snapshot = ((transcript as any).branding_snapshot as any) || {}
  const subjects = normalizeSubjects((transcript as any).subject_results || [])
  const examEvent = (transcript as any).exam_event || {}
  const avg = avgOf(subjects)
  const overallGrade = (transcript as any).overall_grade || null
  const teacherRemark = (transcript as any).remarks || ''
  const publishedAt = (transcript as any).published_at || (transcript as any).created_at

  // Branding: live admin config wins; logo falls back to /logo.png in public/.
  const logoUrl = config?.logo_url || snapshot.logo_url || '/logo.png'
  const schoolName = config?.school_name || snapshot.school_name || 'Peak Performance Tutoring'
  const directorName = config?.director_name || snapshot.director_name || ''
  const sigUrl = config?.director_signature_url || config?.signature_url || snapshot.director_signature_url || ''
  const legacySig = config?.signature_data || snapshot.signature_data || ''
  const legacySigType = config?.signature_type || snapshot.signature_type || 'draw'
  const legacySigFont = config?.signature_font || snapshot.signature_font || "'Dancing Script', cursive"
  const stampUrl = config?.stamp_url || snapshot.stamp_url || ''
  const watermark = config?.watermark_text || snapshot.watermark_text || ''
  const footerText = config?.footer_text || snapshot.footer_text || ''
  const showSig = (config?.apply_transcripts ?? snapshot.apply_transcripts ?? true) !== false

  useEffect(() => {
    supabase
      .from('transcript_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setConfig(data)
        setConfigLoaded(true)
      })
  }, [supabase])

  // Real historical averages for the progress chart — never invented.
  useEffect(() => {
    const sid = student?.id
    if (!sid) return
    supabase
      .from('transcripts')
      .select('id, created_at, subject_results, exam_event:exam_events(name)')
      .eq('student_id', sid)
      .order('created_at', { ascending: true })
      .limit(12)
      .then(({ data }) => {
        const pts: { id: string; label: string; avg: number; date: string; subjects: Record<string, number> }[] = []
        for (const t of (data || []) as any[]) {
          const rows = normalizeSubjects(t.subject_results || [])
          const a = avgOf(rows)
          if (a == null) continue
          const ev: any = Array.isArray(t.exam_event) ? t.exam_event[0] : t.exam_event
          const subjMap: Record<string, number> = {}
          for (const r of rows) if (r.pct != null) subjMap[r.name.toLowerCase()] = r.pct
          pts.push({
            id: t.id,
            label: ev?.name || new Date(t.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
            avg: a,
            date: t.created_at,
            subjects: subjMap,
          })
        }
        setHistory(pts)
      })
  }, [student?.id, supabase])

  // Student photo from profile, with initials fallback handled at render.
  useEffect(() => {
    const uid = (student as any)?.user_id
    if (!uid) return
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data }) => {
        if ((data as any)?.avatar_url) setPhotoUrl((data as any).avatar_url)
        setAssetsReady(p => ({ ...p, photo: true }))
      })
  }, [supabase, (student as any)?.user_id])

  useEffect(() => {
    if (!onReady) return
    const needSig = showSig && !!(sigUrl || legacySig)
    const ready =
      configLoaded &&
      (assetsReady.logo || !logoUrl) &&
      (assetsReady.sig || !needSig) &&
      (assetsReady.stamp || !stampUrl)
    if (ready) {
      const t = setTimeout(() => onReady(true), 150)
      return () => clearTimeout(t)
    }
    onReady(false)
  }, [onReady, configLoaded, assetsReady, logoUrl, sigUrl, legacySig, stampUrl, showSig])

  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;600;700;800&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
    return () => {
      try {
        document.head.removeChild(link)
      } catch (e) {}
    }
  }, [])

  // Profile fields — empties removed, never N/A/undefined.
  const profile: { label: string; value: string }[] = [
    student?.full_name ? { label: 'Student Name', value: student.full_name } : null,
    student?.admission_number ? { label: 'Admission No', value: student.admission_number } : null,
    (student?.class?.name || (transcript as any)?.class_name)
      ? { label: 'Class / Grade', value: student?.class?.name || (transcript as any).class_name }
      : null,
    (student?.curriculum?.name || (transcript as any)?.curriculum_name)
      ? { label: 'Curriculum', value: student?.curriculum?.name || (transcript as any).curriculum_name }
      : null,
    examEvent?.name ? { label: 'Assessment', value: examEvent.name } : null,
    examEvent?.start_date
      ? {
          label: 'Period',
          value: `${new Date(examEvent.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${examEvent.end_date ? ` – ${new Date(examEvent.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`,
        }
      : null,
    publishedAt
      ? { label: 'Date Issued', value: new Date(publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }
      : null,
  ].filter(Boolean) as { label: string; value: string }[]

  const withPct = subjects.filter(s => s.pct != null)
  const strongest = withPct.length > 0 ? withPct.reduce((a, b) => (b.pct! > a.pct! ? b : a)) : null
  const weakest = withPct.length > 1 ? withPct.reduce((a, b) => (b.pct! < a.pct! ? b : a)) : null
  const aboveAvg = avg != null ? withPct.filter(s => s.pct! >= avg).sort((a, b) => b.pct! - a.pct!).slice(0, 3) : []
  const belowAvg = avg != null ? withPct.filter(s => s.pct! < avg).sort((a, b) => a.pct! - b.pct!).slice(0, 3) : []
  const highest = withPct.length > 0 ? Math.max(...withPct.map(s => s.pct!)) : null
  const lowest = withPct.length > 0 ? Math.min(...withPct.map(s => s.pct!)) : null

  // Comparison vs the previous published assessment (real data only).
  const historyIdx = history.findIndex(h => h.id === (transcript as any).id)
  const prevReport = historyIdx > 0 ? history[historyIdx - 1] : null
  const avgDelta = avg != null && prevReport ? Math.round((avg - prevReport.avg) * 100) / 100 : null
  const prevSubjects = prevReport?.subjects || {}
  const initials = (student?.full_name || 'S')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div
      className="mx-auto bg-white text-slate-900 relative"
      style={{ width: '210mm', padding: '15mm 16mm', fontFamily: "'Inter', sans-serif", fontSize: '11pt' }}
    >
      {/* Watermark */}
      {watermark && (
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{ opacity: 0.045 }}
        >
          <span className="font-black text-center leading-tight" style={{ fontSize: '72pt', color: NAVY }}>
            {watermark}
          </span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="rounded overflow-hidden" style={{ background: NAVY }}>
        <div className="flex items-center gap-4 px-5 py-4">
          <img
            src={logoUrl}
            alt={`${schoolName} logo`}
            crossOrigin="anonymous"
            style={{ width: 60, height: 60, objectFit: 'contain', background: '#fff', borderRadius: '50%', padding: 4, boxShadow: `0 0 0 2px ${GOLD}` }}
            onLoad={() => setAssetsReady(p => ({ ...p, logo: true }))}
            onError={e => {
              const img = e.target as HTMLImageElement
              if (img.src.endsWith('/logo.png')) {
                img.style.display = 'none'
              } else {
                img.src = '/logo.png'
              }
              setAssetsReady(p => ({ ...p, logo: true }))
            }}
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-black tracking-wide text-white leading-tight" style={{ fontSize: '16pt', fontFamily: "'Playfair Display', serif" }}>
              {schoolName}
            </h1>
            <p className="font-bold uppercase" style={{ color: GOLD, fontSize: '10pt', letterSpacing: '0.2em' }}>
              Student Academic Transcript
            </p>
            <p className="text-white/60" style={{ fontSize: '8pt' }}>peakcampus.co.ke</p>
          </div>
          <div className="text-right shrink-0" style={{ fontSize: '8.5pt' }}>
            {examEvent?.name && <p className="font-bold text-white">{examEvent.name}</p>}
            {publishedAt && <p className="text-white/60">{new Date(publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
          </div>
        </div>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${GOLD}, rgba(201,162,39,0))` }} />
      </div>

      {/* ── PROFILE (photo + compact fields) ── */}
      <div className="flex gap-4 mt-5">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={student?.full_name || 'Student photo'}
            crossOrigin="anonymous"
            style={{ width: 84, height: 96, objectFit: 'cover', borderRadius: 10, border: `2px solid ${GOLD}` }}
            onLoad={() => setAssetsReady(p => ({ ...p, photo: true }))}
            onError={() => setAssetsReady(p => ({ ...p, photo: true }))}
          />
        ) : (
          <div
            className="flex items-center justify-center font-black shrink-0"
            style={{ width: 84, height: 96, borderRadius: 10, background: NAVY, color: '#fff', fontSize: '22pt', fontFamily: "'Playfair Display', serif", border: `2px solid ${GOLD}` }}
          >
            {initials}
          </div>
        )}
        {profile.length > 0 && (
          <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2 content-start">
            {profile.map(f => (
              <div key={f.label} className="flex gap-2 min-w-0" style={{ fontSize: '9.5pt' }}>
                <span className="font-bold uppercase text-slate-500 w-24 shrink-0" style={{ fontSize: '8pt', letterSpacing: '0.08em' }}>
                  {f.label}
                </span>
                <span className="font-bold break-words" style={{ color: INK }}>{f.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SUBJECT TABLE (natural rows only — never padded) ── */}
      <h2 className="font-black uppercase mt-6 mb-2" style={{ color: NAVY, fontSize: '11pt', letterSpacing: '0.12em' }}>
        Subject Performance
      </h2>
      {subjects.length === 0 ? (
        <p className="text-slate-500 italic" style={{ fontSize: '10pt' }}>
          No assessed subjects recorded for this report yet.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
          <thead>
            <tr style={{ background: NAVY, color: '#fff' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '8.5pt', letterSpacing: '0.08em' }}>SUBJECT</th>
              <th style={{ textAlign: 'center', padding: '8px 8px', width: '18%', fontSize: '8.5pt', letterSpacing: '0.08em' }}>MARK</th>
              <th style={{ textAlign: 'center', padding: '8px 8px', width: '14%', fontSize: '8.5pt', letterSpacing: '0.08em' }}>GRADE</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', width: '30%', fontSize: '8.5pt', letterSpacing: '0.08em' }}>REMARK</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? '#F6F8FB' : '#fff', borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700, overflowWrap: 'anywhere' }}>{s.name}</td>
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800 }}>
                  {s.marks != null ? `${s.marks}${s.max !== 100 ? ` / ${s.max}` : ''}` : '–'}
                  {s.pct != null && prevSubjects[s.name.toLowerCase()] != null && (
                    <span
                      style={{
                        display: 'block',
                        fontSize: '7.5pt',
                        color: s.pct - prevSubjects[s.name.toLowerCase()] > 0 ? '#15803D' : s.pct - prevSubjects[s.name.toLowerCase()] < 0 ? '#B91C1C' : '#64748B',
                      }}
                    >
                      {s.pct - prevSubjects[s.name.toLowerCase()] > 0 ? '▲' : s.pct - prevSubjects[s.name.toLowerCase()] < 0 ? '▼' : '•'}
                      {Math.abs(Math.round((s.pct - prevSubjects[s.name.toLowerCase()]) * 100) / 100)}
                    </span>
                  )}
                </td>
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: NAVY }}>{s.grade}</td>
                <td style={{ padding: '8px 12px', overflowWrap: 'anywhere', color: '#334155' }}>{s.remark || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── SUMMARY ── */}
      {subjects.length > 0 && avg != null && (
        <div className="mt-5 flex gap-3" style={{ breakInside: 'avoid' }}>
          <div className="flex-1 text-center rounded p-3" style={{ background: NAVY, color: '#fff' }}>
            <p className="uppercase font-bold" style={{ fontSize: '7.5pt', letterSpacing: '0.14em', color: GOLD }}>Average Mark</p>
            <p className="font-black" style={{ fontSize: '20pt' }}>{avg}%</p>
          </div>
          {overallGrade && (
            <div className="flex-1 text-center rounded p-3 border-2" style={{ borderColor: GOLD }}>
              <p className="uppercase font-bold text-slate-500" style={{ fontSize: '7.5pt', letterSpacing: '0.14em' }}>Overall Grade</p>
              <p className="font-black" style={{ fontSize: '20pt', color: NAVY, fontFamily: "'Playfair Display', serif" }}>{overallGrade}</p>
            </div>
          )}
          <div className="flex-1 rounded p-3 flex flex-col justify-center gap-1" style={{ background: '#F6F8FB', fontSize: '9pt' }}>
            <p><strong>{subjects.length}</strong> subject{subjects.length === 1 ? '' : 's'} taken</p>
            {highest != null && <p>Highest <strong>{highest}%</strong>{strongest ? ` (${strongest.name})` : ''}</p>}
            {lowest != null && subjects.length > 1 && <p>Lowest <strong>{lowest}%</strong>{weakest ? ` (${weakest.name})` : ''}</p>}
          </div>
        </div>
      )}

      {/* ── COMPARISON vs previous assessment (real data only) ── */}
      {subjects.length > 0 && avg != null && (
        <div className="mt-4 rounded p-3 flex items-center gap-3" style={{ background: '#F6F8FB', borderLeft: `5px solid ${GOLD}`, breakInside: 'avoid' }}>
          {prevReport && avgDelta != null ? (
            <>
              <span
                className="font-black rounded-full text-white flex items-center justify-center shrink-0"
                style={{ width: 40, height: 40, fontSize: '14pt', background: avgDelta > 0 ? '#15803D' : avgDelta < 0 ? '#B91C1C' : '#64748B' }}
              >
                {avgDelta > 0 ? '▲' : avgDelta < 0 ? '▼' : '•'}
              </span>
              <p style={{ fontSize: '9.5pt' }}>
                <strong>{avg}%</strong> vs <strong>{prevReport.avg}%</strong> in {prevReport.label} —{' '}
                <strong style={{ color: avgDelta > 0 ? '#15803D' : avgDelta < 0 ? '#B91C1C' : INK }}>
                  {avgDelta > 0 ? `up ${avgDelta}` : avgDelta < 0 ? `down ${Math.abs(avgDelta)}` : 'no change'} points
                </strong>
              </p>
            </>
          ) : (
            <p style={{ fontSize: '9.5pt' }} className="text-slate-600">
              <strong>First published record.</strong> Progress tracking against future assessments begins here.
            </p>
          )}
        </div>
      )}
      {/* ── CHART: bars for 2+, ring card for 1, none for 0 ── */}
      {withPct.length >= 2 && (
        <div className="mt-6" style={{ breakInside: 'avoid' }}>
          <h3 className="font-black uppercase mb-2" style={{ color: NAVY, fontSize: '10pt', letterSpacing: '0.12em' }}>
            Subject Performance
          </h3>
          <div className="flex gap-4">
            <div className="flex flex-col justify-between text-right text-slate-400 shrink-0 py-1" style={{ fontSize: '7.5pt', height: 150 }}>
              {[100, 75, 50, 25, 0].map(v => <span key={v}>{v}</span>)}
            </div>
            <div className="flex-1 flex items-end gap-2 border-l border-b border-slate-300 pl-2 pb-1" style={{ height: 150 }}>
              {withPct.map((s, i) => {
                const isTop = highest != null && s.pct === highest
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                    <span className="font-bold" style={{ fontSize: '8pt', color: NAVY }}>{s.pct}%</span>
                    <div
                      className="w-full rounded-t"
                      style={{ height: `${Math.max(3, (s.pct! / 100) * 118)}px`, background: isTop ? GOLD : NAVY }}
                    />
                    <span className="text-slate-500 text-center leading-tight mt-1" style={{ fontSize: '7pt', overflowWrap: 'anywhere' }}>
                      {s.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
      {withPct.length === 1 && (
        <div className="mt-5 rounded p-4 flex items-center gap-5" style={{ background: '#F6F8FB', borderLeft: `5px solid ${NAVY}`, breakInside: 'avoid' }}>
          <SingleSubjectRing pct={withPct[0].pct!} grade={withPct[0].grade} />
          <div>
            <p className="font-black" style={{ fontSize: '16pt', color: NAVY }}>{withPct[0].name}</p>
            <p className="font-bold" style={{ fontSize: '12pt' }}>
              {withPct[0].marks}{withPct[0].max !== 100 ? `/${withPct[0].max}` : ''} · {withPct[0].pct}% · {withPct[0].grade}
            </p>
            <p className="text-slate-500" style={{ fontSize: '8.5pt' }}>Current performance</p>
          </div>
        </div>
      )}

      {/* ── PROGRESS OVER TIME (real history only) ── */}
      {history.length >= 2 && (
        <div className="mt-6" style={{ breakInside: 'avoid' }}>
          <h3 className="font-black uppercase mb-2" style={{ color: NAVY, fontSize: '10pt', letterSpacing: '0.12em' }}>
            Progress Over Time
          </h3>
          <ProgressLine points={history} />
        </div>
      )}

      {/* ── INSIGHT ── */}
      {withPct.length >= 1 && (
        <div className="mt-6" style={{ breakInside: 'avoid' }}>
          <h3 className="font-black uppercase mb-2" style={{ color: NAVY, fontSize: '10pt', letterSpacing: '0.12em' }}>
            Performance Insight
          </h3>
          <div className="rounded p-4" style={{ background: '#F6F8FB', fontSize: '9.5pt' }}>
            {withPct.length === 1 ? (
              <p><strong>{withPct[0].name}</strong> recorded <strong>{withPct[0].marks}{withPct[0].max !== 100 ? `/${withPct[0].max}` : ''} ({withPct[0].pct}%)</strong>, corresponding to grade <strong>{withPct[0].grade}</strong>.</p>
            ) : (
              <>
                {strongest && <p>The strongest performance was recorded in <strong>{strongest.name}</strong> at <strong>{strongest.pct}%</strong>.</p>}
                {weakest && weakest !== strongest && (
                  <p className="mt-1"><strong>{weakest.name}</strong> recorded <strong>{weakest.pct}%</strong> and represents the main area for further improvement.</p>
                )}
              </>
            )}
            {aboveAvg.length > 0 && withPct.length > 1 && (
              <p className="mt-2"><strong>Strengths:</strong> {aboveAvg.map(s => `${s.name} — ${s.pct}%`).join(' · ')}</p>
            )}
            {belowAvg.length > 0 && (
              <p className="mt-1"><strong>Focus areas:</strong> {belowAvg.map(s => `${s.name} — ${s.pct}%`).join(' · ')}</p>
            )}
          </div>
        </div>
      )}

      {/* ── REMARK ── */}
      <div className="mt-6" style={{ breakInside: 'avoid' }}>
        <h3 className="font-black uppercase mb-2 text-center" style={{ color: NAVY, fontSize: '10pt', letterSpacing: '0.12em' }}>
          Academic Remark
        </h3>
        <p className="text-center italic leading-relaxed" style={{ fontSize: '10.5pt', fontFamily: "'Playfair Display', serif", color: NAVY }}>
          &ldquo;{teacherRemark || 'Steady engagement recorded across the assessed areas. Continued practice, targeted revision and regular assessment are recommended.'}&rdquo;
        </p>
      </div>

      {/* ── NEXT STEPS ── */}
      <div className="mt-5" style={{ breakInside: 'avoid' }}>
        <h3 className="font-black uppercase mb-2" style={{ color: NAVY, fontSize: '10pt', letterSpacing: '0.12em' }}>
          Recommended Next Steps
        </h3>
        <ol className="space-y-1" style={{ fontSize: '9.5pt' }}>
          <li><strong>01 —</strong> Review topics associated with the lowest marks.</li>
          <li><strong>02 —</strong> Complete targeted practice questions for focus areas.</li>
          <li><strong>03 —</strong> Reassess after the recommended revision period.</li>
        </ol>
      </div>

      {/* ── SIGNATURES ── */}
      <div className="mt-7 flex items-end gap-6" style={{ breakInside: 'avoid' }}>
        <div className="flex-1">
          {showSig && (sigUrl || legacySig) && (
            <div className="h-16 flex items-end justify-center border-b" style={{ borderColor: NAVY }}>
              {sigUrl ? (
                <img
                  src={sigUrl}
                  alt="Director signature"
                  crossOrigin="anonymous"
                  style={{ maxHeight: 60, objectFit: 'contain' }}
                  onLoad={() => setAssetsReady(p => ({ ...p, sig: true }))}
                  onError={() => setAssetsReady(p => ({ ...p, sig: true }))}
                />
              ) : legacySigType === 'type' ? (
                <span style={{ fontFamily: legacySigFont, fontSize: '22pt', color: NAVY }}>{legacySig}</span>
              ) : (
                <img
                  src={legacySig}
                  alt="Director signature"
                  crossOrigin="anonymous"
                  style={{ maxHeight: 60, objectFit: 'contain' }}
                  onLoad={() => setAssetsReady(p => ({ ...p, sig: true }))}
                  onError={() => setAssetsReady(p => ({ ...p, sig: true }))}
                />
              )}
            </div>
          )}
          <p className="text-center font-bold uppercase mt-1" style={{ fontSize: '8.5pt', letterSpacing: '0.1em', color: NAVY }}>
            {directorName || 'Director'}
          </p>
        </div>
        {stampUrl && (
          <img
            src={stampUrl}
            alt="Official stamp"
            crossOrigin="anonymous"
            style={{ width: 90, height: 90, objectFit: 'contain', transform: 'rotate(-8deg)', opacity: 0.85 }}
            onLoad={() => setAssetsReady(p => ({ ...p, stamp: true }))}
            onError={() => setAssetsReady(p => ({ ...p, stamp: true }))}
          />
        )}
        <div className="flex-1">
          <div className="h-16 flex items-end justify-center border-b" style={{ borderColor: NAVY }}>
            <span className="font-bold" style={{ fontSize: '11pt' }}>
              {publishedAt ? new Date(publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
            </span>
          </div>
          <p className="text-center font-bold uppercase mt-1" style={{ fontSize: '8.5pt', letterSpacing: '0.1em', color: NAVY }}>Date</p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="mt-6 pt-3 text-center" style={{ borderTop: `2px solid ${NAVY}` }}>
        <p className="font-black" style={{ fontSize: '9pt', color: NAVY }}>{schoolName}</p>
        <p className="text-slate-500" style={{ fontSize: '8pt' }}>
          Unlocking Every Student&apos;s Potential · peakcampus.co.ke{footerText ? ` · ${footerText}` : ''}
        </p>
      </div>
    </div>
  )
}

/** Pure HTML/CSS progress ring for single-subject reports — html2canvas-safe. */
function SingleSubjectRing({ pct, grade }: { pct: number; grade: string }) {
  const R = 44
  const C = 2 * Math.PI * R
  const frac = Math.min(100, Math.max(0, pct)) / 100
  // Ring approximated with conic-gradient (rasterized sharply at capture scale).
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: 110,
        height: 110,
        background: `conic-gradient(${NAVY} ${frac * 360}deg, #E2E8F0 0deg)`,
      }}
    >
      <div className="rounded-full bg-white flex flex-col items-center justify-center" style={{ width: 86, height: 86 }}>
        <span className="font-black leading-none" style={{ fontSize: '18pt', color: NAVY }}>{pct}%</span>
        <span className="font-bold" style={{ fontSize: '9pt', color: GOLD }}>{grade}</span>
      </div>
    </div>
  )
}

/** Pure HTML/CSS progress line — sharp in html2canvas captures, no SVG dependency. */
function ProgressLine({ points }: { points: { label: string; avg: number; date: string }[] }) {
  const W = 100
  const H = 100
  const n = points.length
  const x = (i: number) => (n === 1 ? W / 2 : 8 + (i / (n - 1)) * (W - 16))
  const y = (v: number) => H - 8 - (Math.min(100, Math.max(0, v)) / 100) * (H - 20)

  const segs: { left: number; top: number; width: number; angle: number }[] = []
  for (let i = 0; i < n - 1; i++) {
    const x1 = x(i)
    const y1 = y(points[i].avg)
    const x2 = x(i + 1)
    const y2 = y(points[i + 1].avg)
    const dx = x2 - x1
    const dy = y2 - y1
    segs.push({
      left: x1,
      top: y1,
      width: Math.sqrt(dx * dx + dy * dy),
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    })
  }

  return (
    <div>
      <div className="relative border-l border-b border-slate-300" style={{ height: 170 }}>
        {[100, 75, 50, 25, 0].map(v => (
          <div key={v} className="absolute w-full border-t border-dashed border-slate-200" style={{ top: `${((H - (v / 100) * (H - 20) - 8) / H) * 170}px` }}>
            <span className="absolute -top-2 right-1 text-slate-400" style={{ fontSize: '7pt' }}>{v}</span>
          </div>
        ))}
        {segs.map((s, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${s.left}%`,
              top: `${(s.top / H) * 170}px`,
              width: `${s.width}%`,
              height: 2,
              background: NAVY,
              transformOrigin: 'left center',
              transform: `rotate(${s.angle}deg)`,
            }}
          />
        ))}
        {points.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full border-2 border-white shadow"
            title={`${p.label}: ${p.avg}%`}
            style={{
              left: `calc(${x(i)}% - 5px)`,
              top: `${(y(p.avg) / H) * 170 - 5}px`,
              width: 10,
              height: 10,
              background: GOLD,
            }}
          />
        ))}
      </div>
      <div className="flex mt-1">
        {points.map((p, i) => (
          <span key={i} className="flex-1 text-center text-slate-500 leading-tight" style={{ fontSize: '7.5pt', overflowWrap: 'anywhere' }}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  )
}
