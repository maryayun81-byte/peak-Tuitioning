'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  playLobbyMusic,
  playMatchmakingMusic,
  playBattleMusic,
  playCountdown,
  playVictory,
  playDefeat,
  playDraw,
  stopAll,
  setMasterDestination,
  type AudioNodeRef,
} from '@/lib/duel-soundtrack'

type Mode = 'lobby' | 'matchmaking' | 'battle'

const ENABLED_KEY = 'peak_duel_music_enabled'
const VOLUME_KEY  = 'peak_duel_music_volume'
const DEFAULT_VOLUME = 0.25

// ─────────────────────────────────────────────────────────────────────────────
// TRUE SINGLETON ENGINE
// One AudioContext, one GainNode, one set of sources — for the entire browser tab.
// A generation counter ensures any async play() that was superseded is discarded.
// ─────────────────────────────────────────────────────────────────────────────

let _ctx:    AudioContext | null = null
let _master: GainNode    | null = null
let _refs:   AudioNodeRef[]     = []
let _generation = 0            // increments every time we want to start/stop
let _activeMode: Mode | null    = null

function getCtx(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new AudioContext()
    _master = null
  }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {})
  return _ctx
}

 function ensureMaster(volume: number): GainNode {
  const ctx = getCtx()
  if (!_master || _master.context !== ctx) {
    _master = ctx.createGain()
    _master.gain.value = volume
    _master.connect(ctx.destination)
    setMasterDestination(_master)
  }
  return _master
}

/** Stop all currently playing sources and clear the ref list. */
function stopSources() {
  stopAll(_refs)
  _refs = []
}

/** Fully close and destroy the audio engine. Called when leaving the duel page. */
function destroyEngine() {
  _generation++           // invalidates any in-flight startMusic promises
  stopSources()
  _activeMode = null
  setMasterDestination(null)
  if (_ctx && _ctx.state !== 'closed') {
    _ctx.close().catch(() => {})
  }
  _ctx    = null
  _master = null
}

/** Set master gain. Safe to call at any time. */
function applyVolume(volume: number) {
  if (_master && _ctx && _ctx.state !== 'closed') {
    _master.gain.setTargetAtTime(volume, _ctx.currentTime, 0.06)
  }
}

/**
 * Start music for the given mode.
 * Uses a generation counter — if a newer call arrives while this one is awaiting,
 * this call discards its nodes and exits silently.
 */
async function startMusic(mode: Mode, volume: number): Promise<void> {
  if (_activeMode === mode) return   // already playing this exact mode

  const gen = ++_generation          // claim this generation
  stopSources()                      // kill old audio immediately (sync)
  _activeMode = mode

  try {
    const ctx = getCtx()
    ensureMaster(volume)

    const nodes =
      mode === 'battle'      ? await playBattleMusic(ctx) :
      mode === 'matchmaking' ? await playMatchmakingMusic(ctx) :
      await playLobbyMusic(ctx)

    // If generation changed while we were awaiting, discard these nodes
    if (_generation !== gen) {
      stopAll(nodes)
      return
    }

    _refs.push(...nodes)
  } catch { /* Web Audio blocked or unavailable */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  mode: Mode
  timeRemaining?: number
  result?: 'victory' | 'defeat' | 'draw' | null
}

export function DuelAudio({ mode, timeRemaining, result }: Props) {
  // Default: ON unless user explicitly turned it off
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const v = localStorage.getItem(ENABLED_KEY)
    return v === null ? true : v === 'true'
  })
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_VOLUME
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '')
    return isFinite(v) ? v : DEFAULT_VOLUME
  })
  const [muted, setMuted]       = useState(false)
  const [showVolume, setShowVolume] = useState(false)

  const prevResultRef = useRef<typeof result>(undefined)
  const prevTimeRef   = useRef<number | undefined>(undefined)

  // Persist prefs
  useEffect(() => { localStorage.setItem(ENABLED_KEY, String(enabled)) }, [enabled])
  useEffect(() => { localStorage.setItem(VOLUME_KEY,  String(volume))  }, [volume])

  // ── Unmount only: full engine teardown (navigation away) ──────────────────
  useEffect(() => {
    return () => { destroyEngine() }
  }, []) // empty deps = runs cleanup ONLY on component unmount

  // ── Start / stop on enabled or mode change ──────────────────────────────
  useEffect(() => {
    if (!enabled) {
      _generation++   // kill any in-flight starts
      stopSources()
      _activeMode = null
      return
    }
    startMusic(mode, muted ? 0 : volume)
    // NO cleanup here — mode changes just call startMusic which synchronously
    // stops old audio via stopSources() before starting new audio.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mode])

  // ── Volume / mute changes — only adjusts gain, never restarts ───────────
  useEffect(() => {
    if (!enabled) return
    applyVolume(muted ? 0 : volume)
    // Also update master's initial value so new gain nodes start correct
    if (_master) _master.gain.value = muted ? 0 : volume
  }, [volume, muted, enabled])

  // ── Countdown cue ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || timeRemaining === undefined) return
    const prev = prevTimeRef.current
    prevTimeRef.current = timeRemaining

    if (timeRemaining <= 30 && (prev === undefined || prev > 30)) {
      const gen = ++_generation
      stopSources()
      _activeMode = null
      const ctx = getCtx()
      playCountdown(ctx).then(nodes => {
        if (_generation === gen) _refs.push(...nodes)
        else stopAll(nodes)
      }).catch(() => {})
    } else if (timeRemaining > 30 && prev !== undefined && prev <= 30) {
      _activeMode = null  // allow restart
      startMusic(mode, muted ? 0 : volume)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining])

  // ── Result sounds ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !result || prevResultRef.current === result) return
    prevResultRef.current = result

    const ctx = getCtx()
    const vol = muted ? 0 : volume
    if (_master) _master.gain.setTargetAtTime(vol * 0.3, ctx.currentTime, 0.2)

    const play =
      result === 'victory' ? playVictory(ctx) :
      result === 'defeat'  ? playDefeat(ctx)  :
      playDraw(ctx)

    play.then(nodes => {
      _refs.push(...nodes)
      setTimeout(() => applyVolume(vol), 2000)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  // ── Tab visibility — duck audio when hidden ──────────────────────────────
  useEffect(() => {
    if (!enabled) return
    const handle = () => {
      if (muted) return
      applyVolume(document.hidden ? 0 : volume)
    }
    document.addEventListener('visibilitychange', handle)
    return () => document.removeEventListener('visibilitychange', handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, volume, muted])

  // ─────────────────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {/* Disabled state — invite to enable */}
        {!enabled && (
          <motion.button
            key="enable"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={() => setEnabled(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg border transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
              color: 'white',
              borderColor: 'rgba(255,255,255,0.15)',
            }}
          >
            <span>♪</span> Enable Duel Music
          </motion.button>
        )}

        {/* Active controls */}
        {enabled && (
          <motion.div
            key="controls"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1 rounded-full shadow-lg border px-2 py-1 select-none"
            style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
          >
            {/* Mute/unmute — only touches gain, never restarts audio */}
            <button
              onClick={() => setMuted(m => !m)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 shrink-0 text-base"
              style={{ color: muted ? 'var(--text-muted)' : 'var(--primary)' }}
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? '🔇' : '🎵'}
            </button>

            {/* Volume slider toggle + input */}
            <div className="flex items-center gap-1.5 px-1">
              <button
                onClick={() => setShowVolume(v => !v)}
                className="shrink-0 text-xs"
                style={{ color: 'var(--text-muted)' }}
                title="Volume"
              >
                🔊
              </button>
              <AnimatePresence>
                {showVolume && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 72, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={volume}
                      onChange={e => {
                        const v = parseFloat(e.target.value)
                        setVolume(v)
                        if (muted && v > 0) setMuted(false) // auto-unmute on slider move
                      }}
                      className="w-full h-1 rounded-full cursor-pointer"
                      style={{ accentColor: '#8B5CF6' }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Turn off entirely */}
            <button
              onClick={() => {
                setEnabled(false)
                _generation++
                stopSources()
                _activeMode = null
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110"
              style={{ color: 'var(--text-muted)' }}
              title="Turn off music"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
