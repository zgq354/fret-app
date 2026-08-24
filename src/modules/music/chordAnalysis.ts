import { detect } from '@tonaljs/chord-detect'
import { midiToNote } from './musicTheory'

export interface ChordReading {
  capturedAt: number
  midis: readonly number[]
  focusMidi: number
  chordLabel: string | null
  chordCandidates: readonly string[]
  confidence: number
}

interface ChordReadingInput {
  capturedAt: number
  notes: readonly {
    midi: number
    activation: number
  }[]
}

export function createChordReading(
  frame: ChordReadingInput,
): ChordReading | null {
  if (frame.notes.length === 0) {
    return null
  }

  const notes = [...frame.notes].sort((left, right) => left.midi - right.midi)
  const names = notes.map((value) =>
    midiToNote(value.midi).name.replace('♯', '#'),
  )
  const chordCandidates = detect(names).slice(0, 2).map(formatChordName)

  return {
    capturedAt: frame.capturedAt,
    midis: notes.map((value) => value.midi),
    focusMidi: notes[0].midi,
    chordLabel: chordCandidates[0] ?? null,
    chordCandidates,
    confidence: averageActivation(notes),
  }
}

function averageActivation(
  notes: readonly { activation: number }[],
): number {
  const total = notes.reduce((sum, note) => sum + note.activation, 0)
  return Math.min(1, Math.max(0, total / notes.length))
}

function formatChordName(value: string): string {
  return value
    .replace(/^([A-G](?:#|b)?)M(?=$|\/)/, '$1')
    .replaceAll('#', '♯')
    .replaceAll('b', '♭')
}
