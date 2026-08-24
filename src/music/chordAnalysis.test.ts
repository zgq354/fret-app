import { describe, expect, it } from 'vitest'
import { createChordReading } from './chordAnalysis'

describe('chord analysis', () => {
  it('uses Tonal to name a recognized pitch set', () => {
    const reading = createChordReading({
      capturedAt: 42,
      notes: [
        { midi: 60, activation: 0.85 },
        { midi: 64, activation: 0.8 },
        { midi: 67, activation: 0.75 },
      ],
    })

    expect(reading).toMatchObject({
      capturedAt: 42,
      midis: [60, 64, 67],
      focusMidi: 60,
      chordLabel: 'C',
    })
    expect(reading?.confidence).toBeCloseTo(0.8)
  })

  it('keeps octave information in the note set but not chord detection', () => {
    const reading = createChordReading({
      capturedAt: 42,
      notes: [
        { midi: 48, activation: 0.7 },
        { midi: 60, activation: 0.8 },
        { midi: 64, activation: 0.8 },
        { midi: 67, activation: 0.8 },
      ],
    })

    expect(reading?.midis).toEqual([48, 60, 64, 67])
    expect(reading?.chordLabel).toBe('C')
  })

  it('returns a note set even when no chord label is trustworthy', () => {
    const reading = createChordReading({
      capturedAt: 42,
      notes: [
        { midi: 60, activation: 0.8 },
        { midi: 61, activation: 0.7 },
      ],
    })

    expect(reading?.midis).toEqual([60, 61])
    expect(reading?.chordLabel).toBeNull()
  })

  it('returns no reading for silence', () => {
    expect(createChordReading({ capturedAt: 42, notes: [] })).toBeNull()
  })
})
