import { describe, expect, it } from 'vitest'
import { MiddleCStyle } from '../../src/modules/music/musicTheory'
import { resolveLearningSurfaceDisplay } from '../../src/modules/learning-surface/model/learning-surface-display'

const baseInput = {
  learningMode: 'listen' as const,
  listenAnalysisMode: 'single' as const,
  demoMidi: 64,
  microphoneStatus: 'idle' as const,
  singlePitchReading: null,
  polyphonicReading: null,
  polyphonicModelState: 'ready' as const,
  polyphonicAnalysisState: 'idle' as const,
  stickyPitch: false,
  latestDetectedReading: null,
  latestDetectedChord: null,
  playFocusNote: null,
  playDisplayNotes: [],
  playDisplayMidis: [],
  playSoundingMidis: [],
  playIsRecent: false,
  middleCStyle: MiddleCStyle.Scientific,
}

describe('resolveLearningSurfaceDisplay', () => {
  it('projects one live chord across every listening surface', () => {
    const chord = {
      capturedAt: 1,
      midis: [60, 64, 67],
      focusMidi: 60,
      chordLabel: 'C',
      chordCandidates: ['C'],
      confidence: 0.9,
    }
    const display = resolveLearningSurfaceDisplay({
      ...baseInput,
      listenAnalysisMode: 'polyphonic',
      microphoneStatus: 'listening',
      polyphonicReading: chord,
      polyphonicAnalysisState: 'result',
    })

    expect(display.visibleChordReading).toBe(chord)
    expect(display.activeMidi).toBe(60)
    expect(display.displayMidis).toEqual([60, 64, 67])
    expect(display.soundingMidis).toEqual([60, 64, 67])
    expect(display.sourceLabel).toBe('实时麦克风 · 候选 C · 3 音')
    expect(display.polyphonicFeedback.appearance).toBe('result')
  })

  it('keeps played and sounding notes distinct in play mode', () => {
    const fretboardNote = {
      instrumentId: 'guitar' as const,
      source: 'fretboard' as const,
      stringNumber: 2,
      fret: 5,
      midi: 64,
    }
    const display = resolveLearningSurfaceDisplay({
      ...baseInput,
      learningMode: 'play',
      playFocusNote: fretboardNote,
      playDisplayNotes: [fretboardNote],
      playDisplayMidis: [64, 67],
      playSoundingMidis: [67],
      playIsRecent: true,
    })

    expect(display.activeMidi).toBe(64)
    expect(display.displayMidis).toEqual([64, 67])
    expect(display.soundingMidis).toEqual([67])
    expect(display.playedPositions).toEqual([
      {
        stringNumber: 2,
        fret: 5,
        midi: 64,
        noteLabel: 'E4',
      },
    ])
    expect(display.noteSummary).toBe('E4 · G4')
  })
})
