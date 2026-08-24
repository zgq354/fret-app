import { configureAudioSession } from '../audio/audioSession'
import { midiToFrequency } from '../music/musicTheory'
import type {
  InstrumentDriver,
  PlaybackBackend,
} from './instrument'
import { VOICE_RELEASE_MS } from './instrument'

interface ActiveVoice {
  stop: () => void
}

type AudioContextConstructor = new () => AudioContext
type CreateVoice = (
  midi: number,
  velocity: number,
  onEnded: () => void,
) => ActiveVoice

export function createNativePlaybackBackend(): PlaybackBackend {
  const AudioContextClass = getAudioContextConstructor()
  if (!AudioContextClass) {
    throw new Error('Web Audio is unavailable')
  }

  configureAudioSession('playback')
  const context = new AudioContextClass()
  const master = context.createGain()
  const limiter = context.createDynamicsCompressor()
  master.gain.value = 0.68
  limiter.threshold.value = -12
  limiter.knee.value = 8
  limiter.ratio.value = 12
  limiter.attack.value = 0.003
  limiter.release.value = 0.18
  master.connect(limiter)
  limiter.connect(context.destination)

  const guitar = createGuitarInstrument(context, master)
  const piano = createPianoInstrument(context, master)

  return {
    instruments: { guitar, piano },
    async unlock() {
      configureAudioSession('playback')
      if (context.state !== 'running') {
        await context.resume()
      }
    },
    dispose() {
      guitar.dispose()
      piano.dispose()
      master.disconnect()
      limiter.disconnect()
      void context.close()
      configureAudioSession('auto')
    },
  }
}

function createGuitarInstrument(
  context: AudioContext,
  output: AudioNode,
): InstrumentDriver {
  return createInstrumentDriver((midi, velocity, onEnded) => {
    const now = context.currentTime
    const stopAt = now + 1.45
    const frequency = midiToFrequency(midi)
    const amplitude = velocityToAmplitude(velocity)
    const body = context.createGain()
    const filter = context.createBiquadFilter()
    const fundamental = context.createOscillator()
    const overtone = context.createOscillator()
    const fundamentalGain = context.createGain()
    const overtoneGain = context.createGain()

    body.gain.setValueAtTime(0.0001, now)
    body.gain.exponentialRampToValueAtTime(0.42 * amplitude, now + 0.004)
    body.gain.exponentialRampToValueAtTime(0.16 * amplitude, now + 0.09)
    body.gain.exponentialRampToValueAtTime(0.0001, stopAt)

    filter.type = 'lowpass'
    filter.Q.value = 1.4
    filter.frequency.setValueAtTime(Math.min(6_500, frequency * 8), now)
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(520, frequency * 2.4),
      stopAt,
    )

    fundamental.type = 'triangle'
    fundamental.frequency.value = frequency
    fundamental.detune.value = -2
    fundamentalGain.gain.value = 0.78

    overtone.type = 'sine'
    overtone.frequency.value = frequency * 2.004
    overtone.detune.value = 3
    overtoneGain.gain.value = 0.22

    fundamental.connect(fundamentalGain)
    overtone.connect(overtoneGain)
    fundamentalGain.connect(filter)
    overtoneGain.connect(filter)
    filter.connect(body)
    body.connect(output)

    const voice = createActiveVoice(
      context,
      [fundamental, overtone],
      [fundamentalGain, overtoneGain, filter, body],
      body,
      stopAt,
      onEnded,
    )
    fundamental.start(now)
    overtone.start(now)
    fundamental.stop(stopAt + 0.04)
    overtone.stop(stopAt + 0.04)
    return voice
  })
}

function createPianoInstrument(
  context: AudioContext,
  output: AudioNode,
): InstrumentDriver {
  return createInstrumentDriver((midi, velocity, onEnded) => {
    const now = context.currentTime
    const stopAt = now + 2.65
    const frequency = midiToFrequency(midi)
    const amplitude = velocityToAmplitude(velocity)
    const body = context.createGain()
    const tone = context.createBiquadFilter()
    const oscillators: OscillatorNode[] = []
    const harmonicGains: GainNode[] = []
    const harmonicRatios = [1, 2.003, 3.009, 4.018]
    const harmonicLevels = [0.62, 0.2, 0.105, 0.045]

    body.gain.setValueAtTime(0.0001, now)
    body.gain.exponentialRampToValueAtTime(0.36 * amplitude, now + 0.006)
    body.gain.exponentialRampToValueAtTime(0.2 * amplitude, now + 0.1)
    body.gain.exponentialRampToValueAtTime(0.0001, stopAt)

    tone.type = 'lowpass'
    tone.Q.value = 0.7
    tone.frequency.value = Math.min(10_500, Math.max(2_800, frequency * 7))
    tone.connect(body)
    body.connect(output)

    harmonicRatios.forEach((ratio, index) => {
      const oscillator = context.createOscillator()
      const harmonicGain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency * ratio
      oscillator.detune.value = index % 2 === 0 ? -1.5 : 1.5
      harmonicGain.gain.value = harmonicLevels[index]
      oscillator.connect(harmonicGain)
      harmonicGain.connect(tone)
      oscillator.start(now)
      oscillator.stop(stopAt + 0.05)
      oscillators.push(oscillator)
      harmonicGains.push(harmonicGain)
    })

    return createActiveVoice(
      context,
      oscillators,
      [...harmonicGains, tone, body],
      body,
      stopAt,
      onEnded,
    )
  })
}

function createInstrumentDriver(createVoice: CreateVoice): InstrumentDriver {
  const voices = new Set<ActiveVoice>()
  const heldVoices = new Map<string, ActiveVoice>()

  const startVoice = (
    midi: number,
    velocity: number,
    voiceId?: string,
  ) => {
    if (!Number.isFinite(midi)) {
      return
    }

    const existingVoice = voiceId ? heldVoices.get(voiceId) : undefined
    existingVoice?.stop()

    let voice: ActiveVoice
    voice = createVoice(
      Math.round(midi),
      velocity,
      () => {
        voices.delete(voice)
        if (voiceId && heldVoices.get(voiceId) === voice) {
          heldVoices.delete(voiceId)
        }
      },
    )
    voices.add(voice)
    if (voiceId) {
      heldVoices.set(voiceId, voice)
    }
  }

  const stopAll = () => {
    heldVoices.clear()
    for (const voice of [...voices]) {
      voice.stop()
    }
  }

  return {
    trigger(midi) {
      startVoice(midi, 1)
    },
    noteOn(voiceId, midi, velocity = 1) {
      startVoice(midi, velocity, voiceId)
    },
    noteOff(voiceId) {
      const voice = heldVoices.get(voiceId)
      heldVoices.delete(voiceId)
      voice?.stop()
    },
    stopAll,
    dispose() {
      stopAll()
      voices.clear()
    },
  }
}

function createActiveVoice(
  context: AudioContext,
  sources: AudioScheduledSourceNode[],
  nodes: AudioNode[],
  envelope: GainNode,
  stopAt: number,
  onEnded: () => void,
): ActiveVoice {
  let stopped = false
  let cleaned = false

  const cleanup = () => {
    if (cleaned) {
      return
    }
    cleaned = true
    for (const node of nodes) {
      node.disconnect()
    }
    onEnded()
  }

  const voice: ActiveVoice = {
    stop() {
      if (stopped) {
        return
      }
      stopped = true
      const now = context.currentTime
      envelope.gain.cancelAndHoldAtTime(now)
      envelope.gain.exponentialRampToValueAtTime(
        0.0001,
        now + VOICE_RELEASE_MS / 1_000,
      )
      for (const source of sources) {
        try {
          source.stop(now + VOICE_RELEASE_MS / 1_000 + 0.04)
        } catch {
          // A source that has already ended needs no further cleanup.
        }
      }
      window.setTimeout(cleanup, VOICE_RELEASE_MS + 80)
    },
  }

  sources[0]?.addEventListener('ended', cleanup, { once: true })
  window.setTimeout(
    cleanup,
    Math.max(0, (stopAt - context.currentTime) * 1_000 + 120),
  )
  return voice
}

function velocityToAmplitude(velocity: number): number {
  return 0.45 + Math.min(1, Math.max(0, velocity)) * 0.55
}

function getAudioContextConstructor(): AudioContextConstructor | null {
  const compatibleWindow = window as Window & {
    webkitAudioContext?: AudioContextConstructor
  }
  return window.AudioContext ?? compatibleWindow.webkitAudioContext ?? null
}
