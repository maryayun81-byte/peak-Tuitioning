'use client'

/**
 * PeakCoachPanel — the analytics strip for the weekly payments page.
 *
 * Everything here is deterministic: verdicts, follow-up flags, insights and
 * the debt-age bar all come from the computed CoachBrief (lib/weekly-insights).
 * The optional `aiCommentary` is displayed separately and explicitly labelled
 * as AI, so a model can add context without ever contradicting the numbers.
 *
 * Flags and student-level insights are full lists (never truncated) and link
 * back to the student via `onNavigate`. All motion is cosmetic and defers to
 * the brief — nothing here mutates data.
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { CoachBrief, CoachTone, CoachTrajectory, DebtAging } from '@/lib/weekly-insights'
import type { CoachCommentary } from '@/lib/coach-ai'

const TONE_COLOR: Record<CoachTone, string> = {
  red: '#B3261E',
  amber: '#8A5A00',
  blue: '#2A4D8F',
  green: '#2F6B32',
}
const TONE_BG: Record<CoachTone, string> = {
  red: 'rgba(179,38,30,0.10)',
  amber: 'rgba(138,90,0,0.10)',
  blue: 'rgba(42,77,143,0.10)',
  green: 'rgba(47,107,50,0.10)',
}
const TONE_LABEL: Record<CoachTone, string> = {
  red: 'Follow up now',
  amber: 'Watch closely',
  blue: 'Good to know',
  green: 'All good',
}
const TRAJECTORY: Record<CoachTrajectory, { glyph: string; color: string; label: string }> = {
  improving: { glyph: '↑', color: '#2F6B32', label: 'Improving' },
  worsening: { glyph: '↓', color: '#B3261E', label: 'Worsening' },
  stable: { glyph: '→', color: '#5B6472', label: 'Steady' },
}
const AGING_COLORS = ['#7C9A4E', '#F5B041', '#E0852A', '#B3261E']

// ---------------------------------------------------------------------
// Self-contained styling (matches the page's own STYLES pattern)
// ---------------------------------------------------------------------
const STYLES = `
.pc-root{position:relative;border-radius:18px;padding:18px 20px;margin-bottom:20px;overflow:hidden;
  background:linear-gradient(135deg,#16304C 0%,#1B3A5C 55%,#24506E 100%);
  box-shadow:0 14px 34px rgba(22,48,76,0.22), inset 0 1px 0 rgba(255,255,255,0.08);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  color:#fff;}
.pc-root::before{content:'';position:absolute;inset:0;background:
  radial-gradient(60% 90% at 85% -10%,rgba(245,158,11,0.28),transparent 60%),
  radial-gradient(50% 80% at 8% 110%,rgba(124,154,78,0.25),transparent 60%);pointer-events:none;}
.pc-root::after{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;
  background:linear-gradient(90deg,#7C9A4E,#F5B041,#7C9A4E);background-size:200% 100%;
  animation:pc-shimmer 3.5s linear infinite;pointer-events:none;}
@keyframes pc-shimmer{0%{background-position:0% 0}100%{background-position:200% 0}}

.pc-top{display:flex;align-items:center;gap:14px;position:relative;z-index:1;}
.pc-orb{position:relative;width:52px;height:52px;flex-shrink:0;}
.pc-orb-core{position:absolute;inset:0;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 32% 28%,#F5B041,#D97706);box-shadow:0 6px 18px rgba(245,158,11,0.45);
  font-size:22px;line-height:1;animation:pc-breathe 2.6s ease-in-out infinite;}
@keyframes pc-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
.pc-orb-ring{position:absolute;inset:-7px;border-radius:50%;border:2px dashed rgba(255,255,255,0.35);
  animation:pc-spin 9s linear infinite;}
@keyframes pc-spin{to{transform:rotate(360deg)}}
.pc-orb-pulse{position:absolute;inset:-14px;border-radius:50%;border:1px solid rgba(245,158,11,0.5);
  animation:pc-pulse 2.6s ease-out infinite;opacity:0;}
@keyframes pc-pulse{0%{transform:scale(0.6);opacity:0.7}100%{transform:scale(1.25);opacity:0}}

.pc-head{flex:1;min-width:0;}
.pc-title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;letter-spacing:0.01em;}
.pc-tag{display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:800;letter-spacing:0.09em;
  text-transform:uppercase;border-radius:999px;padding:2px 8px;}
.pc-tag-engine{color:#EAF0E4;background:rgba(124,154,78,0.22);border:1px solid rgba(124,154,78,0.5);}
.pc-sub{font-size:11px;color:rgba(255,255,255,0.72);margin-top:3px;}

.pc-verdict{position:relative;z-index:1;margin-top:16px;min-height:30px;display:flex;align-items:flex-start;gap:10px;}
.pc-verdict-icon{font-size:16px;line-height:1.5;flex-shrink:0;}
.pc-verdict-text{font-size:17px;font-weight:600;line-height:1.45;letter-spacing:-0.005em;}
.pc-caret{display:inline-block;width:2px;height:1.05em;margin-left:2px;background:#F5B041;vertical-align:text-bottom;
  animation:pc-blink 0.85s steps(2,start) infinite;}
@keyframes pc-blink{0%,100%{opacity:1}50%{opacity:0.25}}

.pc-section{position:relative;z-index:1;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.12);}
.pc-section-head{font-size:9px;font-weight:800;letter-spacing:0.09em;text-transform:uppercase;
  color:rgba(255,255,255,0.5);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;}
.pc-section-count{color:rgba(255,255,255,0.4);font-weight:700;}

.pc-scroll{display:flex;flex-direction:column;gap:8px;max-height:250px;overflow-y:auto;padding-right:2px;
  scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.25) transparent;}
.pc-scroll::-webkit-scrollbar{width:6px;}
.pc-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.25);border-radius:999px;}

.pc-flag{display:flex;align-items:flex-start;gap:10px;border-radius:12px;padding:10px 12px;font-size:13px;
  border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(2px);}
.pc-flag-dot{width:9px;height:9px;border-radius:50%;margin-top:4px;flex-shrink:0;}
.pc-flag-body{flex:1;min-width:0;}
.pc-flag-title{font-weight:600;line-height:1.35;}
.pc-flag-detail{font-size:11px;color:rgba(255,255,255,0.68);margin-top:2px;line-height:1.4;}
.pc-flag-tag{flex-shrink:0;align-self:center;font-size:9px;font-weight:800;letter-spacing:0.06em;
  text-transform:uppercase;border-radius:999px;padding:3px 9px;}
.pc-open{flex-shrink:0;align-self:center;font-size:11px;font-weight:700;color:rgba(255,255,255,0.55);
  padding:5px 8px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);cursor:pointer;background:transparent;
  transition:border-color .15s ease,color .15s ease;}
.pc-open:hover{border-color:rgba(245,158,11,0.7);color:#F5B041;}
.pc-flag.clickable{cursor:pointer;}
.pc-flag.clickable:hover{border-color:rgba(245,158,11,0.45);}

.pc-insight{display:flex;align-items:flex-start;gap:10px;border-radius:12px;padding:10px 12px;font-size:13px;
  border:1px solid rgba(255,255,255,0.1);}
.pc-insight.clickable{cursor:pointer;transition:border-color .15s ease;}
.pc-insight.clickable:hover{border-color:rgba(245,158,11,0.45);}
.pc-insight-bullet{font-size:14px;line-height:1.4;flex-shrink:0;margin-top:1px;}
.pc-insight-body{flex:1;min-width:0;}
.pc-insight-title{font-weight:600;line-height:1.4;}
.pc-insight-detail{color:rgba(255,255,255,0.72);line-height:1.4;margin-top:1px;}
.pc-trajectory{display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:800;letter-spacing:0.06em;
  text-transform:uppercase;border-radius:999px;padding:2px 8px;margin-left:8px;vertical-align:middle;}

.pc-aging{margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.12);}
.pc-aging-bar{display:flex;gap:3px;height:34px;border-radius:10px;overflow:hidden;}
.pc-aging-seg{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:56px;
  font-size:10px;font-weight:700;line-height:1.2;color:#fff;flex:1 1 0;overflow:hidden;white-space:nowrap;
  text-shadow:0 1px 2px rgba(0,0,0,0.25);}
.pc-aging-seg.empty{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);text-shadow:none;}
.pc-aging-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;}
.pc-aging-item{font-size:11px;color:rgba(255,255,255,0.7);display:flex;align-items:center;gap:6px;}
.pc-aging-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0;}
.pc-aging-oldest{font-size:11px;color:rgba(255,255,255,0.72);margin-top:8px;}

.pc-ai{margin-top:16px;padding:12px 14px;border-radius:12px;border:1px dashed rgba(245,158,11,0.4);
  background:rgba(245,158,11,0.07);}
.pc-ai-head{display:flex;align-items:center;gap:6px;font-size:9px;font-weight:800;letter-spacing:0.09em;
  text-transform:uppercase;color:#F5B041;margin-bottom:6px;}
.pc-ai-text{font-size:13px;line-height:1.5;color:rgba(255,255,255,0.88);font-style:italic;}

.pc-empty{font-size:12px;color:rgba(255,255,255,0.5);padding:6px 2px;}

@media (prefers-reduced-motion: reduce){
  .pc-root::after,.pc-orb-core,.pc-orb-ring,.pc-orb-pulse,.pc-caret{animation:none;}
}
`

// ---------------------------------------------------------------------
// Typewriter hook
// ---------------------------------------------------------------------
function useTypewriter(text: string, active: boolean, reduced: boolean | null) {
  const [count, setCount] = useState(reduced ? text.length : 0)
  const [done, setDone] = useState(reduced ? true : text.length === 0)

  useEffect(() => {
    setCount(0)
    setDone(text.length === 0)
  }, [text])

  useEffect(() => {
    if (reduced || !active) return
    if (count >= text.length) {
      setDone(true)
      return
    }
    const t = setTimeout(() => setCount((c) => c + 1), 22)
    return () => clearTimeout(t)
  }, [count, text, active, reduced])

  return { display: text.slice(0, count), done }
}

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------
interface PeakCoachPanelProps {
  brief: CoachBrief
  aging?: DebtAging
  aiCommentary?: CoachCommentary | null
  onNavigate?: (studentName: string) => void
}

export function PeakCoachPanel({ brief, aging, aiCommentary, onNavigate }: PeakCoachPanelProps) {
  const reduced = useReducedMotion()

  const [verdictIdx, setVerdictIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [flagVisible, setFlagVisible] = useState(0)

  const verdicts = brief.verdicts.length > 0 ? brief.verdicts : ['Peak Coach is analysing this week.']
  const verdict = verdicts[verdictIdx % verdicts.length]
  const { display, done } = useTypewriter(verdict, !paused, reduced)

  // Cycle verdicts once the current one is fully typed out.
  useEffect(() => {
    if (reduced) return
    if (!done || paused) return
    const t = setTimeout(() => {
      if (verdicts.length > 1) setVerdictIdx((i) => (i + 1) % verdicts.length)
    }, 2600)
    return () => clearTimeout(t)
  }, [done, paused, verdicts.length, reduced])

  // Reset the typewriter + stagger when the data brief changes.
  useEffect(() => {
    setVerdictIdx(0)
    setFlagVisible(0)
  }, [brief])

  // Stagger the follow-up chips in.
  useEffect(() => {
    if (reduced) {
      setFlagVisible(brief.flags.length)
      return
    }
    if (flagVisible >= brief.flags.length) return
    const t = setTimeout(() => setFlagVisible((n) => n + 1), 120)
    return () => clearTimeout(t)
  }, [flagVisible, brief.flags.length, reduced])

  const open = (name?: string) => {
    if (name && onNavigate) onNavigate(name)
  }

  const oldest = aging?.oldest
  const agingBuckets = aging?.buckets ?? []
  const agingTotal = aging?.totalOutstanding ?? 0

  return (
    <div className="pc-root">
      <style>{STYLES}</style>

      <div className="pc-top">
        <div className="pc-orb">
          <div className="pc-orb-pulse" />
          <div className="pc-orb-ring" />
          <div className="pc-orb-core">✦</div>
        </div>
        <div className="pc-head">
          <div className="pc-title">
            Peak Coach
            <span className="pc-tag pc-tag-engine">Deterministic engine</span>
          </div>
          <div className="pc-sub">Follow-up flags, insights and debt age — computed from this week's ledger, refreshed as you log payments.</div>
        </div>
      </div>

      <div className="pc-verdict" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <span className="pc-verdict-icon">✨</span>
        <div className="pc-verdict-text">
          {display}
          {!done && !reduced && <span className="pc-caret" />}
        </div>
      </div>

      {/* Debt age */}
      {agingBuckets.length > 0 && (
        <div className="pc-aging">
          <div className="pc-section-head">
            <span>Debt age · {oldest ? `${oldest.weeks} wk` : 'all current'}</span>
          </div>
          <div className="pc-aging-bar">
            {agingBuckets.map((b, i) => (
              <div
                key={b.key}
                className="pc-aging-seg"
                style={{
                  background: AGING_COLORS[i % AGING_COLORS.length],
                  flex: `${Math.max(1, b.amount)} ${Math.max(1, b.amount)} 0`,
                }}
                title={`${b.label}: ${b.count} account(s), KSh ${b.amount.toLocaleString()}`}
              >
                <span>{b.count}</span>
                <span>KSh {(b.amount / 1000).toFixed(0)}k</span>
              </div>
            ))}
          </div>
          <div className="pc-aging-legend">
            {agingBuckets.map((b, i) => (
              <span key={b.key} className="pc-aging-item">
                <span className="pc-aging-dot" style={{ background: AGING_COLORS[i % AGING_COLORS.length] }} />
                {b.label} · {b.count}
              </span>
            ))}
            <span className="pc-aging-item">
              <span className="pc-aging-dot" style={{ background: 'rgba(255,255,255,0.25)' }} />
              Total KSh {agingTotal.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Follow-up flags — full list, not truncated */}
      <div className="pc-section">
        <div className="pc-section-head">
          <span>Follow-up flags</span>
          <span className="pc-section-count">{brief.flags.length}</span>
        </div>
        {brief.flags.length === 0 ? (
          <p className="pc-empty">No accounts need follow-up this week.</p>
        ) : (
          <div className="pc-scroll">
            <AnimatePresence>
              {brief.flags.slice(0, flagVisible).map((flag) => (
                <motion.div
                  key={flag.id}
                  className={`pc-flag${flag.studentName && onNavigate ? ' clickable' : ''}`}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  style={{ background: TONE_BG[flag.tone], borderColor: `${TONE_COLOR[flag.tone]}55` }}
                  onClick={() => open(flag.studentName)}
                >
                  <span className="pc-flag-dot" style={{ background: TONE_COLOR[flag.tone] }} />
                  <div className="pc-flag-body">
                    <div className="pc-flag-title">{flag.title}</div>
                    {flag.detail && <div className="pc-flag-detail">{flag.detail}</div>}
                  </div>
                  <span className="pc-flag-tag" style={{ color: TONE_COLOR[flag.tone], background: `${TONE_COLOR[flag.tone]}18` }}>
                    {TONE_LABEL[flag.tone]}
                  </span>
                  {flag.studentName && onNavigate && <span className="pc-open">Open</span>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Insights — full list, each links to its student when it has one */}
      <div className="pc-section">
        <div className="pc-section-head">
          <span>Coach insights</span>
          <span className="pc-section-count">{brief.insights.length}</span>
        </div>
        {brief.insights.length === 0 ? (
          <p className="pc-empty">Keep logging payments — insights appear as trends build.</p>
        ) : (
          <div className="pc-scroll">
            {brief.insights.map((insight) => {
              const traj = insight.trajectory ? TRAJECTORY[insight.trajectory] : undefined
              return (
                <div
                  key={insight.id}
                  className={`pc-insight${insight.studentName && onNavigate ? ' clickable' : ''}`}
                  style={{ background: TONE_BG[insight.tone], borderColor: `${TONE_COLOR[insight.tone]}40` }}
                  onClick={() => open(insight.studentName)}
                >
                  <span className="pc-insight-bullet" style={{ color: TONE_COLOR[insight.tone] }}>•</span>
                  <div className="pc-insight-body">
                    <div className="pc-insight-title" style={{ color: TONE_COLOR[insight.tone] }}>
                      {insight.title}
                      {traj && (
                        <span
                          className="pc-trajectory"
                          style={{ color: traj.color, background: `${traj.color}20`, border: `1px solid ${traj.color}55` }}
                          title={traj.label}
                        >
                          {traj.glyph} {traj.label}
                        </span>
                      )}
                    </div>
                    {insight.detail && <div className="pc-insight-detail">{insight.detail}</div>}
                  </div>
                  {insight.studentName && onNavigate && <span className="pc-open">Open</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI commentary — always separate from the deterministic brief */}
      {aiCommentary && aiCommentary.text && (
        <div className="pc-ai">
          <div className="pc-ai-head">
            <span>✦</span> AI commentary{aiCommentary.provider ? ` · ${aiCommentary.provider}` : ''}
          </div>
          <p className="pc-ai-text">{aiCommentary.text}</p>
        </div>
      )}
    </div>
  )
}
