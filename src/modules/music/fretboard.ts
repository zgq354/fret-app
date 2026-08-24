import { midiToNote } from './musicTheory'

export interface GuitarString {
  stringNumber: number
  openMidi: number
  gaugeRank: number
}
export interface FretPosition {
  stringNumber: number
  fret: number
  midi: number
  noteLabel: string
}

export interface FretMarker {
  fret: number
  dotCount: 1 | 2
}

export const DEFAULT_FRET_COUNT = 20

export const STANDARD_TUNING: readonly GuitarString[] = [
  { stringNumber: 6, openMidi: 40, gaugeRank: 6 },
  { stringNumber: 5, openMidi: 45, gaugeRank: 5 },
  { stringNumber: 4, openMidi: 50, gaugeRank: 4 },
  { stringNumber: 3, openMidi: 55, gaugeRank: 3 },
  { stringNumber: 2, openMidi: 59, gaugeRank: 2 },
  { stringNumber: 1, openMidi: 64, gaugeRank: 1 },
]

export const STANDARD_MARKERS: readonly FretMarker[] = [
  { fret: 3, dotCount: 1 },
  { fret: 5, dotCount: 1 },
  { fret: 7, dotCount: 1 },
  { fret: 9, dotCount: 1 },
  { fret: 12, dotCount: 2 },
  { fret: 15, dotCount: 1 },
  { fret: 17, dotCount: 1 },
  { fret: 19, dotCount: 1 },
  { fret: 21, dotCount: 1 },
  { fret: 24, dotCount: 2 },
]

export function getFretPosition(
  stringNumber: number,
  fret: number,
  fretCount = DEFAULT_FRET_COUNT,
  tuning: readonly GuitarString[] = STANDARD_TUNING,
): FretPosition {
  const guitarString = tuning.find(
    (candidate) => candidate.stringNumber === stringNumber,
  )
  if (!guitarString) {
    throw new RangeError('Unknown guitar string')
  }
  if (!Number.isInteger(fret) || fret < 0 || fret > fretCount) {
    throw new RangeError('Fret must be within the visible fretboard')
  }

  const midi = guitarString.openMidi + fret
  return {
    stringNumber,
    fret,
    midi,
    noteLabel: midiToNote(midi).label,
  }
}

export function findFretPositions(
  midi: number,
  fretCount = DEFAULT_FRET_COUNT,
  tuning: readonly GuitarString[] = STANDARD_TUNING,
): FretPosition[] {
  const targetMidi = Math.round(midi)

  return tuning.flatMap((guitarString) => {
    const fret = targetMidi - guitarString.openMidi
    if (fret < 0 || fret > fretCount) {
      return []
    }

    return [
      {
        stringNumber: guitarString.stringNumber,
        fret,
        midi: targetMidi,
        noteLabel: midiToNote(targetMidi).label,
      },
    ]
  })
}

export function findPitchClassPositions(
  midi: number,
  fretCount = DEFAULT_FRET_COUNT,
  tuning: readonly GuitarString[] = STANDARD_TUNING,
): FretPosition[] {
  const targetMidi = Math.round(midi)
  const targetPitchClass = ((targetMidi % 12) + 12) % 12

  return tuning.flatMap((guitarString) => {
    const positions: FretPosition[] = []

    for (let fret = 0; fret <= fretCount; fret += 1) {
      const positionMidi = guitarString.openMidi + fret
      const pitchClass = ((positionMidi % 12) + 12) % 12

      if (pitchClass === targetPitchClass && positionMidi !== targetMidi) {
        positions.push({
          stringNumber: guitarString.stringNumber,
          fret,
          midi: positionMidi,
          noteLabel: midiToNote(positionMidi).label,
        })
      }
    }

    return positions
  })
}

export function fretLineRatio(
  fret: number,
  fretCount = DEFAULT_FRET_COUNT,
): number {
  if (fret <= 0) {
    return 0
  }

  if (fret >= fretCount) {
    return 1
  }

  const distance = 1 - 2 ** (-fret / 12)
  const visibleDistance = 1 - 2 ** (-fretCount / 12)

  return distance / visibleDistance
}

export function fretCenterRatio(
  fret: number,
  fretCount = DEFAULT_FRET_COUNT,
): number {
  if (fret <= 0) {
    return 0
  }

  return (
    (fretLineRatio(fret - 1, fretCount) +
      fretLineRatio(fret, fretCount)) /
    2
  )
}
