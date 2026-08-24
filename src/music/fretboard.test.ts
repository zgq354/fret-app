import { describe, expect, it } from 'vitest'
import {
  findFretPositions,
  findPitchClassPositions,
  fretLineRatio,
  getFretPosition,
} from './fretboard'

describe('fretboard model', () => {
  it('finds every E4 position on the default 20-fret guitar', () => {
    expect(
      findFretPositions(64).map(({ stringNumber, fret }) => [
        stringNumber,
        fret,
      ]),
    ).toEqual([
      [5, 19],
      [4, 14],
      [3, 9],
      [2, 5],
      [1, 0],
    ])
  })

  it('keeps octave-equivalent positions separate from exact pitch', () => {
    const related = findPitchClassPositions(64)

    expect(related).toContainEqual(
      expect.objectContaining({ stringNumber: 6, fret: 0, midi: 40 }),
    )
    expect(related).not.toContainEqual(
      expect.objectContaining({ stringNumber: 2, fret: 5, midi: 64 }),
    )
  })

  it('uses physical fret spacing instead of equal cells', () => {
    expect(fretLineRatio(12, 20)).toBeCloseTo(
      0.5 / (1 - 2 ** (-20 / 12)),
      8,
    )
    expect(fretLineRatio(1, 20) - fretLineRatio(0, 20)).toBeGreaterThan(
      fretLineRatio(20, 20) - fretLineRatio(19, 20),
    )
  })

  it.each([
    [6, 0, 40],
    [6, 1, 41],
    [5, 12, 57],
    [2, 5, 64],
    [1, 20, 84],
  ])('maps string %i fret %i to MIDI %i', (stringNumber, fret, midi) => {
    expect(getFretPosition(stringNumber, fret).midi).toBe(midi)
  })

  it('rejects positions outside the visible fretboard', () => {
    expect(() => getFretPosition(7, 0)).toThrow(RangeError)
    expect(() => getFretPosition(1, 21)).toThrow(RangeError)
  })
})
