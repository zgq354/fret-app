import { describe, expect, it } from 'vitest'
import {
  createPitchReading,
  formatNoteLabel,
  formatNoteOctave,
  formatFrequency,
  frequencyToMidi,
  MiddleCStyle,
  midiToFrequency,
  midiToNote,
} from '../../src/music/musicTheory'

describe('music theory conversions', () => {
  it('uses A4 = 440 Hz as the tuning reference', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 8)
    expect(frequencyToMidi(440)).toBeCloseTo(69, 8)
  })

  it('maps MIDI notes to pitch class and octave', () => {
    expect(midiToNote(40)).toMatchObject({
      name: 'E',
      octave: 2,
      label: 'E2',
    })
    expect(midiToNote(64)).toMatchObject({
      name: 'E',
      octave: 4,
      label: 'E4',
    })
  })

  it('reports cents relative to the closest semitone', () => {
    const reading = createPitchReading(440 * 2 ** (17 / 1200))

    expect(reading.label).toBe('A4')
    expect(reading.cents).toBeCloseTo(17, 6)
  })

  it('formats a pitch frequency with two decimal places', () => {
    expect(formatFrequency(midiToFrequency(60))).toBe('261.63 Hz')
  })

  it('changes only the octave label for the selected middle C style', () => {
    const middleC = midiToNote(60)

    expect(formatNoteLabel(middleC, MiddleCStyle.Scientific)).toBe('C4')
    expect(formatNoteLabel(middleC, MiddleCStyle.Yamaha)).toBe('C3')
    expect(formatNoteLabel(middleC, MiddleCStyle.FLStudio)).toBe('C5')
    expect(formatNoteOctave(middleC.octave, MiddleCStyle.Yamaha)).toBe(3)
    expect(formatNoteOctave(middleC.octave, MiddleCStyle.FLStudio)).toBe(5)
    expect(middleC.midi).toBe(60)
  })
})
