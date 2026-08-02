'use client'

/**
 * PeakCoachPanel — the "alive" analytics strip for the weekly payments page.
 *
 * Given a pure CoachBrief (verdicts, flags, insights — see lib/weekly-insights),
 * it renders a pulsing coach orb, a typewriter verdict that cycles, follow-up
 * reminder chips that stagger in, and a live insight ticker. All motion is
 * cosmetic: it defers entirely to the computed brief, so nothing here mutates
 * data.
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { CoachBrief, CoachTone } from '@/lib/weekly-insights'

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
.pc-live{display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:800;letter-spacing:0.09em;
  text-transform:uppercase;color:#EAF0E4;background:rgba(124,154,78,0.22);border:1px solid rgba(124,154,78,0.5);
  border-radius:999px;padding:2px 8px;}
.pc-live-dot{width:6px;height:6px;border-radius:50%;background:#7C9A4E;animation:pc-blink 1.1s steps(2,start) infinite;}
@keyframes pc-blink{0%,100%{opacity:1}50%{opacity:0.25}}
.pc-sub{font-size:11px;color:rgba(255,255,255,0.72);margin-top:3px;}

.pc-verdict{position:relative;z-index:1;margin-top:16px;min-height:30px;display:flex;align-items:flex-start;gap:10px;}
.pc-verdict-icon{font-size:16px;line-height:1.5;flex-shrink:0;}
.pc-verdict-text{font-size:17px;font-weight:600;line-height:1.45;letter-spacing:-0.005em;}
.pc-caret{display:inline-block;width:2px;height:1.05em;margin-left:2px;background:#F5B041;vertical-align:text-bottom;
  animation:pc-blink 0.85s steps(2,start) infinite;}

.pc-flags{position:relative;z-index:1;margin-top:16px;display:flex;flex-direction:column;gap:8px;}
.pc-flag{display:flex;align-items:flex-start;gap:10px;border-radius:12px;padding:10px 12px;font-size:13px;
  border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(2px);}
.pc-flag-dot{width:9px;height:9px;border-radius:50%;margin-top:4px;flex-shrink:0;}
.pc-flag-body{flex:1;min-width:0;}
.pc-flag-title{font-weight:600;line-height:1.35;}
.pc-flag-detail{font-size:11px;color:rgba(255,255,255,0.68);margin-top:2px;line-height:1.4;}
.pc-flag-tag{flex-shrink:0;align-self:center;font-size:9px;font-weight:800;letter-spacing:0.06em;
  text-transform:uppercase;border-radius:999px;padding:3px 9px;}

.pc-ticker{position:relative;z-index:1;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.12);
  min-height:44px;}
.pc-ticker-head{font-size:9px;font-weight:800;letter-spacing:0.09em;text-transform:uppercase;
  color:rgba(255,255,255,0.5);margin-bottom:8px;display:flex;align-items:center;gap:6px;}
.pc-ticker-bar{display:flex;gap:4px;}
.pc-ticker-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.25);transition:background .25s ease;}
.pc-ticker-dot.on{background:#F5B041;}
.pc-insight{display:flex;align-items:flex-start;gap:10px;font-size:13px;}
.pc-insight-bullet{font-size:14px;line-height:1.4;flex-shrink:0;}
.pc-insight-title{font-weight:600;line-height:1.4;}
.pc-insight-detail{color:rgba(255,255,255,0.72);line-height:1.4;margin-top:1px;}

@media (prefers-reduced-motion: reduce){
  .pc-root::after,.pc-orb-core,.pc-orb-ring,.pc-orb-pulse,.pc-live-dot,.pc-caret{animation:none;}
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
export function PeakCoachPanel({ brief }: { brief: CoachBrief }) {
  const reduced = useReducedMotion()

  const [verdictIdx, setVerdictIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [flagVisible, setFlagVisible] = useState(0)
  const [insightIdx, setInsightIdx] = useState(0)

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
    setInsightIdx(0)
  }, [brief])

  // Stagger the reminder chips in.
  useEffect(() => {
    if (reduced) {
      setFlagVisible(brief.flags.length)
      return
    }
    if (flagVisible >= brief.flags.length) return
    const t = setTimeout(() => setFlagVisible((n) => n + 1), 320)
    return () => clearTimeout(t)
  }, [flagVisible, brief.flags.length, reduced])

  // Rotate the insight ticker.
  useEffect(() => {
    if (brief.insights.length <= 1 || reduced) return
    const t = setTimeout(() => setInsightIdx((i) => (i + 1) % brief.insights.length), 5200)
    return () => clearTimeout(t)
  }, [insightIdx, brief.insights.length, reduced])

  const flags = brief.flags.slice(0, 6)
  const insight = brief.insights[insightIdx % Math.max(1, brief.insights.length)]

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
            <span className="pc-live"><span className="pc-live-dot" />Live</span>
          </div>
          <div className="pc-sub">Analysing payments in real time — flags refresh as you log each one.</div>
        </div>
      </div>

      <div className="pc-verdict" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <span className="pc-verdict-icon">✨</span>
        <div className="pc-verdict-text">
          {display}
          {!done && !reduced && <span className="pc-caret" />}
        </div>
      </div>

      {flags.length > 0 && (
        <div className="pc-flags">
          <AnimatePresence>
            {flags.slice(0, flagVisible).map((flag) => (
              <motion.div
                key={flag.id}
                className="pc-flag"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ background: TONE_BG[flag.tone], borderColor: `${TONE_COLOR[flag.tone]}55` }}
              >
                <span className="pc-flag-dot" style={{ background: TONE_COLOR[flag.tone] }} />
                <div className="pc-flag-body">
                  <div className="pc-flag-title">{flag.title}</div>
                  {flag.detail && <div className="pc-flag-detail">{flag.detail}</div>}
                </div>
                <span className="pc-flag-tag" style={{ color: TONE_COLOR[flag.tone], background: `${TONE_COLOR[flag.tone]}18` }}>
                  {TONE_LABEL[flag.tone]}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {insight && (
        <div className="pc-ticker">
          <div className="pc-ticker-head">
            Coach insights
            <span className="pc-ticker-bar">
              {brief.insights.map((_, i) => (
                <span key={i} className={`pc-ticker-dot${i === insightIdx % brief.insights.length ? ' on' : ''}`} />
              ))}
            </span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={insight.id}
              className="pc-insight"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
            >
              <span className="pc-insight-bullet" style={{ color: TONE_COLOR[insight.tone] }}>•</span>
              <div>
                <div className="pc-insight-title" style={{ color: TONE_COLOR[insight.tone] }}>{insight.title}</div>
                {insight.detail && <div className="pc-insight-detail">{insight.detail}</div>}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
