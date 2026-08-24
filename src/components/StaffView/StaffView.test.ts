import { describe, expect, it } from 'vitest'
import { createStaffNotes } from './staffNotes'

describe('createStaffNotes', () => {
  it('sorts a chord by staff position and removes duplicate pitches', () => {
    const notes = createStaffNotes([67, 60, 64, 60], 'concert')

    expect(notes.map((note) => note.soundingNote.label)).toEqual([
      'C4',
      'E4',
      'G4',
    ])
  })

  it('writes guitar notes one octave above sounding pitch', () => {
    const [note] = createStaffNotes([64], 'guitar')

    expect(note.soundingNote.label).toBe('E4')
    expect(note.writtenNote.label).toBe('E5')
  })
})
