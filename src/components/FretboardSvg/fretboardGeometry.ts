import {
  DEFAULT_FRET_COUNT,
  fretCenterRatio,
  fretLineRatio,
  STANDARD_TUNING,
} from '../../music/fretboard'

export const FRETBOARD_WIDTH = 1_280
export const FRETBOARD_HEIGHT = 238
export const NUT_X = 112
export const OPEN_NOTE_X = 72
export const BOARD_END_X = 1_248
export const BOARD_TOP = 42
export const BOARD_BOTTOM = 203
export const FRET_COUNT = DEFAULT_FRET_COUNT
export const DISPLAY_STRINGS = [...STANDARD_TUNING].reverse()

export function stringY(index: number): number {
  const gap =
    (BOARD_BOTTOM - BOARD_TOP - 38) / (DISPLAY_STRINGS.length - 1)
  return BOARD_TOP + 19 + index * gap
}

export function fretLineX(fret: number): number {
  return (
    NUT_X +
    fretLineRatio(fret, FRET_COUNT) * (BOARD_END_X - NUT_X)
  )
}

export function positionX(fret: number): number {
  if (fret === 0) {
    return OPEN_NOTE_X
  }

  return (
    NUT_X +
    fretCenterRatio(fret, FRET_COUNT) * (BOARD_END_X - NUT_X)
  )
}

export function fretHitStartX(fret: number): number {
  if (fret === 0) {
    return OPEN_NOTE_X - 24
  }
  return fret === 1 ? NUT_X : fretLineX(fret - 1)
}

export function fretHitEndX(fret: number): number {
  return fret === 0 ? NUT_X - 3 : fretLineX(fret)
}
