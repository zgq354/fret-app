import { describe, expect, it } from 'vitest'
import {
  createPitchReading,
  MiddleCStyle,
} from '../../src/modules/music/musicTheory'
import { canPromptPlayMode, resolveLearningDisplay } from '../../src/modules/learning-surface/model/play-mode'

const baseInput = {
  mode: 'listen' as const,
  demoMidi: 64,
  pitchStatus: 'idle' as const,
  pitchReading: null,
  stickyPitch: false,
  latestDetectedReading: null,
  lastPlayedNote: null,
  middleCStyle: MiddleCStyle.Scientific,
}

describe('canPromptPlayMode', () => {
  it.each([
    ['idle', true],
    ['listening', true],
    ['denied', true],
    ['unsupported', true],
    ['error', true],
    ['requesting', false],
  ] as const)(
    'allows prompting for microphone status %s: %s',
    (microphoneStatus, expected) => {
      expect(canPromptPlayMode('listen', microphoneStatus)).toBe(expected)
    },
  )

  it('does not prompt after play mode is active', () => {
    expect(canPromptPlayMode('play', 'listening')).toBe(false)
  })
})

describe('resolveLearningDisplay', () => {
  it('uses the demo note while the microphone is idle', () => {
    const display = resolveLearningDisplay(baseInput)

    expect(display.midi).toBe(64)
    expect(display.sourceLabel).toContain('演示音')
  })

  it('uses a live microphone reading while listening', () => {
    const pitchReading = createPitchReading(440, 0.91)
    const display = resolveLearningDisplay({
      ...baseInput,
      pitchStatus: 'listening',
      pitchReading,
    })

    expect(display.reading).toBe(pitchReading)
    expect(display.midi).toBe(69)
    expect(display.sourceLabel).toContain('91%')
  })

  it('keeps the latest microphone reading only in sticky mode', () => {
    const latestDetectedReading = createPitchReading(329.63)
    const sticky = resolveLearningDisplay({
      ...baseInput,
      pitchStatus: 'listening',
      stickyPitch: true,
      latestDetectedReading,
    })
    const transient = resolveLearningDisplay({
      ...baseInput,
      pitchStatus: 'listening',
      latestDetectedReading,
    })

    expect(sticky.reading).toBe(latestDetectedReading)
    expect(sticky.sourceLabel).toContain('粘滞')
    expect(transient.reading).toBeNull()
  })

  it('uses the latest played guitar position in play mode', () => {
    const display = resolveLearningDisplay({
      ...baseInput,
      mode: 'play',
      lastPlayedNote: {
        instrumentId: 'guitar',
        source: 'fretboard',
        stringNumber: 2,
        fret: 5,
        midi: 64,
      },
    })

    expect(display.midi).toBe(64)
    expect(display.sourceLabel).toBe('吉他 · 2 弦 5 品')
  })

  it('identifies MIDI input without coupling the label to its instrument', () => {
    const display = resolveLearningDisplay({
      ...baseInput,
      mode: 'play',
      lastPlayedNote: {
        instrumentId: 'piano',
        source: 'midi',
        inputId: 'keyboard-1',
        inputName: 'Studio Keyboard',
        midi: 60,
      },
    })

    expect(display.midi).toBe(60)
    expect(display.sourceLabel).toBe('MIDI · Studio Keyboard · C4')
  })

  it('uses the selected middle C style in played source labels', () => {
    const display = resolveLearningDisplay({
      ...baseInput,
      mode: 'play',
      middleCStyle: MiddleCStyle.Yamaha,
      lastPlayedNote: {
        instrumentId: 'piano',
        source: 'piano',
        midi: 60,
      },
    })

    expect(display.sourceLabel).toBe('钢琴 · C3')
    expect(display.reading?.frequency).toBeCloseTo(261.63, 2)
  })

  it('waits for a surface event when play mode has no note', () => {
    const display = resolveLearningDisplay({
      ...baseInput,
      mode: 'play',
    })

    expect(display.reading).toBeNull()
    expect(display.sourceLabel).toContain('指板、琴键或 MIDI')
  })
})
