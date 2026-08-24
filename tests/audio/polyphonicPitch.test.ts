import { describe, expect, it } from 'vitest'
import {
  selectSimultaneousNotes,
  type TimedPitchEvent,
} from '../../src/audio/polyphonicPitch'

function note(
  pitchMidi: number,
  startTimeSeconds: number,
  durationSeconds: number,
  amplitude = 0.8,
): TimedPitchEvent {
  return {
    pitchMidi,
    startTimeSeconds,
    durationSeconds,
    amplitude,
  }
}

describe('polyphonic pitch snapshots', () => {
  it('keeps a strummed chord that overlaps near the end of the window', () => {
    const notes = selectSimultaneousNotes(
      [
        note(48, 1.12, 0.72),
        note(52, 1.18, 0.66),
        note(55, 1.24, 0.58),
      ],
      { analysisDurationSeconds: 2 },
    )

    expect(notes.map((value) => value.midi)).toEqual([48, 52, 55])
  })

  it('does not collapse adjacent melody notes into a chord', () => {
    const notes = selectSimultaneousNotes(
      [
        note(60, 1.12, 0.22),
        note(62, 1.38, 0.22),
        note(64, 1.64, 0.22),
      ],
      { analysisDurationSeconds: 2 },
    )

    expect(notes).toHaveLength(1)
    expect(notes[0]?.midi).toBe(64)
  })

  it('deduplicates repeated events and applies the supported range', () => {
    const notes = selectSimultaneousNotes(
      [
        note(30, 1.2, 0.7),
        note(60, 1.2, 0.6, 0.6),
        note(60, 1.3, 0.5, 0.5),
        note(64, 1.2, 0.8, 0.8),
        note(101, 1.2, 0.9),
      ],
      { analysisDurationSeconds: 2, minMidi: 36, maxMidi: 96 },
    )

    expect(notes).toEqual([
      { midi: 60, activation: 0.6 },
      { midi: 64, activation: 0.8 },
    ])
  })

  it('drops low-activation model artifacts from a stronger chord', () => {
    const notes = selectSimultaneousNotes(
      [
        note(60, 1.2, 0.7, 0.72),
        note(64, 1.2, 0.7, 0.8),
        note(67, 1.2, 0.7, 0.75),
        note(86, 1.2, 0.7, 0.32),
      ],
      { analysisDurationSeconds: 2 },
    )

    expect(notes.map((value) => value.midi)).toEqual([60, 64, 67])
  })

  it('keeps the six strongest guitar voices at a permissive threshold', () => {
    const notes = selectSimultaneousNotes(
      [
        note(40, 1.2, 0.7, 0.72),
        note(47, 1.2, 0.7, 0.61),
        note(52, 1.2, 0.7, 0.34),
        note(56, 1.2, 0.7, 0.46),
        note(59, 1.2, 0.7, 0.48),
        note(64, 1.2, 0.7, 0.68),
        note(71, 1.2, 0.7, 0.32),
      ],
      { analysisDurationSeconds: 2 },
    )

    expect(notes.map((value) => value.midi)).toEqual([
      40, 47, 52, 56, 59, 64,
    ])
  })

  it('cuts a low-activation artifact cluster after three strong notes', () => {
    const notes = selectSimultaneousNotes(
      [
        note(48, 1.2, 0.7, 0.37),
        note(60, 1.2, 0.7, 0.69),
        note(64, 1.2, 0.7, 0.78),
        note(67, 1.2, 0.7, 0.77),
        note(86, 1.2, 0.7, 0.37),
      ],
      { analysisDurationSeconds: 2 },
    )

    expect(notes.map((value) => value.midi)).toEqual([60, 64, 67])
  })
})
