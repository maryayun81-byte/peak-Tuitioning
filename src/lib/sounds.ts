/**
 * High-quality notification sound synthesis using Web Audio API.
 * Avoids dependencies on external MP3 files and allows real-time customization.
 */

export type SoundProfile = 'achievement' | 'assignment' | 'intel' | 'news' | 'default'
export type SoundVariant = 'classic' | 'crystal' | 'sparkle' | 'vibrant'

export function playGeneratedSound(profile: SoundProfile = 'default', variant: SoundVariant = 'classic') {
  if (typeof window === 'undefined') return

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    
    const ctx = new AudioContext()
    const now = ctx.currentTime

    // Default parameters
    let frequencies = [440, 880]
    let type: OscillatorType = 'sine'
    let duration = 0.2
    let release = 0.2
    let gainValue = 0.1

    // Apply Variant adjustments
    if (variant === 'crystal') {
      type = 'sine'
      gainValue = 0.08
      frequencies = frequencies.map(f => f * 1.5)
    } else if (variant === 'sparkle') {
      type = 'triangle'
      duration = 0.4
      release = 0.5
    } else if (variant === 'vibrant') {
      type = 'square'
      gainValue = 0.05
      duration = 0.15
    }

    // Apply Profile characteristics
    switch (profile) {
      case 'achievement':
        // Uplifting arpeggio: C5 -> E5 -> G5 -> C6
        playArpeggio(ctx, [523.25, 659.25, 783.99, 1046.50], type, gainValue, variant)
        return
      case 'assignment':
        // Vibrant double chime: A5 -> E6
        playArpeggio(ctx, [880, 1318.51], type, gainValue, variant)
        return
      case 'intel':
        // Subtle focus tone: F5
        frequencies = [698.46]
        duration = 0.3
        break
      case 'news':
        // Broadcast pulse: D5 -> D4
        playArpeggio(ctx, [587.33, 293.66], type, gainValue, variant)
        return
      default:
        // Standard ping: A5
        frequencies = [880]
    }

    // Standard single note player
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = type
      osc.frequency.setValueAtTime(freq, now + (i * 0.05))
      
      gain.gain.setValueAtTime(gainValue, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration + release)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start(now + (i * 0.05))
      osc.stop(now + duration + release + i * 0.05)
    })

  } catch (e) {
    console.warn('Audio synthesis failed', e)
  }
}

function playArpeggio(ctx: AudioContext, notes: number[], type: OscillatorType, gainValue: number, variant: SoundVariant) {
  const now = ctx.currentTime
  const noteDuration = 0.1
  
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = type
    
    // Slight detune for sparkle
    if (variant === 'sparkle') {
      osc.detune.setValueAtTime(i * 5, now)
    }

    osc.frequency.setValueAtTime(freq, now + (i * noteDuration))
    
    gain.gain.setValueAtTime(0, now + (i * noteDuration))
    gain.gain.linearRampToValueAtTime(gainValue, now + (i * noteDuration) + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.01, now + (i * noteDuration) + 0.3)
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.start(now + (i * noteDuration))
    osc.stop(now + (i * noteDuration) + 0.4)
  })
}
