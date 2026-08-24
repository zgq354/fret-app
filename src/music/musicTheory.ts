export const NOTE_NAMES = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
] as const

export const MiddleCStyle = {
  Scientific: 'c4',
  Yamaha: 'c3',
  FLStudio: 'c5',
} as const

export type MiddleCStyle =
  (typeof MiddleCStyle)[keyof typeof MiddleCStyle]

export const DefaultMiddleCStyle: MiddleCStyle = MiddleCStyle.Scientific

export interface NoteInfo {
  midi: number
  pitchClass: number
  name: (typeof NOTE_NAMES)[number]
  octave: number
  label: string
}
export interface PitchReading extends NoteInfo {
  frequency: number
  exactMidi: number
  cents: number
  confidence: number
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

export function frequencyToMidi(frequency: number): number {
  if (!Number.isFinite(frequency) || frequency <= 0) {
    throw new RangeError('Frequency must be a positive finite number')
  }

  return 69 + 12 * Math.log2(frequency / 440)
}

export function midiToNote(midi: number): NoteInfo {
  const roundedMidi = Math.round(midi)
  const pitchClass = ((roundedMidi % 12) + 12) % 12
  const name = NOTE_NAMES[pitchClass]
  const octave = Math.floor(roundedMidi / 12) - 1

  return {
    midi: roundedMidi,
    pitchClass,
    name,
    octave,
    label: name + octave,
  }
}

export function formatNoteLabel(
  note: Pick<NoteInfo, 'name' | 'octave'>,
  middleCStyle: MiddleCStyle = DefaultMiddleCStyle,
): string {
  return note.name + formatNoteOctave(note.octave, middleCStyle)
}

export function formatNoteOctave(
  scientificOctave: number,
  middleCStyle: MiddleCStyle = DefaultMiddleCStyle,
): number {
  if (middleCStyle === MiddleCStyle.Yamaha) {
    return scientificOctave - 1
  }
  if (middleCStyle === MiddleCStyle.FLStudio) {
    return scientificOctave + 1
  }

  return scientificOctave
}

export function createPitchReading(
  frequency: number,
  confidence = 1,
): PitchReading {
  const exactMidi = frequencyToMidi(frequency)
  const note = midiToNote(exactMidi)

  return {
    ...note,
    frequency,
    exactMidi,
    cents: (exactMidi - note.midi) * 100,
    confidence: Math.min(1, Math.max(0, confidence)),
  }
}

export function formatCents(cents: number): string {
  const rounded = Math.round(cents)
  if (rounded > 0) {
    return '+' + rounded
  }

  return String(rounded)
}

export function formatFrequency(frequency: number): string {
  return frequency.toFixed(2) + ' Hz'
}
