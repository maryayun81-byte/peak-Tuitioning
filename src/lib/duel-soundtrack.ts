/**
 * Peak Duel Soundtrack Engine
 *
 * MP3-first: loads real audio files from /public/audio/duels/.
 * Falls back to procedural Web Audio API generation when files are missing.
 *
 * STOP CONTRACT: every stop() call must silence audio IMMEDIATELY (< 5ms).
 * We achieve this by keeping a reference to the local master GainNode and
 * setting its gain to 0 synchronously, before any node.stop() calls.
 */

// ── Types ────────────────────────────────────────────────────
export type AudioNodeRef = { stop: () => void }

/** Optional master gain — if set, all killswitches connect through it instead of ctx.destination. */
let _masterDestination: GainNode | null = null
export function setMasterDestination(node: GainNode | null) {
  _masterDestination = node
}

interface TrackFile { path: string }

const TRACKS: Record<string, TrackFile> = {
  lobby:       { path: '/audio/duels/lobby-loop.mp3'    },
  matchmaking: { path: '/audio/duels/matchmaking-loop.mp3' },
  battle:      { path: '/audio/duels/duel-battle-loop.mp3' },
  countdown:   { path: '/audio/duels/final-countdown.mp3'  },
  victory:     { path: '/audio/duels/victory.mp3'          },
  defeat:      { path: '/audio/duels/defeat.mp3'           },
  draw:        { path: '/audio/duels/draw.mp3'             },
}

// ── File existence cache ─────────────────────────────────────
const existsCache = new Map<string, boolean>()
async function trackAvailable(key: string): Promise<boolean> {
  if (existsCache.has(key)) return existsCache.get(key)!
  try {
    const r = await fetch(TRACKS[key]?.path ?? '', { method: 'HEAD' })
    existsCache.set(key, r.ok)
    return r.ok
  } catch { existsCache.set(key, false); return false }
}

// ── Load audio buffer ────────────────────────────────────────
async function loadBuffer(ctx: AudioContext, key: string): Promise<AudioBuffer | null> {
  try {
    const r = await fetch(TRACKS[key].path)
    if (!r.ok) return null
    return ctx.decodeAudioData(await r.arrayBuffer())
  } catch { return null }
}

// ── INSTANT SILENCE helper ───────────────────────────────────
// Call this on a GainNode to cut audio immediately with a tiny
// 5ms ramp (avoids a click) then clean up.
function instantSilence(g: GainNode, ctx: AudioContext) {
  try { g.gain.cancelScheduledValues(ctx.currentTime) } catch {}
  try { g.gain.setTargetAtTime(0, ctx.currentTime, 0.005) } catch {}
}

// ── MP3 looping playback ─────────────────────────────────────
function playLooping(ctx: AudioContext, buffer: AudioBuffer, master: GainNode): AudioNodeRef {
  let src: AudioBufferSourceNode | null = null
  try {
    src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    src.connect(master)
    src.start()
  } catch {}
  return {
    stop() {
      instantSilence(master, ctx)
      try { src?.stop() } catch {}
      src = null
    }
  }
}

// ── MP3 one-shot ─────────────────────────────────────────────
function playOnce(ctx: AudioContext, buffer: AudioBuffer, master: GainNode): AudioNodeRef {
  let src: AudioBufferSourceNode | null = null
  try {
    src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(master)
    src.start()
  } catch {}
  return {
    stop() {
      instantSilence(master, ctx)
      try { src?.stop() } catch {}
      src = null
    }
  }
}

// ── Reverb ───────────────────────────────────────────────────
function buildReverb(ctx: AudioContext, wet = 0.25) {
  const input = ctx.createGain()
  const output = ctx.createGain()
  const wetG = ctx.createGain(); wetG.gain.value = wet
  const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 3500
  for (const d of [{ t: 0.03, fb: 0.35 }, { t: 0.07, fb: 0.2 }, { t: 0.14, fb: 0.12 }]) {
    const delay = ctx.createDelay(1); delay.delayTime.value = d.t
    const fb = ctx.createGain(); fb.gain.value = d.fb
    input.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(flt)
  }
  flt.connect(wetG); wetG.connect(output)
  return { input, output }
}

// ── Make a per-track killswitch gain ─────────────────────────
// Every procedural track routes through this so stop() can
// silence instantly without hunting for every oscillator.
function makeKillswitch(ctx: AudioContext, vol: number): GainNode {
  const g = ctx.createGain(); g.gain.value = vol; g.connect(_masterDestination ?? ctx.destination)
  return g
}

// ── Interval manager ─────────────────────────────────────────
// Keeps track of setInterval IDs so we can clear them all at once.
function makeIntervalSet() {
  const ids: ReturnType<typeof setInterval>[] = []
  return {
    add: (id: ReturnType<typeof setInterval>) => ids.push(id),
    clear: () => { ids.forEach(clearInterval); ids.length = 0 },
  }
}

// ── LOBBY ─────────────────────────────────────────────────────
export async function playLobbyMusic(ctx: AudioContext): Promise<AudioNodeRef[]> {
  const ok = await trackAvailable('lobby')
  if (ok) {
    const buf = await loadBuffer(ctx, 'lobby')
    if (buf) {
      const g = makeKillswitch(ctx, 1)
      const ref = playLooping(ctx, buf, g)
      return [{ stop() { ref.stop(); try { g.disconnect() } catch {} } }]
    }
  }

  // ── Procedural fallback ──────────────────────────────────────
  const kill = makeKillswitch(ctx, 0.035)
  const verb = buildReverb(ctx, 0.3); verb.output.connect(kill)
  const ivs = makeIntervalSet()
  const oscs: OscillatorNode[] = []

  // Drone pads
  ;[261.63, 329.63, 392.00, 466.16, 523.25].forEach((f, i) => {
    if (ctx.state === 'closed') return
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06 + i * 0.015
    const lm = ctx.createGain(); lm.gain.value = 0.12
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, ctx.currentTime)
    g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 2.5)
    lfo.connect(lm); lm.connect(g.gain); lfo.start()
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 500 + i * 150
    osc.connect(flt); flt.connect(g); g.connect(verb.input); osc.start()
    oscs.push(osc, lfo)
  })

  // Arpeggio
  const arp = [261.63, 392.00, 523.25, 659.25, 783.99, 523.25, 392.00]; let ai = 0
  ivs.add(setInterval(() => {
    if (ctx.state === 'closed') return
    const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = arp[ai++ % arp.length]
    const g = ctx.createGain(); g.gain.setValueAtTime(0.07, ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7)
    const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 1200 + (ai % 3) * 400; flt.Q.value = 2
    osc.connect(flt); flt.connect(g); g.connect(verb.input); osc.start(); osc.stop(ctx.currentTime + 0.75)
  }, 700))

  // Bass thud
  ivs.add(setInterval(() => {
    if (ctx.state === 'closed') return
    const osc = ctx.createOscillator(); osc.type = 'sine'
    osc.frequency.setValueAtTime(60, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.1)
    const g = ctx.createGain(); g.gain.setValueAtTime(0.08, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.connect(g); g.connect(kill); osc.start(); osc.stop(ctx.currentTime + 0.15)
  }, 750))

  // Hi-hat
  ivs.add(setInterval(() => {
    if (ctx.state === 'closed') return
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource(); src.buffer = buf
    const g = ctx.createGain(); g.gain.setValueAtTime(0.015, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
    const flt = ctx.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = 8000
    src.connect(flt); flt.connect(g); g.connect(kill); src.start()
  }, 375))

  return [{
    stop() {
      ivs.clear()
      instantSilence(kill, ctx)
      oscs.forEach(o => { try { o.stop() } catch {} })
    }
  }]
}

// ── MATCHMAKING ────────────────────────────────────────────────
export async function playMatchmakingMusic(ctx: AudioContext): Promise<AudioNodeRef[]> {
  const ok = await trackAvailable('matchmaking')
  if (ok) {
    const buf = await loadBuffer(ctx, 'matchmaking')
    if (buf) {
      const g = makeKillswitch(ctx, 1)
      const ref = playLooping(ctx, buf, g)
      return [{ stop() { ref.stop(); try { g.disconnect() } catch {} } }]
    }
  }

  const kill = makeKillswitch(ctx, 0.04)
  const verb = buildReverb(ctx, 0.25); verb.output.connect(kill)
  const ivs = makeIntervalSet()
  const oscs: OscillatorNode[] = []

  ;[196.00, 261.63, 329.63, 392.00].forEach((f, i) => {
    if (ctx.state === 'closed') return
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.02
    const lm = ctx.createGain(); lm.gain.value = 0.1
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2)
    lfo.connect(lm); lm.connect(g.gain); lfo.start()
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 400 + i * 200
    osc.connect(flt); flt.connect(g); g.connect(verb.input); osc.start()
    oscs.push(osc, lfo)
  })

  ivs.add(setInterval(() => {
    if (ctx.state === 'closed') return
    const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 60
    const g = ctx.createGain(); g.gain.setValueAtTime(0.06, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    osc.connect(g); g.connect(kill); osc.start(); osc.stop(ctx.currentTime + 0.2)
  }, 500))

  return [{
    stop() {
      ivs.clear()
      instantSilence(kill, ctx)
      oscs.forEach(o => { try { o.stop() } catch {} })
    }
  }]
}

// ── BATTLE ────────────────────────────────────────────────────
export async function playBattleMusic(ctx: AudioContext): Promise<AudioNodeRef[]> {
  const ok = await trackAvailable('battle')
  if (ok) {
    const buf = await loadBuffer(ctx, 'battle')
    if (buf) {
      const g = makeKillswitch(ctx, 1)
      const ref = playLooping(ctx, buf, g)
      return [{ stop() { ref.stop(); try { g.disconnect() } catch {} } }]
    }
  }

  const kill = makeKillswitch(ctx, 0.05)
  const verb = buildReverb(ctx, 0.2); verb.output.connect(kill)
  const ivs = makeIntervalSet()
  const oscs: OscillatorNode[] = []

  // Kick + snare
  ivs.add(setInterval(() => {
    if (ctx.state === 'closed') return
    const now = ctx.currentTime
    const kick = ctx.createOscillator(); kick.type = 'sine'
    kick.frequency.setValueAtTime(120, now); kick.frequency.exponentialRampToValueAtTime(40, now + 0.08)
    const kg = ctx.createGain(); kg.gain.setValueAtTime(0.18, now); kg.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
    kick.connect(kg); kg.connect(kill); kick.start(now); kick.stop(now + 0.2)
  }, 214))

  // Bass line
  const bassPattern = [196.00, 196.00, 220.00, 246.94, 220.00, 196.00, 174.61, 164.81]; let bi = 0
  ivs.add(setInterval(() => {
    if (ctx.state === 'closed') return
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = bassPattern[bi++ % bassPattern.length]
    const g = ctx.createGain(); g.gain.setValueAtTime(0.1, ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 250
    osc.connect(flt); flt.connect(g); g.connect(kill); osc.start(); osc.stop(ctx.currentTime + 0.42)
  }, 214))

  // Melody
  const melody = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 0, 587.33, 698.46, 783.99, 880.00, 783.99, 659.25, 587.33, 0]; let mi = 0
  ivs.add(setInterval(() => {
    if (ctx.state === 'closed') return
    const n = melody[mi++ % melody.length]; if (n === 0) return
    const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = n
    const g = ctx.createGain(); g.gain.setValueAtTime(0.035, ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25)
    const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 1800; flt.Q.value = 3
    osc.connect(flt); flt.connect(g); g.connect(verb.input); osc.start(); osc.stop(ctx.currentTime + 0.28)
  }, 214))

  // Sustained bass drones
  ;[261.63, 329.63, 392.00].forEach((f, i) => {
    if (ctx.state === 'closed') return
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f
    const g = ctx.createGain(); g.gain.value = 0.06
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 150 + i * 80
    const sweep = ctx.createOscillator(); sweep.frequency.value = 0.05
    const sm = ctx.createGain(); sm.gain.value = 800
    sweep.connect(sm); sm.connect(flt.frequency); sweep.start()
    osc.connect(flt); flt.connect(g); g.connect(verb.input); osc.start()
    oscs.push(osc, sweep)
  })

  return [{
    stop() {
      ivs.clear()
      instantSilence(kill, ctx)
      oscs.forEach(o => { try { o.stop() } catch {} })
    }
  }]
}

// ── COUNTDOWN ─────────────────────────────────────────────────
export async function playCountdown(ctx: AudioContext, fadeInDuration = 1): Promise<AudioNodeRef[]> {
  const ok = await trackAvailable('countdown')
  if (ok) {
    const buf = await loadBuffer(ctx, 'countdown')
    if (buf) {
      const g = makeKillswitch(ctx, 0.8)
      const ref = playLooping(ctx, buf, g)
      return [{ stop() { ref.stop(); try { g.disconnect() } catch {} } }]
    }
  }

  const kill = makeKillswitch(ctx, 0)
  kill.gain.linearRampToValueAtTime(0.04, ctx.currentTime + fadeInDuration)
  const ivs = makeIntervalSet()
  const oscs: OscillatorNode[] = []

  let tickCount = 0
  ivs.add(setInterval(() => {
    if (ctx.state === 'closed') return
    const n = ctx.currentTime
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = tickCount < 5 ? 800 : 1000
    const g = ctx.createGain(); g.gain.setValueAtTime(0.08, n); g.gain.exponentialRampToValueAtTime(0.001, n + 0.08)
    osc.connect(g); g.connect(kill); osc.start(); osc.stop(n + 0.08); tickCount++
  }, 1000))

  const drone = ctx.createOscillator(); drone.type = 'sawtooth'
  drone.frequency.setValueAtTime(110, ctx.currentTime); drone.frequency.linearRampToValueAtTime(220, ctx.currentTime + 30)
  const dg = ctx.createGain(); dg.gain.value = 0.03
  const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 400
  drone.connect(df); df.connect(dg); dg.connect(kill); drone.start()
  oscs.push(drone)

  return [{
    stop() {
      ivs.clear()
      instantSilence(kill, ctx)
      oscs.forEach(o => { try { o.stop() } catch {} })
    }
  }]
}

// ── VICTORY ───────────────────────────────────────────────────
export async function playVictory(ctx: AudioContext): Promise<AudioNodeRef[]> {
  const ok = await trackAvailable('victory')
  if (ok) {
    const buf = await loadBuffer(ctx, 'victory')
    if (buf) {
      const g = makeKillswitch(ctx, 0.8)
      const ref = playOnce(ctx, buf, g)
      return [{ stop() { ref.stop(); try { g.disconnect() } catch {} } }]
    }
  }
  const kill = makeKillswitch(ctx, 0.08)
  const verb = buildReverb(ctx, 0.4); verb.output.connect(kill)
  const oscs: OscillatorNode[] = []
  ;[261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
    const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = f
    const g = ctx.createGain(); const s = ctx.currentTime + i * 0.08
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.2, s + 0.05); g.gain.linearRampToValueAtTime(0, s + 0.6)
    osc.connect(g); g.connect(verb.input); osc.start(s); osc.stop(s + 0.65)
    oscs.push(osc)
  })
  return [{ stop() { instantSilence(kill, ctx); oscs.forEach(o => { try { o.stop() } catch {} }) } }]
}

// ── DEFEAT ────────────────────────────────────────────────────
export async function playDefeat(ctx: AudioContext): Promise<AudioNodeRef[]> {
  const ok = await trackAvailable('defeat')
  if (ok) {
    const buf = await loadBuffer(ctx, 'defeat')
    if (buf) {
      const g = makeKillswitch(ctx, 0.8)
      const ref = playOnce(ctx, buf, g)
      return [{ stop() { ref.stop(); try { g.disconnect() } catch {} } }]
    }
  }
  const kill = makeKillswitch(ctx, 0.05)
  const verb = buildReverb(ctx, 0.3); verb.output.connect(kill)
  const oscs: OscillatorNode[] = []
  ;[392.00, 349.23, 329.63, 261.63].forEach((f, i) => {
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f
    const g = ctx.createGain(); const s = ctx.currentTime + i * 0.15
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.12, s + 0.05); g.gain.linearRampToValueAtTime(0, s + 0.5)
    osc.connect(g); g.connect(verb.input); osc.start(s); osc.stop(s + 0.55)
    oscs.push(osc)
  })
  return [{ stop() { instantSilence(kill, ctx); oscs.forEach(o => { try { o.stop() } catch {} }) } }]
}

// ── DRAW ──────────────────────────────────────────────────────
export async function playDraw(ctx: AudioContext): Promise<AudioNodeRef[]> {
  const ok = await trackAvailable('draw')
  if (ok) {
    const buf = await loadBuffer(ctx, 'draw')
    if (buf) {
      const g = makeKillswitch(ctx, 0.8)
      const ref = playOnce(ctx, buf, g)
      return [{ stop() { ref.stop(); try { g.disconnect() } catch {} } }]
    }
  }
  const kill = makeKillswitch(ctx, 0.04)
  const oscs: OscillatorNode[] = []
  ;[392.00, 523.25, 392.00].forEach((f, i) => {
    const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = f
    const g = ctx.createGain(); const s = ctx.currentTime + i * 0.12
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.1, s + 0.04); g.gain.linearRampToValueAtTime(0, s + 0.4)
    osc.connect(g); g.connect(kill); osc.start(s); osc.stop(s + 0.45)
    oscs.push(osc)
  })
  return [{ stop() { instantSilence(kill, ctx); oscs.forEach(o => { try { o.stop() } catch {} }) } }]
}

// ── STOP HELPER ───────────────────────────────────────────────
export function stopAll(refs: AudioNodeRef[]) {
  refs.forEach(r => { try { r.stop() } catch {} })
  refs.length = 0
}
