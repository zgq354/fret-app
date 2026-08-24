import { midiToNote, type NoteInfo } from '../../../music/musicTheory'

export type StaffNotationMode = 'guitar' | 'concert'

export interface StaffNote {
  soundingNote: NoteInfo
  writtenNote: NoteInfo
  step: number
  y: number
}

const STAFF_BOTTOM = 220
const LINE_GAP = 20
const DIATONIC_E4 = 4 * 7 + 2
const LETTER_INDEX: Record<string, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
}

export function createStaffNotes(
  midis: readonly number[],
  mode: StaffNotationMode,
): StaffNote[] {
  return uniqueMidis(midis)
    .map((soundingMidi) => {
      const soundingNote = midiToNote(soundingMidi)
      const writtenNote = midiToNote(
        soundingNote.midi + (mode === 'guitar' ? 12 : 0),
      )
      const step =
        writtenNote.octave * 7 +
        LETTER_INDEX[writtenNote.name.charAt(0)] -
        DIATONIC_E4

      return {
        soundingNote,
        writtenNote,
        step,
        y: STAFF_BOTTOM - step * (LINE_GAP / 2),
      }
    })
    .sort((left, right) => left.step - right.step)
}

function uniqueMidis(midis: readonly number[]): number[] {
  return [...new Set(midis.map((midi) => Math.round(midi)))]
}
